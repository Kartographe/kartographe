"""Email template rendering.

Each transactional email has an HTML template under `templates/` with
`${placeholder}` slots filled via `string.Template.safe_substitute` (safe next
to CSS braces, unlike `str.format`). A plain-text fallback is built alongside so
every message is multipart. Add a new email by dropping a `<name>.html` file and
a matching function here.
"""

from dataclasses import dataclass
from pathlib import Path
from string import Template

from src.settings import get_settings

_TEMPLATES_DIR = Path(__file__).parent / "templates"


@dataclass(frozen=True)
class RenderedEmail:
    subject: str
    html: str
    text: str


def _logo_url() -> str:
    """Absolute URL to the brand badge served by the front (for the `<img>`)."""
    return f"{get_settings().app_url.rstrip('/')}/favicon.svg"


def _render_html(name: str, /, **context: str) -> str:
    raw = (_TEMPLATES_DIR / f"{name}.html").read_text(encoding="utf-8")
    # `logo_url` is injected into every template so the header shows the logo.
    return Template(raw).safe_substitute(logo_url=_logo_url(), **context)


def _greeting(first_name: str | None) -> str:
    return f"Hi {first_name}," if first_name else "Hi,"


def activation_email(*, first_name: str | None, action_url: str) -> RenderedEmail:
    subject = "Confirm your Kartographe account"
    html = _render_html(
        "activation",
        greeting=_greeting(first_name),
        action_url=action_url,
    )
    text = (
        f"{_greeting(first_name)}\n\n"
        "Welcome to Kartographe! Confirm your account by opening this link:\n"
        f"{action_url}\n\n"
        "If you didn't create an account, you can ignore this email.\n"
    )
    return RenderedEmail(subject=subject, html=html, text=text)


def welcome_email(*, first_name: str | None) -> RenderedEmail:
    subject = "Your Kartographe account is ready"
    html = _render_html("welcome", greeting=_greeting(first_name))
    text = (
        f"{_greeting(first_name)}\n\n"
        "Your account is now active. You can sign in and start using Kartographe.\n"
    )
    return RenderedEmail(subject=subject, html=html, text=text)


def reset_password_email(*, first_name: str | None, action_url: str) -> RenderedEmail:
    subject = "Reset your Kartographe password"
    html = _render_html(
        "reset_password",
        greeting=_greeting(first_name),
        action_url=action_url,
    )
    text = (
        f"{_greeting(first_name)}\n\n"
        "A password reset was requested for your account. Set a new password here:\n"
        f"{action_url}\n\n"
        "If this wasn't you, you can safely ignore this email.\n"
    )
    return RenderedEmail(subject=subject, html=html, text=text)


def invitation_email(
    *, inviter: str, account_name: str, role: str, action_url: str, expire_date: str
) -> RenderedEmail:
    subject = f"You've been invited to join {account_name} on Kartographe"
    html = _render_html(
        "invitation",
        greeting="Hi,",
        inviter=inviter,
        account_name=account_name,
        role=role,
        action_url=action_url,
        expire_date=expire_date,
    )
    text = (
        "Hi,\n\n"
        f"{inviter} invited you to join the workspace {account_name} on Kartographe "
        f"as {role}.\n\n"
        f"View the invitation: {action_url}\n\n"
        f"This invitation expires on {expire_date}. "
        "If you weren't expecting it, you can ignore this email.\n"
    )
    return RenderedEmail(subject=subject, html=html, text=text)


def password_changed_email(*, first_name: str | None) -> RenderedEmail:
    subject = "Your Kartographe password was changed"
    html = _render_html("password_changed", greeting=_greeting(first_name))
    text = (
        f"{_greeting(first_name)}\n\n"
        "Your password was just changed. If this wasn't you, reset it immediately "
        "and contact support.\n"
    )
    return RenderedEmail(subject=subject, html=html, text=text)
