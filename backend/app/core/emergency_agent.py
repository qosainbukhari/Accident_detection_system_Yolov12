"""AI emergency assessment with a deterministic fallback when Gemini is unavailable."""
import json
import time
from typing import Any, Optional

from google.api_core.exceptions import GoogleAPIError

from app.config import settings
from app.db.database import SessionLocal
from app.db import crud
from app.core.whatsapp_service import format_whatsapp_message, send_whatsapp


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
        response_mime_type="application/json",
    ).invoke(prompt)
    content = getattr(response, "content", response)
    return _normalise_report(content, detected_class, confidence)


def build_agent_report(detected_class: str, confidence: float,
                       context: Optional[dict] = None) -> dict:
    """Build an AI report, falling back transparently when Gemini is unavailable."""
    if settings.AGENT_ENABLED and settings.GEMINI_API_KEY.strip():
        try:
            return _gemini_report(detected_class, confidence, context)
        except (ImportError, ValueError, TypeError, TimeoutError, OSError, GoogleAPIError) as exc:
            fallback = _rule_based_report(detected_class, confidence, context)
            fallback["llm_error"] = str(exc)
            return fallback
    fallback = _rule_based_report(detected_class, confidence, context)
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
        if not crud.get_agent_report(db, event_id):
            crud.create_pending_agent_report(db, event_id)
        context = {"media_type": media_type, "events_today": crud.count_events_today(db)}
        report = build_agent_report(detected_class, confidence, context)
        report["detection_id"] = event_id
        report["processing_ms"] = round((time.perf_counter() - started) * 1000)
        dispatch = send_whatsapp(
            format_whatsapp_message(report, detected_class, confidence, filename),
            media_url=None,
        )
        report.update({
            "whatsapp_sent": dispatch["sent"],
            "whatsapp_sid": dispatch["sid"],
            "whatsapp_error": dispatch["error"],
        })
        crud.create_agent_report(db, report)
        if dispatch["sent"]:
            crud.mark_whatsapp_sent(db, event_id)
    finally:
        db.close()
