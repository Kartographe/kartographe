"""Email backends and the front-facing `EmailService`."""

import logging
import smtplib
from email.message import EmailMessage
from typing import Protocol

from src.services.email.templates import RenderedEmail
from src.settings import get_settings

logger = logging.getLogger("kartographe.email")


class EmailBackend(Protocol):
    def send(self, *, to: str, email: RenderedEmail) -> None: ...


class NullEmailBackend:
    """No email provider configured — log at debug and drop the message."""

    def send(self, *, to: str, email: RenderedEmail) -> None:
        logger.debug("[email disabled] to=%s | subject=%s", to, email.subject)


class SmtpEmailBackend:
    def send(self, *, to: str, email: RenderedEmail) -> None:
        settings = get_settings()
        message = EmailMessage()
        message["From"] = f"{settings.email_emitter_name} <{settings.email_emitter_address}>"
        message["To"] = to
        message["Subject"] = email.subject
        message.set_content(email.text)
        message.add_alternative(email.html, subtype="html")

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password or "")
            server.send_message(message)


_BACKENDS: dict[str, type[EmailBackend]] = {
    "smtp": SmtpEmailBackend,
}


def _build_backend() -> EmailBackend:
    email_type = (get_settings().service_email_type or "").strip().lower()
    backend_cls = _BACKENDS.get(email_type)
    return backend_cls() if backend_cls else NullEmailBackend()


class EmailService:
    """Sends a `RenderedEmail` through the backend selected by settings."""

    def __init__(self):
        self._backend = _build_backend()

    def send(self, *, to: str, email: RenderedEmail) -> None:
        self._backend.send(to=to, email=email)
