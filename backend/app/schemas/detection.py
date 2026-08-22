"""
schemas/detection.py – Pydantic schemas for detection responses
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class BoundingBox(BaseModel):
    class_: str
    confidence: float
    x1: int
    y1: int
    x2: int
    y2: int

    class Config:
        populate_by_name = True
        fields = {"class_": "class"}


class ImageDetectionResponse(BaseModel):
    event_id: int
    detected_class: str
    confidence: float
    bounding_boxes: List[Dict[str, Any]]
    processed_url: str
    processing_ms: int
    alert_triggered: bool


class VideoDetectionResponse(BaseModel):
    event_id: int
    dominant_class: str
    avg_confidence: float
    total_frames: int
    class_stats: Dict[str, int]
    processed_video_url: str
    snapshot_url: Optional[str]
    alert_triggered: bool


class DetectionEventOut(BaseModel):
    id: int
    media_type: str
    original_filename: Optional[str]
    processed_filename: Optional[str]
    detected_class: str
    confidence: float
    bounding_boxes: Optional[List[Dict[str, Any]]]
    snapshot_path: Optional[str]
    total_frames: Optional[int]
    detected_frames: Optional[int]
    dominant_class: Optional[str]
    processing_ms: Optional[int]
    alert_sent: bool
    call_triggered: bool
    created_at: datetime

    class Config:
        from_attributes = True
