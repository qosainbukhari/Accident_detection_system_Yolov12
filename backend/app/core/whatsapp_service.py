"""Kapso WhatsApp dispatch for emergency agent reports."""
import logging
from typing import Optional
import uuid

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


KAPSO_MESSAGES_URL = "https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages"


def _phone_number(value: str) -> str:
    """Return a WhatsApp recipient in the digits-only format Kapso expects."""
    return "".join(char for char in (value or "") if char.isdigit())


def _phone_number_id(value: str) -> str:
    """Kapso phone-number IDs are numeric Meta IDs, not phone numbers."""
    value = (value or "").strip()
    return value if value.isdigit() else ""


def kapso_configured() -> bool:
    """Whether the credentials required for a real Kapso dispatch are present."""
    return bool(
        settings.KAPSO_API_KEY.strip()
        and _phone_number_id(settings.KAPSO_PHONE_NUMBER_ID)
        and _phone_number(settings.KAPSO_WHATSAPP_TO)
    )


def format_whatsapp_message(report: dict, detected_class: str, confidence: float,
                            filename: str = "") -> str:
    """Render a concise, actionable incident report for WhatsApp."""
    level = str(report.get("incident_level") or "HIGH").upper()
    level_icon = {
        "CRITICAL": "🔴",
        "HIGH": "🟠",
        "MODERATE": "🟡",
        "LOW": "🟢",
    }.get(level, "⚪")
    incident_id = report.get("detection_id")
    reference = f"INC-{int(incident_id):06d}" if isinstance(incident_id, int) else "Pending assignment"
    location = str(report.get("location") or "Not provided").strip()
    summary = str(report.get("situation_summary") or "An incident was detected and requires verification.").strip()
    services = report.get("recommended_services") or ["Emergency services"]
    actions = report.get("immediate_actions") or ["Verify the incident and contact local responders"]
    services_text = "\n".join(f"• {str(service).strip()}" for service in services if str(service).strip())
    actions_text = "\n".join(
        f"{index}. {str(action).strip()}"
        for index, action in enumerate(actions, start=1) if str(action).strip()
    )
    lines = [
        "🚨 *INCIDENT RESPONSE ALERT*",
        f"*Reference:* {reference}",
        f"*Priority:* {level_icon} {level}",
        f"*Incident:* {str(detected_class).upper()} · {confidence:.0%} confidence",
        f"*Location:* {location}",
        "",
        "*Situation summary*",
        summary,
        "",
        "*Recommended response*",
        services_text or "• Emergency services",
        "",
        "*Immediate actions*",
        actions_text or "1. Verify the incident and contact local responders",
        "",
        f"*Casualty risk:* {str(report.get('casualty_risk') or 'unknown').capitalize()}",
        "_Automated alert — verify details before taking operational action._",
    ]
    return "\n".join(lines)


def send_whatsapp(message: str, media_url: Optional[str] = None) -> dict:
    """Submit a WhatsApp message and return the provider acceptance result.

    ``sent`` means Kapso/Meta accepted the request, not that the recipient has
    received or read it.
    """
    if not settings.WHATSAPP_ENABLED:
        return {"sent": False, "sid": None, "error": "WhatsApp dispatch is disabled", "status": "failed"}
    if settings.WHATSAPP_MODE.lower() == "mock":
        return {"sent": True, "sid": f"mock-{uuid.uuid4().hex}", "error": None,
                "status": "simulated"}
    if settings.WHATSAPP_MODE.lower() != "kapso":
        return {"sent": False, "sid": None,
                "error": "Unsupported WhatsApp mode; use 'mock' or 'kapso'", "status": "failed"}
    if not kapso_configured():
        return {"sent": False, "sid": None,
                "error": "Kapso WhatsApp is not configured", "status": "failed"}

    try:
        payload = {
            "messaging_product": "whatsapp",
            "to": _phone_number(settings.KAPSO_WHATSAPP_TO),
            "type": "text",
            "text": {"body": message},
        }
        if media_url and settings.WHATSAPP_INCLUDE_MEDIA:
            payload.update({"type": "image", "image": {"link": media_url, "caption": message}})
        response = httpx.post(
            KAPSO_MESSAGES_URL.format(phone_number_id=_phone_number_id(settings.KAPSO_PHONE_NUMBER_ID)),
            headers={"X-API-Key": settings.KAPSO_API_KEY.strip()},
            json=payload,
            timeout=20.0,
        )
        body = response.json() if response.content else {}
        if response.is_error:
            error = body.get("error", body) if isinstance(body, dict) else body
            raise RuntimeError(f"Kapso API returned HTTP {response.status_code}: {error}")
        messages = body.get("messages") if isinstance(body, dict) else None
        message_id = messages[0].get("id") if isinstance(messages, list) and messages else None
        if not message_id:
            raise RuntimeError("Kapso API accepted the request without a WhatsApp message ID")
        logger.info("Kapso WhatsApp request accepted; id=%s", message_id)
        return {"sent": True, "sid": message_id, "error": None, "status": "accepted"}
    except (httpx.HTTPError, ValueError, RuntimeError) as exc:
        logger.warning("Kapso WhatsApp request failed: %s", exc)
        return {
            "sent": False,
            "sid": None,
            "error": str(exc),
            "status": "failed",
        }
