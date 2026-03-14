from app.core.security import decode_token, get_password_hash, verify_password


def test_decode_token_invalid_returns_empty_payload() -> None:
    assert decode_token("not-a-real-token", "secret") == {}


def test_password_hash_roundtrip() -> None:
    password = "StrongPassword123!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed)
