"""
routes/alerts.py – /alerts, /alerts/calls, /alerts/test-email, /alerts/test-call
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import crud
from app.api.deps import get_current_user, require_admin

router = APIRouter()


# ── GET /alerts ───────────────────────────────────────────────────
@router.get("")
def get_alerts(
    skip:  int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """List all email alert logs (paginated)."""
    owner_id = None if user.role == "admin" else user.id
    return crud.get_alerts(db, skip=skip, limit=limit, user_id=owner_id)


# ── GET /alerts/calls ─────────────────────────────────────────────
@router.get("/calls")
def get_call_logs(
    skip:  int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """List local emergency-call audit logs (paginated)."""
    owner_id = None if user.role == "admin" else user.id
    return crud.get_call_logs(db, skip=skip, limit=limit, user_id=owner_id)


# ── POST /alerts/test-email ───────────────────────────────────────
@router.post("/test-email")
def test_email(
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Admin only – send a test emergency email alert."""
    from app.core.alert_service import _send_email
    status = _send_email(
        event_id=0,
        cls="severe",
        conf=0.95,
        filename="test_image.jpg",
        db=db,
    )
    return {
        "status": status,
        "message": (
            "Test email sent successfully. Check your inbox."
            if status == "sent"
            else "Test email was skipped or failed. Check SMTP configuration and logs."
        ),
    }


# ── POST /alerts/test-call ────────────────────────────────────────
@router.post("/test-call")
def test_call(
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Admin only – record a local simulated call audit entry."""
    from app.core.call_service import _log_mock_call
    _log_mock_call(event_id=0, detected_class="severe", db=db)
    return {"message": "Test call logged locally; no external call provider is configured."}
