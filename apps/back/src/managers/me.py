"""Current-user profile logic."""

from fastapi import UploadFile
from sqlmodel import Session, func, select

from src.managers.files import FileManager
from src.models.enum import UserAuthenticationTwoFactorStatus, UserAuthenticationTwoFactorType
from src.models.user import User
from src.models.user_authentication_two_factor import UserAuthenticationTwoFactor
from src.serializes.me import MeItem

# Avatars are normalised to a square of this side (px) before storage.
_PROFILE_PICTURE_SIZE = 512


class MeManager:
    # Profile fields the user may patch directly.
    _EDITABLE = ("first_name", "last_name", "gender", "language", "theme", "phone")

    def __init__(self, session: Session):
        self.session = session
        self._files = FileManager()

    def _two_factor_enabled(self, user: User) -> bool:
        count = self.session.exec(
            select(func.count()).select_from(UserAuthenticationTwoFactor).where(
                UserAuthenticationTwoFactor.user_id == user.id,
                UserAuthenticationTwoFactor.status == UserAuthenticationTwoFactorStatus.ACTIVE,
                UserAuthenticationTwoFactor.type.in_(
                    [UserAuthenticationTwoFactorType.OTP, UserAuthenticationTwoFactorType.U2F]
                ),
                UserAuthenticationTwoFactor.enabled.is_(True),
            )
        ).one()
        return count > 0

    def to_item(self, user: User) -> MeItem:
        return MeItem(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            gender=user.gender,
            language=user.language,
            theme=user.theme,
            phone=user.phone,
            picture_profile=self._files.public_url_for(user.picture_profile),
            registered_at=user.created_date,
            two_factor_enabled=self._two_factor_enabled(user),
        )

    def update(self, user: User, fields: dict) -> User:
        for key in self._EDITABLE:
            if key in fields:
                setattr(user, key, fields[key])
        self.session.add(user)
        return user

    def set_profile_picture(self, user: User, file: UploadFile) -> User:
        """Store a square-cropped avatar and replace the previous one."""
        previous_key = user.picture_profile
        key = self._files.save_image(file, prefix=f"users/{user.id}/profile", square_size=_PROFILE_PICTURE_SIZE)
        user.picture_profile = key
        self.session.add(user)
        if previous_key and previous_key != key:
            self._files.delete(previous_key)
        return user
