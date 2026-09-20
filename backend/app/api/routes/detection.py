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
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import crud
from app.core.detection_engine import DetectionEngine
from app.core.video_jobs import create_job, get_job, process_job
from app.core.alert_service import maybe_send_alert
from app.core.emergency_agent import run_emergency_agent
from app.api.deps import get_current_user, require_admin
from app.config import settings

router = APIRouter()

ALLOWED_IMG = {"jpg", "jpeg", "png", "webp"}
ALLOWED_VID = {"mp4", "avi", "mov", "mkv"}
IMAGE_MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
VIDEO_MIME = {"mp4": "video/mp4", "avi": "video/x-msvideo", "mov": "video/quicktime", "mkv": "video/x-matroska"}


def _serialise_event(event) -> dict:
    data = {
        "id": event.id,
        "user_id": event.user_id,
        "media_type": event.media_type,
        "original_filename": event.original_filename,
        "processed_filename": event.processed_filename,
        "detected_class": str(getattr(event.detected_class, "value", event.detected_class)),
        "confidence": event.confidence,
        "bounding_boxes": event.bounding_boxes,
        "snapshot_path": event.snapshot_path,
        "total_frames": event.total_frames,
        "detected_frames": event.detected_frames,
        "dominant_class": event.dominant_class,
        "processing_ms": event.processing_ms,
        "alert_sent": event.alert_sent,
        "call_triggered": event.call_triggered,
        "whatsapp_sent": event.whatsapp_sent,
        "incident_status": event.incident_status,
        "location": event.location,
        "created_at": event.created_at,
        "agent_report": None,
    }
    report = getattr(event, "agent_report", None)
    if report:
        data["agent_report"] = {
            "id": report.id,
            "incident_level": report.incident_level,
            "situation_summary": report.situation_summary,
            "casualty_risk": report.casualty_risk,
            "recommended_services": report.recommended_services,
            "whatsapp_sent": report.whatsapp_sent,
        }
    return data


def _check_file(filename: str, allowed: set, content_type: str | None = None) -> str:
    """Validate file extension. Returns the extension."""
    if not filename or "." not in filename:
        raise HTTPException(400, "File has no extension")
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported type: .{ext}. Allowed: {sorted(allowed)}")
    if content_type and content_type != "application/octet-stream":
        mime_map = IMAGE_MIME if allowed == ALLOWED_IMG else VIDEO_MIME
        if mime_map.get(ext) and content_type.lower() != mime_map[ext]:
            raise HTTPException(400, "File content type does not match its extension")
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
    except OSError as exc:
        try:
            os.remove(destination)
        except FileNotFoundError:
            pass
        raise HTTPException(500, "Unable to store uploaded file") from exc


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
    _check_file(file.filename, ALLOWED_IMG, file.content_type)

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(413, f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit")

    # Decode image
    nparr = np.frombuffer(content, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(400, "Cannot decode image. File may be corrupt or unsupported.")
    height, width = frame.shape[:2]
    if height * width > settings.MAX_IMAGE_PIXELS:
        raise HTTPException(413, "Image dimensions exceed the configured pixel limit")

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
        "location":          location[:255],
        "processing_ms":     result["processing_ms"],
    })

    # Background: email + call alerts
    if result["alert_required"]:
        if settings.AGENT_ENABLED:
            crud.create_pending_agent_report(db, event.id)
        bg.add_task(
            maybe_send_alert,
            event.id,
            result["detected_class"],
            result["confidence"],
            file.filename,
            image_path=proc_path,
        )
        bg.add_task(
            run_emergency_agent,
            event.id,
            result["detected_class"],
            result["confidence"],
            proc_path,
            "image",
            file.filename or "",
        )

    return {
        "event_id":        event.id,
        "detected_class":  result["detected_class"],
        "confidence":      result["confidence"],
        "bounding_boxes":  result["bounding_boxes"],
        "processed_url":   f"/static/processed/{proc_name}",
        "processing_ms":   result["processing_ms"],
        "alert_triggered": result["alert_required"],
        "agent_pending":   bool(result["alert_required"] and settings.AGENT_ENABLED),
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
    _check_file(file.filename, ALLOWED_VID, file.content_type)

    # Save uploaded video
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = Path(file.filename or "video").suffix.lower()
    upload_name = f"vid_{uuid.uuid4().hex}{ext}"
    upload_path = os.path.join(settings.UPLOAD_DIR, upload_name)
    await _save_upload(file, upload_path, settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024)

    # Reject corrupt containers synchronously so clients receive a useful 400
    # instead of a queued job that can only fail later in the background.
    probe = cv2.VideoCapture(upload_path)
    valid_video = probe.isOpened()
    if valid_video:
        valid_video = int(probe.get(cv2.CAP_PROP_FRAME_COUNT) or 0) > 0
    probe.release()
    if not valid_video:
        try:
            os.remove(upload_path)
        except FileNotFoundError:
            pass
        raise HTTPException(400, "Cannot open video. File may be corrupt or unsupported.")

    # Queue the full frame-by-frame process. The client polls the job endpoint
    # and receives true processing progress instead of waiting on this request.
    os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
    job_id = create_job(user.id, file.filename or upload_name, upload_path, location)
    bg.add_task(process_job, job_id)
    return {"job_id": job_id, "status": "queued", "progress": 0,
            "stage": "Queued for frame-by-frame analysis"}


@router.get("/video/jobs/{job_id}")
def get_video_job(job_id: str, user=Depends(get_current_user)):
    """Return live frame-processing progress and final video result."""
    job = get_job(job_id)
    if not job or (user.role != "admin" and job["user_id"] != user.id):
        raise HTTPException(404, "Video processing job not found")
    return {
        key: job.get(key) for key in (
            "id", "status", "stage", "progress", "processed_frames", "total_frames", "result", "error"
        )
    }


@router.get("/video/jobs/{job_id}/stream")
def stream_video_job(job_id: str):
    """Stream YOLO-annotated frames while a video job is processing."""
    if not get_job(job_id):
        raise HTTPException(404, "Video processing job not found")
    from app.core.video_jobs import stream_job
    return StreamingResponse(stream_job(job_id), media_type="multipart/x-mixed-replace; boundary=frame")


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
    return [_serialise_event(event) for event in events]


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
    return _serialise_event(event)


@router.patch("/history/{event_id}/status")
def set_incident_status(event_id: int, status: str = Query(...),
                        db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Allow an authenticated owner/admin to acknowledge or resolve an incident."""
    owner_id = None if user.role == "admin" else user.id
    event = crud.get_detection_event(db, event_id, user_id=owner_id)
    if not event:
        raise HTTPException(404, "Event not found")
    updated = crud.update_incident_status(db, event_id, status)
    if not updated:
        raise HTTPException(422, "Invalid incident status")
    crud.create_audit_log(db, event_id, "incident_status_changed", actor=user.username,
                          details={"status": status})
    return _serialise_event(updated)


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
