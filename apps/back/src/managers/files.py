# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""File-handling business logic: validation, image processing, key generation.

Sits between feature managers and the storage backend (`services/files.py`).
Feature managers instantiate it themselves (`FileManager()`), like the reference
project — it is not a FastAPI dependency.

Unlike the reference, `save_image` can crop+resize to a square server-side
(`square_size=`), used for avatars so the stored blob is always normalised even
if the client sends a raw image.
"""

import uuid
from dataclasses import dataclass
from io import BytesIO

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

from src.services.files import FileStorageInternalService, get_file_storage

_ALLOWED_IMAGE_EXTENSIONS = frozenset({"jpg", "jpeg", "png", "webp", "gif"})
_ALLOWED_IMAGE_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp", "image/gif"})
_MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MiB
_MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MiB — generic attachments (screenshots, videos, docs)


@dataclass(frozen=True)
class StoredUpload:
    """Metadata of a generic file persisted through `FileManager.save_upload`."""

    key: str
    file_name: str
    file_size: int
    file_extension: str


class FileManager:
    def __init__(self, storage: FileStorageInternalService | None = None):
        self._storage = storage or get_file_storage()

    @staticmethod
    def _extension(filename: str | None) -> str:
        if not filename or "." not in filename:
            return ""
        return filename.rsplit(".", 1)[-1].lower()

    @staticmethod
    def _square_webp(data: bytes, size: int) -> bytes:
        """Center-crop to a square and resize to `size`×`size`, re-encoded to WebP."""
        try:
            image = Image.open(BytesIO(data))
            image = ImageOps.exif_transpose(image)  # honor camera orientation
            image = image.convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError) as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This image could not be processed.") from error

        width, height = image.size
        side = min(width, height)
        left = (width - side) // 2
        top = (height - side) // 2
        image = image.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS)

        output = BytesIO()
        image.save(output, format="WEBP", quality=85, method=6)
        return output.getvalue()

    def save_image(self, file: UploadFile, *, prefix: str, square_size: int | None = None) -> str:
        """Validate and store an uploaded image; return its storage key.

        With `square_size`, the image is center-cropped to a square, resized and
        re-encoded to WebP before storing.
        """
        extension = self._extension(file.filename)
        content_type = (file.content_type or "").lower()
        if extension not in _ALLOWED_IMAGE_EXTENSIONS or content_type not in _ALLOWED_IMAGE_CONTENT_TYPES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported image format. Use JPEG, PNG, WebP or GIF.")

        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > _MAX_IMAGE_BYTES:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "This image is too large (max 5 MB).")

        data = file.file.read()
        if square_size is not None:
            data = self._square_webp(data, square_size)
            extension = "webp"
            content_type = "image/webp"

        key = f"{prefix.strip('/')}/{uuid.uuid4().hex}.{extension}"
        self._storage.save(data, key, content_type=content_type)
        return key

    def save_upload(self, file: UploadFile, *, prefix: str) -> StoredUpload:
        """Validate and store an arbitrary uploaded file (no processing).

        Returns the storage key alongside the metadata the caller persists on
        its row (original name, byte size, lower-cased extension).
        """
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size == 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "The uploaded file is empty.")
        if size > _MAX_UPLOAD_BYTES:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "This file is too large (max 50 MB).")

        file_name = file.filename or "file"
        extension = self._extension(file_name)
        key = f"{prefix.strip('/')}/{uuid.uuid4().hex}{('.' + extension) if extension else ''}"
        self._storage.save(file.file.read(), key, content_type=file.content_type)
        return StoredUpload(key=key, file_name=file_name, file_size=size, file_extension=extension)

    def delete(self, key: str | None) -> None:
        if key:
            self._storage.delete(key)

    def public_url_for(self, value: str | None) -> str | None:
        if not value:
            return None
        return self._storage.url_for(value)

    def download_url_for(self, key: str | None, *, expires_in: int = 300) -> str | None:
        """Time-limited download URL (pre-signed on S3, plain path locally)."""
        if not key:
            return None
        return self._storage.signed_url_for(key, expires_in=expires_in)
