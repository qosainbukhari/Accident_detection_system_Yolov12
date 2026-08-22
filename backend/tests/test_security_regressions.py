import io

import pytest
from fastapi.testclient import TestClient

from app.db import crud
from app.main import app


client = TestClient(app)


def get_token(username="admin", password="admin123") -> str:
    response = client.post("/auth/login", data={"username": username, "password": password})
    return response.json().get("access_token", "")


def test_security_headers_present():
    response = client.get("/health")

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "SAMEORIGIN"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_docs_disabled_by_default():
    assert app.docs_url is None
    assert app.redoc_url is None


def test_public_registration_cannot_create_admin(client):
    response = client.post(
        "/auth/register",
        json={
            "username": "public_admin_attempt",
            "email": "public-admin-attempt@example.com",
            "password": "SecurePass123!",
            "role": "admin",
        },
    )

    assert response.status_code == 201
    assert response.json()["role"] == "viewer"


def test_registration_rejects_passwords_beyond_bcrypt_limit(client):
    response = client.post(
        "/auth/register",
        json={
            "username": "long_password_user",
            "email": "long-password@example.com",
            "password": "a" * 73,
        },
    )

    assert response.status_code == 422


def test_detection_history_isolated_between_users(db, client, admin_user, viewer_user):
    admin_event = crud.create_detection_event(db, {
        "user_id": admin_user.id,
        "media_type": "image",
        "detected_class": "moderate",
        "confidence": 0.8,
    })
    viewer_event = crud.create_detection_event(db, {
        "user_id": viewer_user.id,
        "media_type": "image",
        "detected_class": "severe",
        "confidence": 0.9,
    })

    login = client.post("/auth/login", data={
        "username": viewer_user.username,
        "password": "viewer123!",
    })
    response = client.get(
        "/detection/history",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )

    assert response.status_code == 200
    assert [event["id"] for event in response.json()] == [viewer_event.id]
    assert admin_event.id not in [event["id"] for event in response.json()]


def test_corrupt_video_returns_bad_request():
    token = get_token()
    if not token:
        pytest.skip("Admin user not seeded")

    response = client.post(
        "/detection/video",
        files={"file": ("broken.mp4", io.BytesIO(b"not-a-real-video"), "video/mp4")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
