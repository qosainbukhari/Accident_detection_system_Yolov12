"""AI emergency agent report endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.db import crud
from app.db.database import get_db
from app.api.deps import get_current_user, require_admin
from app.core.whatsapp_service import format_whatsapp_message, send_whatsapp

router = APIRouter()


def _serialise(report):
    if not report:
        return None
    return {
        "id": report.id,
        "detection_id": report.detection_id,
        "incident_level": report.incident_level,
        "situation_summary": report.situation_summary,
        "visible_hazards": report.visible_hazards or [],
        "recommended_services": report.recommended_services or [],
        "immediate_actions": report.immediate_actions or [],
        "casualty_risk": report.casualty_risk,
        "full_report": report.full_report,
        "model_used": report.model_used,
        "llm_error": report.llm_error,
        "processing_ms": report.processing_ms,
        "whatsapp_sent": report.whatsapp_sent,
        "whatsapp_sid": report.whatsapp_sid,
        "whatsapp_error": report.whatsapp_error,
        "created_at": report.created_at,
    }


@router.get("/status")
def agent_status(_user=Depends(get_current_user)):
    return {
        "agent_enabled": settings.AGENT_ENABLED,
        "gemini_configured": bool(settings.GEMINI_API_KEY.strip()),
        "gemini_model": settings.GEMINI_MODEL,
        "whatsapp_enabled": settings.WHATSAPP_ENABLED,
        "whatsapp_configured": bool(settings.TWILIO_ACCOUNT_SID.strip().startswith("AC")
                                    and settings.TWILIO_AUTH_TOKEN.strip()
                                    and settings.TWILIO_WHATSAPP_TO.strip()),
    }


@router.get("/report/{detection_id}")
def get_report(detection_id: int, db: Session = Depends(get_db),
               user=Depends(get_current_user)):
    owner_id = None if user.role == "admin" else user.id
    report = crud.get_agent_report(db, detection_id, owner_id)
    if not report:
        event = crud.get_detection_event(db, detection_id, owner_id)
        if event:
            return {
                "id": None,
                "detection_id": detection_id,
                "incident_level": "PENDING",
                "situation_summary": "AI emergency assessment is in progress.",
                "visible_hazards": [],
                "recommended_services": [],
                "immediate_actions": [],
                "casualty_risk": "unknown",
                "full_report": None,
                "model_used": "pending",
                "llm_error": None,
                "processing_ms": None,
                "whatsapp_sent": False,
                "whatsapp_sid": None,
                "whatsapp_error": None,
                "created_at": None,
            }
        raise HTTPException(404, "Detection event not found")
    return _serialise(report)


@router.get("/reports")
def get_reports(skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
                whatsapp_only: bool = False, db: Session = Depends(get_db),
                user=Depends(get_current_user)):
    owner_id = None if user.role == "admin" else user.id
    return [_serialise(r) for r in crud.get_agent_reports(db, skip, limit, owner_id, whatsapp_only)]


@router.post("/test-whatsapp")
def test_whatsapp(admin=Depends(require_admin)):
    report = {
        "incident_level": "HIGH",
        "situation_summary": "This is a test emergency assessment.",
        "casualty_risk": "unknown",
        "recommended_services": ["emergency services"],
        "immediate_actions": ["Verify the alert configuration"],
    }
    result = send_whatsapp(format_whatsapp_message(report, "test", 1.0, "test"))
    return result
