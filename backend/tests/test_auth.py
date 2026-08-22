"""
test_auth.py – Authentication endpoint tests
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

REGISTER_PAYLOAD = {
    "username": "testuser_auth",
    "email": "testauth@example.com",
    "password": "SecurePass123!",
    "role": "viewer",
}


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["model"] == "yolov12"


def test_register_new_user():
    r = client.post("/auth/register", json=REGISTER_PAYLOAD)
    assert r.status_code in (201, 400)  # 400 if already registered


def test_login_success():
    # Ensure user exists
    client.post("/auth/register", json=REGISTER_PAYLOAD)
    r = client.post("/auth/login", data={
        "username": REGISTER_PAYLOAD["username"],
        "password": REGISTER_PAYLOAD["password"],
    })
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data


def test_login_wrong_password():
    r = client.post("/auth/login", data={
        "username": REGISTER_PAYLOAD["username"],
        "password": "wrongpassword",
    })
    assert r.status_code == 401


def test_get_me():
    client.post("/auth/register", json=REGISTER_PAYLOAD)
    login = client.post("/auth/login", data={
        "username": REGISTER_PAYLOAD["username"],
        "password": REGISTER_PAYLOAD["password"],
    })
    token = login.json().get("access_token")
    if token:
        r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["username"] == REGISTER_PAYLOAD["username"]


def test_get_me_unauthenticated():
    r = client.get("/auth/me")
    assert r.status_code == 401
