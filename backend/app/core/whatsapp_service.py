"""Twilio WhatsApp dispatch for emergency agent reports."""
from typing import Optional

from app.config import settings


def _address(value: str) -> str:
    value = (value or "").strip()
    return value if value.startswith("whatsapp:") else f"whatsapp:{value}"


def format_whatsapp_message(report: dict, detected_class: str, confidence: float,
                            filename: str = "") -> str:
    services = ", ".join(report.get("recommended_services") or ["Emergency services"])
    actions = "; ".join(report.get("immediate_actions") or [])
    lines = [
        "🚨 AI EMERGENCY ASSESSMENT",
        f"Incident: {str(detected_class).upper()} ({confidence:.0%} confidence)",
        f"Level: {report.get('incident_level', 'UNKNOWN')}",
        f"Summary: {report.get('situation_summary') or 'Accident detected.'}",
        f"Casualty risk: {report.get('casualty_risk', 'unknown')}",
        f"Services: {services}",
    ]
    if actions:
        lines.append(f"Immediate actions: {actions}")
    if filename:
        lines.append(f"Source: {filename}")
    return "\n".join(lines)


def send_whatsapp(message: str, media_url: Optional[str] = None) -> dict:
    """Send a WhatsApp message, returning a stable status payload."""
    if not settings.WHATSAPP_ENABLED:
        return {"sent": False, "sid": None, "error": "WhatsApp dispatch is disabled"}
    if not all((settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN,
                settings.TWILIO_WHATSAPP_TO)):
        return {"sent": False, "sid": None, "error": "WhatsApp is not configured"}
    if not settings.TWILIO_ACCOUNT_SID.strip().startswith("AC"):
        return {"sent": False, "sid": None, "error": "Invalid Twilio Account SID"}

    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException
        kwargs = {
            "from_": _address(settings.TWILIO_WHATSAPP_FROM),
            "to": _address(settings.TWILIO_WHATSAPP_TO),
            "body": message,
        }
        if media_url and settings.WHATSAPP_INCLUDE_MEDIA:
            kwargs["media_url"] = [media_url]
        sent = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN).messages.create(**kwargs)
        return {"sent": True, "sid": sent.sid, "error": None}
    except ImportError as exc:
        return {"sent": False, "sid": None, "error": str(exc)}
    except (ValueError, TypeError, RuntimeError, TwilioRestException) as exc:
        return {"sent": False, "sid": None, "error": str(exc)}
