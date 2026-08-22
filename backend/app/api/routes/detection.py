"""
routes/detection.py – /detection/image, /detection/video, /detection/history
"""
import os
import uuid
from pathlib import Path
import numpy as np
import cv2
import aiofiles

from fastapi import (
    APIRouter, UploadFile, File, Depends,
    HTTPException, BackgroundTasks, Query
)
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import crud
from app.core.detection_engine import DetectionEngine
from app.core.video_processor import VideoProcessor
from app.core.alert_service import maybe_send_alert
from app.api.deps import get_current_user, require_admin
from app.config import settings

router = APIRouter()

ALLOWED_IMG = {"jpg", "jpeg", "png", "webp"}
ALLOWED_VID = {"mp4", "avi", "mov", "mkv"}


def _check_file(filename: str, allowed: set) -> str:
    """Validate file extension. Returns the extension."""
    if not filename or "." not in filename:
        raise HTTPException(400, "File has no extension")
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported type: .{ext}. Allowed: {sorted(allowed)}")
    return ext


async def _save_upload(file: UploadFile, destination: str, max_bytes: int) -> None:
    written = 0
    try:
        async with aiofiles.open(destination, "wb") as output:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(413, f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit")
                await output.write(chunk)
    except HTTPException:
        try:
            os.remove(destination)
        except FileNotFoundError:
            pass
        raise


# ─────────────────────────────────────────────────────────────────
# POST /detection/image
# ─────────────────────────────────────────────────────────────────
@router.post("/image")
async def detect_image(
    bg: BackgroundTasks,
    file: UploadFile = File(...),
    location: str = "Unknown",
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Upload an image → YOLOv12 inference → return annotated result.
    Triggers an email alert for detected accident classes.
    """
    _check_file(file.filename, ALLOWED_IMG)

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(413, f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit")

    # Decode image
    nparr = np.frombuffer(content, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(400, "Cannot decode image. File may be corrupt or unsupported.")

    # Run inference
    engine = DetectionEngine.get_instance()
    result = engine.predict_frame(frame)

    # Save processed (annotated) image
    proc_name = f"img_{uuid.uuid4().hex[:8]}.jpg"
    proc_path = os.path.join(settings.PROCESSED_DIR, proc_name)
    os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
    cv2.imwrite(proc_path, result["annotated_frame"])

    # Save to DB
    event = crud.create_detection_event(db, {
        "user_id":           user.id,
        "media_type":        "image",
        "original_filename": file.filename,
        "processed_filename": proc_name,
        "detected_class":    result["detected_class"],
        "confidence":        result["confidence"],
        "bounding_boxes":    result["bounding_boxes"],
        "snapshot_path":     proc_path,
        "processing_ms":     result["processing_ms"],
    })

    # Background: email + call alerts
    if result["alert_required"]:
        bg.add_task(
            maybe_send_alert,
            event.id,
            result["detected_class"],
            result["confidence"],
            file.filename,
            db,
            image_path=proc_path,
        )

    return {
        "event_id":        event.id,
        "detected_class":  result["detected_class"],
        "confidence":      result["confidence"],
        "bounding_boxes":  result["bounding_boxes"],
        "processed_url":   f"/static/processed/{proc_name}",
        "processing_ms":   result["processing_ms"],
        "alert_triggered": result["alert_required"],
    }


# ─────────────────────────────────────────────────────────────────
# POST /detection/video
# ─────────────────────────────────────────────────────────────────
@router.post("/video")
async def detect_video(
    bg: BackgroundTasks,
    file: UploadFile = File(...),
    location: str = "Unknown",
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Upload a video → frame-by-frame YOLOv12 inference → return processed video.
    """
    _check_file(file.filename, ALLOWED_VID)

    # Save uploaded video
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_name = Path(file.filename or "video").name.replace("\x00", "")
    upload_name = f"vid_{uuid.uuid4().hex[:8]}_{safe_name}"
    upload_path = os.path.join(settings.UPLOAD_DIR, upload_name)
    await _save_upload(file, upload_path, settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024)

    # Process video
    processor = VideoProcessor()
    os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
    try:
        result = processor.process(upload_path, settings.PROCESSED_DIR)
    except ValueError as exc:
        try:
            os.remove(upload_path)
        except FileNotFoundError:
            pass
        raise HTTPException(400, str(exc))
    except Exception as exc:
        try:
            os.remove(upload_path)
        except FileNotFoundError:
            pass
        raise HTTPException(500, f"Video processing failed: {exc}")

    # Save to DB
    event = crud.create_detection_event(db, {
        "user_id":           user.id,
        "media_type":        "video",
        "original_filename": file.filename,
        "processed_filename": result["output_name"],
        "detected_class":    result["dominant_class"],
        "confidence":        result["avg_confidence"],
        "total_frames":      result["total_frames"],
        "detected_frames":   result["processed_frames"],
        "dominant_class":    result["dominant_class"],
        "snapshot_path":     result["snapshot_path"],
        "processing_ms":     0,
    })

    # Save video-specific stats
    crud.create_video_log(db, {
        "detection_id":        event.id,
        "total_frames":        result["total_frames"],
        "processed_frames":    result["processed_frames"],
        "fire_frames":         result["class_stats"].get("fire", 0),
        "moderate_frames":     result["class_stats"].get("moderate", 0),
        "severe_frames":       result["class_stats"].get("severe", 0),
        "no_detection_frames": result["class_stats"].get("no_detection", 0),
        "avg_confidence":      result["avg_confidence"],
        "fps_processed":       result["fps_processed"],
        "output_path":         result["output_path"],
    })

    # Alerts
    if result["alert_required"]:
        bg.add_task(
            maybe_send_alert,
            event.id,
            result["dominant_class"],
            result["avg_confidence"],
            file.filename,
            db,
            image_path=result.get("snapshot_path"),
        )

    snap_url = None
    if result["snapshot_path"]:
        snap_url = f"/static/snapshots/{os.path.basename(result['snapshot_path'])}"

    return {
        "event_id":            event.id,
        "dominant_class":      result["dominant_class"],
        "avg_confidence":      result["avg_confidence"],
        "total_frames":        result["total_frames"],
        "class_stats":         result["class_stats"],
        "processed_video_url": f"/static/processed/{result['output_name']}",
        "snapshot_url":        snap_url,
        "alert_triggered":     result["alert_required"],
    }


# ─────────────────────────────────────────────────────────────────
# GET /detection/history
# ─────────────────────────────────────────────────────────────────
@router.get("/history")
def get_history(
    skip:  int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Paginated list of all detection events."""
    owner_id = None if user.role == "admin" else user.id
    events = crud.get_detection_events(db, skip=skip, limit=limit, user_id=owner_id)
    return events


# ─────────────────────────────────────────────────────────────────
# GET /detection/history/{id}
# ─────────────────────────────────────────────────────────────────
@router.get("/history/{event_id}")
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Single detection event detail."""
    owner_id = None if user.role == "admin" else user.id
    event = crud.get_detection_event(db, event_id, user_id=owner_id)
    if not event:
        raise HTTPException(404, f"Event #{event_id} not found")
    return event


# ─────────────────────────────────────────────────────────────────
# DELETE /detection/history/{id}
# ─────────────────────────────────────────────────────────────────
@router.delete("/history/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Admin only – delete a detection record."""
    deleted = crud.delete_detection_event(db, event_id)
    if not deleted:
        raise HTTPException(404, f"Event #{event_id} not found")
