"""In-memory background jobs for real-time video processing progress."""
from __future__ import annotations

import logging
import os
import threading
import time
import uuid
from typing import Any
import cv2

from app.config import settings
from app.core.alert_service import maybe_send_alert
from app.core.emergency_agent import run_emergency_agent
from app.core.video_processor import VideoProcessor
from app.db import crud
from app.db.database import SessionLocal

logger = logging.getLogger(__name__)
_jobs: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()
# Finished jobs stay pollable for a while, then are dropped so the in-memory
# store (which holds the latest JPEG frame per job) does not grow forever.
JOB_RETENTION_SECONDS = 3600


def _prune_finished_jobs() -> None:
    cutoff = time.time() - JOB_RETENTION_SECONDS
    with _lock:
        expired = [job_id for job_id, job in _jobs.items()
                   if job["status"] in {"completed", "failed"} and job.get("finished_at", 0) < cutoff]
        for job_id in expired:
            del _jobs[job_id]


def create_job(user_id: int, filename: str, upload_path: str, location: str) -> str:
    _prune_finished_jobs()
    job_id = uuid.uuid4().hex
    with _lock:
        _jobs[job_id] = {
            "id": job_id, "user_id": user_id, "filename": filename,
            "upload_path": upload_path, "location": location, "status": "queued",
            "stage": "Queued for frame-by-frame analysis", "progress": 0,
            "processed_frames": 0, "total_frames": 0, "result": None, "error": None,
            "created_at": time.time(),
            "latest_frame": None,
        }
    return job_id


def get_job(job_id: str) -> dict[str, Any] | None:
    with _lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def _update(job_id: str, **changes: Any) -> None:
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(changes)


def process_job(job_id: str) -> None:
    """Process every video frame in a worker thread and publish live progress."""
    job = get_job(job_id)
    if not job:
        return
    db = SessionLocal()
    try:
        _update(job_id, status="processing", stage="Loading video and model…", progress=1)

        def on_progress(processed: int, total: int) -> None:
            progress = min(95, max(2, round(processed / total * 95))) if total else 2
            _update(job_id, stage="Analyzing video frames with YOLOv12…", progress=progress,
                    processed_frames=processed, total_frames=total)

        def on_frame(frame: object) -> None:
            ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
            if ok:
                _update(job_id, latest_frame=encoded.tobytes())

        result = VideoProcessor().process(job["upload_path"], settings.PROCESSED_DIR,
                                         on_progress, on_frame)
        _update(job_id, stage="Saving final incident result…", progress=97)
        event = crud.create_detection_event(db, {
            "user_id": job["user_id"], "media_type": "video", "original_filename": job["filename"],
            "processed_filename": result["output_name"], "detected_class": result["dominant_class"],
            "confidence": result["avg_confidence"], "total_frames": result["total_frames"],
            "detected_frames": result["detected_frames"], "dominant_class": result["dominant_class"],
            "snapshot_path": result["snapshot_path"], "location": job["location"][:255], "processing_ms": 0,
        })
        crud.create_video_log(db, {
            "detection_id": event.id, "total_frames": result["total_frames"],
            "processed_frames": result["processed_frames"], "fire_frames": result["class_stats"].get("fire", 0),
            "moderate_frames": result["class_stats"].get("moderate", 0),
            "severe_frames": result["class_stats"].get("severe", 0),
            "no_detection_frames": result["class_stats"].get("no_detection", 0),
            "avg_confidence": result["avg_confidence"], "fps_processed": result["fps_processed"],
            "output_path": result["output_path"],
        })
        if result["alert_required"]:
            if settings.AGENT_ENABLED:
                crud.create_pending_agent_report(db, event.id)
            maybe_send_alert(event.id, result["dominant_class"], result["avg_confidence"], job["filename"],
                             image_path=result.get("snapshot_path"))
            run_emergency_agent(event.id, result["dominant_class"], result["avg_confidence"],
                                result.get("snapshot_path"), "video", job["filename"])
        snapshot_url = (f"/static/snapshots/{os.path.basename(result['snapshot_path'])}"
                        if result["snapshot_path"] else None)
        response = {
            "event_id": event.id, "dominant_class": result["dominant_class"],
            "avg_confidence": result["avg_confidence"], "total_frames": result["total_frames"],
            "class_stats": result["class_stats"], "processed_video_url": f"/static/processed/{result['output_name']}",
            "snapshot_url": snapshot_url, "alert_triggered": result["alert_required"],
            "agent_pending": bool(result["alert_required"] and settings.AGENT_ENABLED),
        }
        _update(job_id, status="completed", stage="Complete", progress=100,
                processed_frames=result["processed_frames"], total_frames=result["total_frames"], result=response,
                latest_frame=None, finished_at=time.time())
    except Exception as exc:  # Keep failures available to the polling client.
        logger.exception("Video job %s failed", job_id)
        _update(job_id, status="failed", stage="Processing failed", error=str(exc),
                latest_frame=None, finished_at=time.time())
    finally:
        db.close()
        # The original upload is private and no longer needed once the
        # annotated output and snapshot have been written.
        try:
            os.remove(job["upload_path"])
        except OSError:
            pass


def stream_job(job_id: str):
    """Yield the latest annotated YOLO frame as an MJPEG stream."""
    last_frame = None
    while True:
        job = get_job(job_id)
        if not job:
            return
        frame = job.get("latest_frame")
        if frame and frame != last_frame:
            last_frame = frame
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
        if job["status"] in {"completed", "failed"}:
            return
        time.sleep(0.08)
