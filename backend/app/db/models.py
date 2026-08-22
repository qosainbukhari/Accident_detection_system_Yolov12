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
    detected_class     = Column(Enum(AccClass), nullable=False)
    confidence         = Column(Float, nullable=False)
    bounding_boxes     = Column(JSON)
    snapshot_path      = Column(String(500))
    total_frames       = Column(Integer)                              # video only
    detected_frames    = Column(Integer)                              # video only
    dominant_class     = Column(String(20))                           # video only
    processing_ms      = Column(Integer)
    alert_sent         = Column(Boolean, default=False)
    call_triggered     = Column(Boolean, default=False)
    created_at         = Column(DateTime, server_default=func.now(), index=True)

    user      = relationship("User", back_populates="events")
    alert     = relationship("Alert", back_populates="event", uselist=False, cascade="all, delete-orphan")
    call_log  = relationship("CallLog", back_populates="event", uselist=False, cascade="all, delete-orphan")
    video_log = relationship("VideoLog", back_populates="event", uselist=False, cascade="all, delete-orphan")


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
# 4. CALL LOGS (TWILIO)
# ─────────────────────────────────────────────
class CallLog(Base):
    __tablename__ = "call_logs"

    id               = Column(Integer, primary_key=True, index=True)
    detection_id     = Column(Integer, ForeignKey("detection_events.id", ondelete="CASCADE"), nullable=False)
    to_number        = Column(String(20))
    from_number      = Column(String(20))
    twilio_call_sid  = Column(String(50))
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
