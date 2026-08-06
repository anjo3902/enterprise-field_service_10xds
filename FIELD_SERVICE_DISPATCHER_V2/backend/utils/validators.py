from __future__ import annotations

import re

NAME_REGEX = re.compile(r"^[A-Za-z ]+$")
PHONE_REGEX = re.compile(r"^(\+91[\-\s]?)?[6-9]\d{9}$")
PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$")


def sanitize_text(value: str | None) -> str:
    return str(value or "").strip()


def validate_name(value: str | None) -> str:
    v = sanitize_text(value)
    if not v:
        raise ValueError("Name is required")
    if len(v) < 3:
        raise ValueError("Name must be at least 3 characters")
    if not NAME_REGEX.fullmatch(v):
        raise ValueError("Name must contain only alphabets and spaces")
    return v


def validate_phone(value: str | None) -> str:
    v = sanitize_text(value)
    if not v:
        raise ValueError("Phone number is required")
    if not PHONE_REGEX.fullmatch(v):
        raise ValueError("Invalid phone number format")

    compact = re.sub(r"[^0-9]", "", v)
    if compact.startswith("91") and len(compact) == 12:
        compact = compact[2:]
    return compact


def validate_password(value: str | None) -> str:
    v = sanitize_text(value)
    if not v:
        raise ValueError("Password is required")
    if not PASSWORD_REGEX.fullmatch(v):
        raise ValueError("Password must contain uppercase, lowercase, number and be at least 6 characters")
    return v


def validate_location(value: str | None) -> str:
    v = sanitize_text(value)
    if not v:
        raise ValueError("Location is required")
    if len(v) < 3:
        raise ValueError("Location must be at least 3 characters")
    return v
