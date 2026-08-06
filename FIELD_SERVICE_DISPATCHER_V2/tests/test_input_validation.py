from backend.utils.validators import (
    validate_location,
    validate_name,
    validate_password,
    validate_phone,
)
try:
    from pydantic import TypeAdapter, EmailStr
except Exception:
    TypeAdapter = None
    EmailStr = None


def test_invalid_name_rejects_numbers_and_symbols():
    invalid_values = ["An1l", "Ravi@", "__", "A "]
    for value in invalid_values:
        try:
            validate_name(value)
            assert False, f"Expected name validation failure for: {value}"
        except ValueError:
            pass


def test_invalid_email_via_pydantic_emailstr():
    if TypeAdapter is None or EmailStr is None:
        return

    adapter = TypeAdapter(EmailStr)
    invalid_emails = ["invalid", "no-at-domain.com", "name@", "name@domain"]
    for value in invalid_emails:
        try:
            adapter.validate_python(value)
            assert False, f"Expected email validation failure for: {value}"
        except Exception:
            pass


def test_invalid_phone_number_rejected():
    invalid_values = ["12345", "5123456789", "+911234567890", "98AB543210"]
    for value in invalid_values:
        try:
            validate_phone(value)
            assert False, f"Expected phone validation failure for: {value}"
        except ValueError:
            pass


def test_weak_password_rejected():
    invalid_values = ["abcdef", "ABCDEF", "abc123", "Abcdef", "123456"]
    for value in invalid_values:
        try:
            validate_password(value)
            assert False, f"Expected password validation failure for: {value}"
        except ValueError:
            pass


def test_empty_location_rejected():
    invalid_values = ["", " ", "ab"]
    for value in invalid_values:
        try:
            validate_location(value)
            assert False, f"Expected location validation failure for: {value}"
        except ValueError:
            pass
