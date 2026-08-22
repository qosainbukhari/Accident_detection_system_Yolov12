"""
test_alerts.py – Alert and call log endpoint tests
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_token(username="admin", password="admin123") -> str:
    r = client.post("/auth/login", data={"username": username, "password": password})
    return r.json().get("access_token", "")


def test_get_alerts_authenticated():
    token = get_token()
    if not token:
        pytest.skip("Admin user not seeded")
    r = client.get("/alerts", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_get_call_logs_authenticated():
    token = get_token()
    if not token:
        pytest.skip("Admin user not seeded")
    r = client.get("/alerts/calls", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_alerts_unauthenticated():
    r = client.get("/alerts")
    assert r.status_code == 401


def test_test_email_non_admin():
    """Non-admin should be denied from test-email."""
    # First register a viewer
    client.post("/auth/register", json={
        "username": "viewer_test",
        "email": "alerts-viewer@test.com",
        "password": "pass123",
        "role": "viewer",
    })
    login = client.post("/auth/login", data={"username": "viewer_test", "password": "pass123"})
    token = login.json().get("access_token", "")
    if token:
        r = client.post("/alerts/test-email", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 403


def test_dashboard_stats():
    token = get_token()
    if not token:
        pytest.skip("Admin user not seeded")
    r = client.get("/dashboard/stats", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "class_counts" in data
    assert "today" in data
