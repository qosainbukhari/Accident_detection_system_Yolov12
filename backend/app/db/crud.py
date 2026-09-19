"""
crud.py – Database helper functions (Create / Read / Update / Delete)
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from typing import Optional, Dict, Any
from datetime import UTC, datetime

from app.db.models import User, DetectionEvent, Alert, CallLog, VideoLog, AgentReport
from app.core.security import hash_password


# ─────────────────────────────────────────────
# USER CRUD
# ─────────────────────────────────────────────

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(
        User.email == email.lower().strip()
    ).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_all_users(db: Session, skip: int = 0, limit: int = 50):
    return db.query(User).offset(skip).limit(limit).all()


def create_user(
    db: Session,
    username: str,
    email: str,
    password: str,
    role: str = "viewer",
) -> User:
    """
    Hash the password and persist a new User row.
    Raises ValueError on duplicate username/email (DB-level IntegrityError).
    """
    user = User(
        username        = username.strip(),
        email           = email.lower().strip(),
        hashed_password = hash_password(password),
        role            = role,
        is_active       = True,
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        msg = str(exc.orig).lower()
        if "username" in msg:
            raise ValueError("Username already taken")
        if "email" in msg:
            raise ValueError("Email already registered")
        raise ValueError(f"Database error: {exc.orig}")
    return user


def update_user(
    db: Session,
    user_id: int,
    data: Dict[str, Any],
) -> Optional[User]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    for key, val in data.items():
        if hasattr(user, key) and val is not None:
            setattr(user, key, val)
    db.commit()
    db.refresh(user)
    return user


# ─────────────────────────────────────────────
# DETECTION EVENT CRUD
# ─────────────────────────────────────────────

def create_detection_event(db: Session, data: Dict[str, Any]) -> DetectionEvent:
    event = DetectionEvent(**data)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_detection_event(
    db: Session,
    event_id: int,
    user_id: Optional[int] = None,
) -> Optional[DetectionEvent]:
    query = db.query(DetectionEvent).filter(DetectionEvent.id == event_id)
    if user_id is not None:
        query = query.filter(DetectionEvent.user_id == user_id)
    return query.first()


def get_detection_events(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    user_id: Optional[int] = None,
):
    q = db.query(DetectionEvent)
    if user_id:
        q = q.filter(DetectionEvent.user_id == user_id)
    return q.order_by(desc(DetectionEvent.created_at)).offset(skip).limit(limit).all()


def delete_detection_event(db: Session, event_id: int) -> bool:
    event = get_detection_event(db, event_id)
    if not event:
        return False
    db.delete(event)
    db.commit()
    return True


def mark_alert_sent(db: Session, event_id: int):
    event = get_detection_event(db, event_id)
    if event:
        event.alert_sent = True
        db.commit()


def mark_call_triggered(db: Session, event_id: int):
    event = get_detection_event(db, event_id)
    if event:
        event.call_triggered = True
        db.commit()


# ─────────────────────────────────────────────
# ALERT CRUD
# ─────────────────────────────────────────────

def create_alert_log(
    db: Session,
    detection_id: int,
    recipient: str,
    subject: str,
    body: str,
    status: str,
    error: str = None,
) -> Alert:
    alert = Alert(
        detection_id    = detection_id,
        recipient_email = recipient,
        subject         = subject,
        body            = body,
        status          = status,
        error_message   = error,
        sent_at         = datetime.now(UTC) if status == "sent" else None,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def get_alerts(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    user_id: Optional[int] = None,
):
    query = db.query(Alert).join(DetectionEvent)
    if user_id is not None:
        query = query.filter(DetectionEvent.user_id == user_id)
    return query.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()


# ─────────────────────────────────────────────
# CALL LOG CRUD
# ─────────────────────────────────────────────

def create_call_log(db: Session, data: Dict[str, Any]) -> CallLog:
    log = CallLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_call_logs(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    user_id: Optional[int] = None,
):
    query = db.query(CallLog).join(DetectionEvent)
    if user_id is not None:
        query = query.filter(DetectionEvent.user_id == user_id)
    return query.order_by(desc(CallLog.created_at)).offset(skip).limit(limit).all()


# ─────────────────────────────────────────────
# VIDEO LOG CRUD
# ─────────────────────────────────────────────

def create_video_log(db: Session, data: Dict[str, Any]) -> VideoLog:
    log = VideoLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_video_log(db: Session, detection_id: int) -> Optional[VideoLog]:
    return db.query(VideoLog).filter(VideoLog.detection_id == detection_id).first()


def create_agent_report(db: Session, data: Dict[str, Any]) -> AgentReport:
    """Persist or replace the report for one detection event."""
    existing = db.query(AgentReport).filter(
        AgentReport.detection_id == data.get("detection_id")
    ).first()
    if existing:
        for key, value in data.items():
            if hasattr(existing, key):
                setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing
    report = AgentReport(**data)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def create_pending_agent_report(db: Session, detection_id: int) -> AgentReport:
    """Make the report visible before asynchronous assessment begins."""
    return create_agent_report(db, {
        "detection_id": detection_id,
        "incident_level": "PENDING",
        "situation_summary": "AI emergency assessment is in progress.",
        "visible_hazards": [],
        "recommended_services": [],
        "immediate_actions": [],
        "casualty_risk": "unknown",
        "model_used": "pending",
        "processing_ms": 0,
        "whatsapp_sent": False,
    })


def get_agent_report(db: Session, detection_id: int, user_id: Optional[int] = None) -> Optional[AgentReport]:
    query = db.query(AgentReport).join(DetectionEvent).filter(
        AgentReport.detection_id == detection_id
    )
    if user_id is not None:
        query = query.filter(DetectionEvent.user_id == user_id)
    return query.first()


def get_agent_reports(db: Session, skip: int = 0, limit: int = 20,
                      user_id: Optional[int] = None, whatsapp_only: bool = False):
    query = db.query(AgentReport).join(DetectionEvent)
    if user_id is not None:
        query = query.filter(DetectionEvent.user_id == user_id)
    if whatsapp_only:
        query = query.filter(AgentReport.whatsapp_sent.is_(True))
    return query.order_by(desc(AgentReport.created_at)).offset(skip).limit(limit).all()


def count_agent_reports(db: Session, user_id: Optional[int] = None) -> int:
    query = db.query(AgentReport).join(DetectionEvent)
    if user_id is not None:
        query = query.filter(DetectionEvent.user_id == user_id)
    return query.count()


def mark_whatsapp_sent(db: Session, event_id: int) -> None:
    event = get_detection_event(db, event_id)
    if event:
        event.whatsapp_sent = True
        db.commit()


def count_events_today(db: Session) -> int:
    today = datetime.now(UTC).date()
    from sqlalchemy import func as _func
    return db.query(DetectionEvent).filter(
        _func.date(DetectionEvent.created_at) == today
    ).count()


def count_recent_by_class(db: Session, detected_class: str, hours: int = 24) -> int:
    from datetime import timedelta
    since = datetime.now(UTC) - timedelta(hours=hours)
    return db.query(DetectionEvent).filter(
        DetectionEvent.detected_class == detected_class,
        DetectionEvent.created_at >= since,
    ).count()
