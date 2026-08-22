"""
test_detection.py – Detection endpoint tests
"""
import io
import pytest
import cv2
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# ── Helpers ───────────────────────────────────────────────────────
def get_token(username="admin", password="admin123") -> str:
    r = client.post("/auth/login", data={"username": username, "password": password})
    return r.json().get("access_token", "")


def make_dummy_jpg(text="ACCIDENT TEST") -> io.BytesIO:
    """Create a simple black image with text as a JPEG in memory."""
    frame = np.zeros((480, 640, 3), np.uint8)
    cv2.putText(frame, text, (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 5)
    _, buf = cv2.imencode(".jpg", frame)
    return io.BytesIO(buf.tobytes())


# ── Tests ─────────────────────────────────────────────────────────
def test_image_detection_authenticated():
    token = get_token()
    if not token:
        pytest.skip("Admin user not seeded")

    r = client.post(
        "/detection/image",
        files={"file": ("test_image.jpg", make_dummy_jpg(), "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "detected_class" in data
    assert data["detected_class"] in ["fire", "moderate", "severe", "no_detection"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert "processed_url" in data
    assert "processing_ms" in data
    assert isinstance(data["bounding_boxes"], list)


def test_image_detection_unauthenticated():
    r = client.post(
        "/detection/image",
        files={"file": ("test.jpg", make_dummy_jpg(), "image/jpeg")},
    )
    assert r.status_code == 401


def test_invalid_image_type():
    token = get_token()
    if not token:
        pytest.skip("Admin user not seeded")

    r = client.post(
        "/detection/image",
        files={"file": ("malware.exe", b"fakebytes", "application/octet-stream")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400


def test_corrupt_image():
    token = get_token()
    if not token:
        pytest.skip("Admin user not seeded")

    r = client.post(
        "/detection/image",
        files={"file": ("corrupt.jpg", b"not_an_image_at_all_!!!!", "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400


def test_get_history_authenticated():
    token = get_token()
    if not token:
        pytest.skip("Admin user not seeded")

    r = client.get(
        "/detection/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_get_history_unauthenticated():
    r = client.get("/detection/history")
    assert r.status_code == 401
