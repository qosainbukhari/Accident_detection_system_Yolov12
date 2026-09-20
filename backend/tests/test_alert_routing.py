"""
test_alert_routing.py – Alert routing unit tests
"""
from app.config import settings
from app.core import alert_service, call_service


def test_email_alert_runs_for_moderate_class(monkeypatch):
    captured = {}

    def fake_send_email(event_id, cls, conf, filename, db, image_path=None):
        captured["event_id"] = event_id
        captured["cls"] = cls
        captured["conf"] = conf
        captured["filename"] = filename
        captured["db"] = db
        captured["image_path"] = image_path
        return "sent"

    monkeypatch.setattr(alert_service, "_send_email", fake_send_email)

    alert_service.maybe_send_alert(
        event_id=42,
        detected_class="moderate",
        confidence=0.91,
        filename="frame.jpg",
        db=None,
        image_path="/tmp/frame.jpg",
    )

    assert {key: value for key, value in captured.items() if key != "db"} == {
        "event_id": 42,
        "cls": "moderate",
        "conf": 0.91,
        "filename": "frame.jpg",
        "image_path": "/tmp/frame.jpg",
    }
    assert captured["db"] is not None


def test_external_call_provider_is_not_used(monkeypatch):
    captured = {}

    def fake_log_mock_call(event_id, detected_class, db):
        captured["event_id"] = event_id
        captured["detected_class"] = detected_class
        captured["db"] = db
    monkeypatch.setattr(call_service, "_log_mock_call", fake_log_mock_call)

    call_service.maybe_trigger_call(event_id=77, detected_class="moderate", db=None)

    assert captured == {"event_id": 77, "detected_class": "moderate", "db": None}


def test_mock_call_is_default_and_free(monkeypatch):
    captured = {}

    def fake_log_mock_call(event_id, detected_class, db):
        captured["event_id"] = event_id
        captured["detected_class"] = detected_class
        captured["db"] = db

    monkeypatch.setattr(call_service, "_log_mock_call", fake_log_mock_call)

    call_service.maybe_trigger_call(event_id=88, detected_class="severe", db=None)

    assert captured == {
        "event_id": 88,
        "detected_class": "severe",
        "db": None,
    }
