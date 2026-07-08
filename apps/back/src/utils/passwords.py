"""Argon2id password hashing helpers, shared across managers."""

from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error, VerifyMismatchError

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(hashed: str | None, password: str) -> bool:
    if not hashed:
        return False
    try:
        return _hasher.verify(hashed, password)
    except (VerifyMismatchError, Argon2Error):
        return False
