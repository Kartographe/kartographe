# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""File storage backends: local disk or S3-compatible object storage.

Selected by `STORAGE_BACKEND`. Callers store an opaque **key** (returned by the
`FileManager`) on their model and turn it into a fetchable URL with `url_for`.
Nothing in this layer reads bytes back out — delivery is URL-only (a static
mount in local mode, a public object URL in s3 mode).
"""

from abc import ABC, abstractmethod
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import boto3

from src.settings import get_settings


class FileStorageInternalService(ABC):
    @abstractmethod
    def save(self, data: bytes, key: str, *, content_type: str | None = None) -> None:
        """Persist `data` under `key` (overwrites)."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Remove `key` if it exists (idempotent)."""

    @abstractmethod
    def url_for(self, key: str) -> str:
        """Absolute, publicly-fetchable URL for `key`. Passes through full URLs."""

    def signed_url_for(self, key: str, *, expires_in: int = 300) -> str:
        """Time-limited download URL for `key`.

        Backends that support pre-signing (S3) override this to mint a URL that
        expires after `expires_in` seconds. The default falls back to the plain
        public URL — correct for the local disk backend, which has no signing.
        """
        return self.url_for(key)


class LocalFileStorage(FileStorageInternalService):
    def __init__(self, root: Path, public_url_base: str, base_url: str):
        self._root = root
        self._public_url_base = "/" + public_url_base.strip("/")
        self._base_url = base_url.rstrip("/")

    def _path_for(self, key: str) -> Path:
        return self._root / key.lstrip("/")

    def save(self, data: bytes, key: str, *, content_type: str | None = None) -> None:
        path = self._path_for(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def delete(self, key: str) -> None:
        self._path_for(key).unlink(missing_ok=True)

    def url_for(self, key: str) -> str:
        if key.startswith(("http://", "https://")):
            return key
        return f"{self._base_url}{self._public_url_base}/{key.lstrip('/')}"


class S3FileStorage(FileStorageInternalService):
    def __init__(
        self,
        *,
        bucket: str,
        region: str | None,
        access_key: str | None,
        secret_key: str | None,
        endpoint_url: str | None,
        public_url_base: str | None,
    ):
        self._bucket = bucket
        self._region = region
        self._endpoint_url = endpoint_url
        self._public_url_base = public_url_base.rstrip("/") if public_url_base else None
        self._client = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

    def save(self, data: bytes, key: str, *, content_type: str | None = None) -> None:
        extra: dict[str, str] = {"ACL": "public-read"}
        if content_type:
            extra["ContentType"] = content_type
        self._client.upload_fileobj(BytesIO(data), self._bucket, key.lstrip("/"), ExtraArgs=extra)

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key.lstrip("/"))

    def url_for(self, key: str) -> str:
        if key.startswith(("http://", "https://")):
            return key
        stripped = key.lstrip("/")
        if self._public_url_base:
            return f"{self._public_url_base}/{stripped}"
        if self._endpoint_url:
            return f"{self._endpoint_url.rstrip('/')}/{self._bucket}/{stripped}"
        return f"https://{self._bucket}.s3.{self._region}.amazonaws.com/{stripped}"

    def signed_url_for(self, key: str, *, expires_in: int = 300) -> str:
        if key.startswith(("http://", "https://")):
            return key
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key.lstrip("/")},
            ExpiresIn=expires_in,
        )


@lru_cache
def get_file_storage() -> FileStorageInternalService:
    settings = get_settings()
    if settings.storage_backend == "s3":
        if not settings.storage_s3_bucket:
            raise RuntimeError("STORAGE_BACKEND=s3 requires STORAGE_S3_BUCKET to be set.")
        return S3FileStorage(
            bucket=settings.storage_s3_bucket,
            region=settings.storage_s3_region,
            access_key=settings.storage_s3_access_key,
            secret_key=settings.storage_s3_secret_key,
            endpoint_url=settings.storage_s3_endpoint_url,
            public_url_base=settings.storage_s3_public_url_base,
        )
    # Local: <repo>/apps/back/<storage_local_root>
    root = Path(__file__).resolve().parent.parent.parent / settings.storage_local_root
    return LocalFileStorage(
        root=root,
        public_url_base=settings.storage_public_url_base,
        base_url=settings.api_base_url,
    )
