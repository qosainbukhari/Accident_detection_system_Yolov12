"""
video_processor.py – Extract frames → detect → reconstruct annotated video
"""
import cv2
import os
import uuid
from app.core.detection_engine import DetectionEngine
from app.config import settings


class VideoProcessor:

    def __init__(self):
        self.engine = DetectionEngine.get_instance()

    def process(self, input_path: str, output_dir: str) -> dict:
        """
        Process a video file frame-by-frame through YOLOv12.

        Returns a result dict with:
          output_path, output_name, snapshot_path,
          total_frames, processed_frames,
          dominant_class, class_stats,
          avg_confidence, fps_processed, alert_required
        """
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {input_path}")

        fps        = cap.get(cv2.CAP_PROP_FPS) or 25.0
        width      = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height     = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total      = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        out_name   = f"processed_{uuid.uuid4().hex[:8]}.mp4"
        out_path   = os.path.join(output_dir, out_name)
        snap_path  = None

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(out_path, fourcc, fps, (width, height))
        if not writer.isOpened():
            cap.release()
            writer.release()
            raise ValueError(f"Cannot create output video: {out_path}")

        # Per-class frame counters
        stats: dict = {
            "fire": 0, "moderate": 0,
            "severe": 0, "no_detection": 0
        }

        conf_sum    = 0.0
        proc_frames = 0          # frames where conf > 0
        best_snap   = None
        best_conf   = 0.0
        frame_idx   = 0
        stride      = 2          # run inference every 2nd frame for speed

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                frame_idx += 1

                if frame_idx % stride == 0:
                    result    = self.engine.predict_frame(frame)
                    annotated = result["annotated_frame"]
                    cls       = result["detected_class"]
                    conf      = result["confidence"]

                    stats[cls] = stats.get(cls, 0) + 1

                    if conf > 0:
                        conf_sum    += conf
                        proc_frames += 1

                    if conf > best_conf:
                        best_conf = conf
                        best_snap = annotated.copy()

                    writer.write(annotated)
                else:
                    writer.write(frame)
        except Exception:
            if os.path.exists(out_path):
                try:
                    os.remove(out_path)
                except OSError:
                    pass
            if snap_path and os.path.exists(snap_path):
                try:
                    os.remove(snap_path)
                except OSError:
                    pass
            raise
        finally:
            cap.release()
            writer.release()

        # ── Save best frame as snapshot ───────────────────────────────
        if best_snap is not None:
            snap_name = f"snap_{uuid.uuid4().hex[:8]}.jpg"
            snap_dir  = settings.SNAPSHOTS_DIR
            os.makedirs(snap_dir, exist_ok=True)
            snap_path = os.path.join(snap_dir, snap_name)
            cv2.imwrite(snap_path, best_snap)

        # Dominant class = most frequent (excluding no_detection if possible)
        detection_only = {k: v for k, v in stats.items() if k != "no_detection"}
        dominant = max(
            detection_only if any(detection_only.values()) else stats,
            key=lambda k: stats[k]
        )

        avg_conf = round(conf_sum / proc_frames, 4) if proc_frames else 0.0

        return {
            "output_path":      out_path,
            "output_name":      out_name,
            "snapshot_path":    snap_path,
            "total_frames":     total,
            "processed_frames": frame_idx,
            "dominant_class":   dominant,
            "class_stats":      stats,
            "avg_confidence":   avg_conf,
            "fps_processed":    round(fps / stride, 2),
            "alert_required":   dominant in {"fire", "moderate", "severe"},
        }
