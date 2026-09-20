"""AI emergency assessment with a deterministic fallback when Gemini is unavailable."""
import json
import logging
from pathlib import Path
import time
from typing import Any, Optional

try:
    from google.api_core.exceptions import GoogleAPIError
except ImportError:  # pragma: no cover
    class GoogleAPIError(Exception):
        pass

from app.config import settings
from app.db.database import SessionLocal
from app.db import crud
from app.core.report_generator import generate_incident_pdf, generate_whatsapp_report_image
from app.core.whatsapp_service import format_whatsapp_message, send_whatsapp

logger = logging.getLogger(__name__)


def _public_media_url(media_path: Optional[str]) -> Optional[str]:
    """Map a generated static artifact to the public URL Kapso can fetch."""
    if not media_path or not settings.WHATSAPP_INCLUDE_MEDIA or not settings.PUBLIC_BASE_URL.strip():
        return None
    path = Path(media_path)
    try:
        relative = path.relative_to(Path("static"))
    except ValueError:
        return None
    return f"{settings.PUBLIC_BASE_URL.rstrip('/')}/static/{relative.as_posix()}"

def _rule_based_report(detected_class: str, confidence: float,
                       context: Optional[dict] = None) -> dict:
    level = {"severe": "CRITICAL", "fire": "HIGH", "moderate": "MODERATE"}.get(
        str(detected_class).lower(), "LOW"
    )
    risk = {"CRITICAL": "likely", "HIGH": "possible", "MODERATE": "possible", "LOW": "unknown"}[level]
    services = ["fire department", "ambulance"] if detected_class in {"fire", "severe"} else ["police", "ambulance"]
    return {
        "incident_level": level,
        "situation_summary": f"Detected {detected_class} incident with {confidence:.0%} confidence.",
        "visible_hazards": [str(detected_class)],
        "recommended_services": services,
        "immediate_actions": ["Keep people away from the incident area", "Call local emergency services"],
        "casualty_risk": risk,
        "full_report": "",
        "model_used": "rule-based-fallback",
        "llm_error": None,
    }


def _normalise_report(value: Any, detected_class: str, confidence: float) -> dict:
    if isinstance(value, str):
        cleaned = value.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].lstrip()
        try:
            value = json.loads(cleaned)
        except json.JSONDecodeError:
            start, end = cleaned.find("{"), cleaned.rfind("}")
            if start < 0 or end <= start:
                raise
            value = json.loads(cleaned[start:end + 1])
    elif isinstance(value, list):
        value = "".join(
            item.get("text", "") if isinstance(item, dict) else str(item)
            for item in value
        )
        return _normalise_report(value, detected_class, confidence)
    if not isinstance(value, dict):
        raise ValueError("Gemini response was not a JSON object")
    fallback = _rule_based_report(detected_class, confidence)
    for key in ("visible_hazards", "recommended_services", "immediate_actions"):
        if not isinstance(value.get(key), list):
            value[key] = fallback[key]
    for key in ("incident_level", "situation_summary", "casualty_risk"):
        if not value.get(key):
            value[key] = fallback[key]
    value.setdefault("full_report", json.dumps(value, ensure_ascii=False))
    value["model_used"] = settings.GEMINI_MODEL
    value["llm_error"] = None
    return value


def _gemini_report(detected_class: str, confidence: float, context: Optional[dict]) -> dict:
    from langchain_google_genai import ChatGoogleGenerativeAI
    prompt = (
        "Assess this accident detection for emergency response. Return JSON only with keys "
        "incident_level (CRITICAL/HIGH/MODERATE/LOW), situation_summary, visible_hazards "
        "(array), recommended_services (array), immediate_actions (array), casualty_risk "
        "(none/possible/likely/unknown), full_report. "
        f"Detected class: {detected_class}; confidence: {confidence:.4f}; context: {context or {}}"
    )
    response = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        timeout=settings.AGENT_TIMEOUT_SECONDS,
        temperature=0,
        max_retries=0,
    ).invoke(prompt)
    content = getattr(response, "content", response)
    return _normalise_report(content, detected_class, confidence)


def build_agent_report(detected_class: str, confidence: float,
                       context: Optional[dict] = None) -> dict:
    """Build an AI report, falling back transparently when Gemini is unavailable."""
    if settings.AGENT_ENABLED and settings.GEMINI_API_KEY.strip():
        try:
            return _gemini_report(detected_class, confidence, context)
        except (ImportError, ValueError, TypeError, TimeoutError, OSError, GoogleAPIError, RuntimeError) as exc:
            fallback = _rule_based_report(detected_class, confidence, context)
            fallback["llm_error"] = str(exc)
            return fallback
        except Exception as exc:  # noqa: BLE001 — never fail the emergency pipeline on an LLM SDK surprise
            fallback = _rule_based_report(detected_class, confidence, context)
            fallback["llm_error"] = str(exc)
            return fallback
    fallback = _rule_based_report(detected_class, confidence, context)
    if not settings.GEMINI_API_KEY.strip():
        fallback["llm_error"] = "Gemini API key is not configured"
    return fallback


def run_emergency_agent(event_id: int, detected_class: str, confidence: float,
                        media_path: Optional[str] = None, media_type: str = "image",
                        filename: str = "") -> None:
    """Create the report and dispatch WhatsApp without sharing request sessions."""
    if not settings.AGENT_ENABLED:
        return
    started = time.perf_counter()
    db = SessionLocal()
    try:
        event = crud.get_detection_event(db, event_id)
        if not event:
            return
        existing = crud.get_agent_report(db, event_id)
        if existing and existing.whatsapp_sent:
            crud.create_audit_log(db, event_id, "agent_duplicate_suppressed")
            return
        if not existing:
            crud.create_pending_agent_report(db, event_id)
        context = {"media_type": media_type, "events_today": crud.count_events_today(db)}
        # A slow or unavailable AI provider must never delay an emergency
        # notification. Send a deterministic, actionable alert first; the
        # richer Gemini assessment is generated and persisted afterwards.
        alert_report = _rule_based_report(detected_class, confidence, context)
        alert_report.update({
            "detection_id": event.id,
            "location": event.location or "Not provided",
        })
        whatsapp_media_path = None
        if settings.WHATSAPP_INCLUDE_MEDIA:
            try:
                whatsapp_media_path = generate_whatsapp_report_image(event, alert_report, media_path)
            except (ImportError, OSError, ValueError) as exc:
                logger.warning("Could not create WhatsApp report image: %s", exc)
        dispatch = {"sent": False, "sid": None, "error": "not attempted", "error_code": None}
        for attempt in range(3):
            dispatch = send_whatsapp(
                format_whatsapp_message(alert_report, detected_class, confidence, filename),
                media_url=_public_media_url(whatsapp_media_path or media_path),
            )
            if dispatch["sent"]:
                break
            if attempt < 2:
                time.sleep(2 ** attempt)
        report = build_agent_report(detected_class, confidence, context)
        report["detection_id"] = event_id
        report["processing_ms"] = round((time.perf_counter() - started) * 1000)
        report.update({
            "whatsapp_sent": dispatch["sent"],
            "whatsapp_sid": dispatch["sid"],
            "whatsapp_error": dispatch["error"],
        })
        try:
            # The PDF is generated only after the assessment is complete, so
            # it contains the final report and the notification outcome.
            report["report_path"] = generate_incident_pdf(event, report, media_path)
        except (ImportError, OSError, ValueError) as exc:
            report["llm_error"] = f"{report.get('llm_error') or ''}; PDF: {exc}".lstrip("; ")
        crud.create_agent_report(db, report)
        crud.create_audit_log(db, event_id, "agent_assessment_and_dispatch",
                              status="success" if dispatch["sent"] else "failed",
                              details={"whatsapp_sid": dispatch["sid"]})
        if dispatch["sent"]:
            crud.mark_whatsapp_sent(db, event_id)
    except Exception as exc:  # noqa: BLE001 — persist a usable report even if dispatch crashes
        logger.exception("Emergency agent failed for event %s", event_id)
        try:
            crud.create_agent_report(db, {
                "detection_id": event_id,
                "incident_level": "HIGH",
                "situation_summary": "Automated assessment failed; treat as a potential emergency.",
                "visible_hazards": [str(detected_class)],
                "recommended_services": ["emergency services"],
                "immediate_actions": ["Dispatch local responders and verify the scene"],
                "casualty_risk": "unknown",
                "model_used": "error-fallback",
                "llm_error": str(exc),
                "whatsapp_sent": False,
                "whatsapp_error": str(exc),
            })
            crud.create_audit_log(db, event_id, "agent_assessment_and_dispatch",
                                  status="failed", details={"error": str(exc)})
        except Exception:
            logger.exception("Unable to persist agent failure for event %s", event_id)
    finally:
        db.close()
