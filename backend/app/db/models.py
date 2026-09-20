"""
models.py – SQLAlchemy ORM Models
Tables: users, detection_events, alerts, call_logs, video_processing_logs
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    Enum, JSON, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


# ─────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────
class AccClass(str, enum.Enum):
    fire   = "fire"
    moderate = "moderate"
    severe = "severe"
    no_detection = "no_detection"


class UserRole(str, enum.Enum):
    admin    = "admin"
    operator = "operator"
    viewer   = "viewer"


# ─────────────────────────────────────────────
# 1. USERS
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String(50), unique=True, nullable=False, index=True)
    email           = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(String(20), default="viewer")
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    events = relationship("DetectionEvent", back_populates="user")


# ─────────────────────────────────────────────
# 2. DETECTION EVENTS
# ─────────────────────────────────────────────
class DetectionEvent(Base):
    __tablename__ = "detection_events"

    id                 = Column(Integer, primary_key=True, index=True)
    user_id            = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    media_type         = Column(String(10), nullable=False)           # 'image' | 'video'
    original_filename  = Column(String(255))
    processed_filename = Column(String(255))
    detected_class     = Column(String(20), nullable=False)
    confidence         = Column(Float, nullable=False)
    bounding_boxes     = Column(JSON)
    snapshot_path      = Column(String(500))
    total_frames       = Column(Integer)                              # video only
    detected_frames    = Column(Integer)                              # video only
    dominant_class     = Column(String(20))                           # video only
    processing_ms      = Column(Integer)
    alert_sent         = Column(Boolean, default=False)
    call_triggered     = Column(Boolean, default=False)
    whatsapp_sent      = Column(Boolean, default=False)
    incident_status    = Column(String(20), default="open", index=True)
    location           = Column(String(255), default="Unknown")
    created_at         = Column(DateTime, server_default=func.now(), index=True)

    user      = relationship("User", back_populates="events")
    alert     = relationship("Alert", back_populates="event", uselist=False, cascade="all, delete-orphan")
    call_log  = relationship("CallLog", back_populates="event", uselist=False, cascade="all, delete-orphan")
    video_log = relationship("VideoLog", back_populates="event", uselist=False, cascade="all, delete-orphan")
    agent_report = relationship("AgentReport", back_populates="event", uselist=False, cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# 3. ALERTS (EMAIL LOG)
# ─────────────────────────────────────────────
class Alert(Base):
    __tablename__ = "alerts"

    id              = Column(Integer, primary_key=True, index=True)
    detection_id    = Column(Integer, ForeignKey("detection_events.id", ondelete="CASCADE"), nullable=False)
    recipient_email = Column(String(150))
    subject         = Column(String(255))
    body            = Column(Text)
    status          = Column(String(20), default="pending")   # pending | sent | failed
    error_message   = Column(Text)
    sent_at         = Column(DateTime)
    created_at      = Column(DateTime, server_default=func.now())

    event = relationship("DetectionEvent", back_populates="alert")


# ─────────────────────────────────────────────
# 4. LOCAL CALL AUDIT LOGS
# ─────────────────────────────────────────────
class CallLog(Base):
    __tablename__ = "call_logs"

    id               = Column(Integer, primary_key=True, index=True)
    detection_id     = Column(Integer, ForeignKey("detection_events.id", ondelete="CASCADE"), nullable=False)
    to_number        = Column(String(20))
    from_number      = Column(String(20))
    call_sid         = Column("call_sid", String(50))
    call_status      = Column(String(30), default="initiated")
    duration_seconds = Column(Integer)
    call_message     = Column(Text)
    created_at       = Column(DateTime, server_default=func.now())

    event = relationship("DetectionEvent", back_populates="call_log")


# ─────────────────────────────────────────────
# 5. VIDEO PROCESSING LOGS
# ─────────────────────────────────────────────
class VideoLog(Base):
    __tablename__ = "video_processing_logs"

    id                   = Column(Integer, primary_key=True, index=True)
    detection_id         = Column(Integer, ForeignKey("detection_events.id", ondelete="CASCADE"), nullable=False)
    total_frames         = Column(Integer)
    processed_frames     = Column(Integer)
    fire_frames          = Column(Integer, default=0)
    moderate_frames      = Column(Integer, default=0)
    severe_frames        = Column(Integer, default=0)
    no_detection_frames  = Column(Integer, default=0)
    avg_confidence       = Column(Float)
    fps_processed        = Column(Float)
    output_path          = Column(String(500))
    created_at           = Column(DateTime, server_default=func.now())

    event = relationship("DetectionEvent", back_populates="video_log")


# ─────────────────────────────────────────────
# 6. AI AGENT REPORTS
# ─────────────────────────────────────────────
class AgentReport(Base):
    """Structured emergency assessment and WhatsApp dispatch outcome."""
    __tablename__ = "agent_reports"

    id                   = Column(Integer, primary_key=True, index=True)
    detection_id         = Column(Integer, ForeignKey("detection_events.id", ondelete="CASCADE"),
                                  nullable=False, unique=True, index=True)
    incident_level       = Column(String(20), index=True)
    situation_summary    = Column(Text)
    visible_hazards      = Column(JSON)
    recommended_services = Column(JSON)
    immediate_actions    = Column(JSON)
    casualty_risk        = Column(String(20))
    full_report          = Column(Text)
    model_used           = Column(String(60))
    llm_error            = Column(Text)
    processing_ms        = Column(Integer)
    whatsapp_sent        = Column(Boolean, default=False, index=True)
    whatsapp_sid         = Column(String(64))
    whatsapp_error       = Column(Text)
    report_path          = Column(String(500))
    created_at           = Column(DateTime, server_default=func.now(), index=True)

    event = relationship("DetectionEvent", back_populates="agent_report")


class AuditLog(Base):
    """Append-only record of agent and operator actions."""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(Integer, ForeignKey("detection_events.id", ondelete="SET NULL"), index=True)
    actor = Column(String(80), nullable=False, default="system")
    action = Column(String(80), nullable=False)
    status = Column(String(20), nullable=False, default="success")
    details = Column(JSON)
    created_at = Column(DateTime, server_default=func.now(), index=True)
