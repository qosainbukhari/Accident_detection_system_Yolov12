"""
schemas/alert.py – Pydantic schemas for alerts and call logs
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AlertOut(BaseModel):
    id: int
    detection_id: int
    recipient_email: Optional[str]
    subject: Optional[str]
    status: str
    error_message: Optional[str]
    sent_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class CallLogOut(BaseModel):
    id: int
    detection_id: int
    to_number: Optional[str]
    from_number: Optional[str]
    call_sid: Optional[str]
    call_status: str
    duration_seconds: Optional[int]
    call_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
