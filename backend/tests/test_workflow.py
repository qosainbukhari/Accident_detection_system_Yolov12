"""Workflow contracts that do not need real model or messaging credentials."""
from types import SimpleNamespace

from app.config import settings
from app.core.emergency_agent import build_agent_report, run_emergency_agent
from app.core.report_generator import generate_incident_pdf
from app.core.whatsapp_service import format_whatsapp_message, send_whatsapp
from app.db import crud


def test_mock_whatsapp_returns_a_delivery_id(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_ENABLED", True)
    monkeypatch.setattr(settings, "WHATSAPP_MODE", "mock")
    result = send_whatsapp("test alert")
    assert result["sent"] is True
    assert result["sid"].startswith("mock-")


def test_kapso_whatsapp_posts_meta_cloud_payload(monkeypatch):
    captured = {}

    class FakeResponse:
        content = b'{"messages":[{"id":"wamid.test"}]}'
        is_error = False

        def json(self):
            return {"messages": [{"id": "wamid.test"}]}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured.update(kwargs)
        return FakeResponse()

    monkeypatch.setattr(settings, "WHATSAPP_ENABLED", True)
    monkeypatch.setattr(settings, "WHATSAPP_MODE", "kapso")
    monkeypatch.setattr(settings, "KAPSO_API_KEY", "kapso-key")
    monkeypatch.setattr(settings, "KAPSO_PHONE_NUMBER_ID", "123456")
    monkeypatch.setattr(settings, "KAPSO_WHATSAPP_TO", "+1 (555) 123-4567")
    monkeypatch.setattr("app.core.whatsapp_service.httpx.post", fake_post)

    result = send_whatsapp("test alert")

    assert result == {"sent": True, "sid": "wamid.test", "error": None, "status": "accepted"}
    assert captured["url"].endswith("/v24.0/123456/messages")
    assert captured["headers"] == {"X-API-Key": "kapso-key"}
    assert captured["json"] == {
        "messaging_product": "whatsapp", "to": "15551234567", "type": "text",
        "text": {"body": "test alert"},
    }


def test_whatsapp_message_is_a_professional_incident_report():
    message = format_whatsapp_message({
        "detection_id": 42,
        "incident_level": "CRITICAL",
        "location": "North gate camera",
        "situation_summary": "A severe collision was detected.",
        "recommended_services": ["ambulance", "police"],
        "immediate_actions": ["Secure the area", "Call responders"],
        "casualty_risk": "likely",
    }, "severe", 0.91)
    assert "*INCIDENT RESPONSE ALERT*" in message
    assert "INC-000042" in message
    assert "*Recommended response*" in message
    assert "1. Secure the area" in message


def test_report_generator_creates_a4_pdf(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "REPORTS_DIR", str(tmp_path))
    event = SimpleNamespace(id=42, created_at="2026-09-19T10:00:00Z",
                            location="Demo camera", confidence=0.91,
                            detected_class="severe", incident_status="open")
    report = SimpleNamespace(incident_level="CRITICAL", situation_summary="Demo incident",
                             recommended_services=["ambulance"])
    path = generate_incident_pdf(event, report)
    assert path.endswith("incident-42.pdf")
    assert (tmp_path / "incident-42.pdf").read_bytes().startswith(b"%PDF")


def test_agent_falls_back_without_gemini(monkeypatch):
    monkeypatch.setattr(settings, "AGENT_ENABLED", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    report = build_agent_report("severe", 0.93)
    assert report["incident_level"] == "CRITICAL"
    assert report["model_used"] == "rule-based-fallback"
    assert "ambulance" in report["recommended_services"]


def test_emergency_agent_writes_report_and_mock_whatsapp(monkeypatch, db, tmp_path, admin_user):
    monkeypatch.setattr(settings, "AGENT_ENABLED", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "WHATSAPP_ENABLED", True)
    monkeypatch.setattr(settings, "WHATSAPP_MODE", "mock")
    monkeypatch.setattr(settings, "REPORTS_DIR", str(tmp_path))
    event = crud.create_detection_event(db, {
        "user_id": admin_user.id,
        "media_type": "image",
        "detected_class": "fire",
        "confidence": 0.88,
        "original_filename": "scene.jpg",
        "location": "Demo camera",
    })

    run_emergency_agent(event.id, "fire", 0.88, filename="scene.jpg")

    report = crud.get_agent_report(db, event.id)
    assert report is not None
    assert report.incident_level == "HIGH"
    assert report.whatsapp_sent is True
    assert report.whatsapp_sid.startswith("mock-")
    assert report.report_path.endswith(f"incident-{event.id}.pdf")
    db.refresh(event)
    assert event.whatsapp_sent is True
