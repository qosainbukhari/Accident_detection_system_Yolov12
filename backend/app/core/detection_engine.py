"""
detection_engine.py – YOLOv12 Image & Video Inference Engine (Singleton)
"""
import cv2
import time
import numpy as np
from pathlib import Path
from ultralytics import YOLO
from app.config import settings

# ── Constants ─────────────────────────────────────────────────────────────
CLASS_NAMES  = ["fire", "moderate", "severe"]
ALERT_NEEDED = {"fire", "moderate", "severe"}

# BGR colours (OpenCV)
CLASS_COLORS = {
    "fire":         (30,  30,  220),   # red
    "moderate":     (30, 200, 220),    # yellow
    "severe":       (20,  20,  150),   # dark red
    "no_detection": (200, 200, 200),   # grey
}


class DetectionEngine:
    """
    Singleton wrapper around the YOLOv12 model.
    Call DetectionEngine.get_instance() everywhere.
    """
    _instance = None

    @classmethod
    def get_instance(cls) -> "DetectionEngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        model_path = Path(settings.MODEL_PATH)
        self.model = YOLO(model_path) if model_path.is_file() else None
        self.conf  = settings.DETECTION_CONFIDENCE
        self.iou   = settings.IOU_THRESHOLD
        self.sz    = settings.IMG_SIZE
        if self.model is None:
            print(f"[Engine] Model not found at {model_path}; inference is disabled.")
        else:
            print(f"[Engine] YOLOv12 loaded: {settings.MODEL_PATH}")

    # ── Core prediction ──────────────────────────────────────────────────
    def predict_frame(self, frame: np.ndarray) -> dict:
        """
        Run inference on a single BGR frame.

        Returns:
            detected_class  : top class label (str)
            confidence      : float 0–1
            bounding_boxes  : list of box dicts
            annotated_frame : BGR ndarray with drawn boxes
            processing_ms   : int
            alert_required  : bool
        """
        t0 = time.time()
        if self.model is None:
            return {
                "detected_class": "no_detection",
                "confidence": 0.0,
                "bounding_boxes": [],
                "annotated_frame": frame.copy(),
                "processing_ms": int((time.time() - t0) * 1000),
                "alert_required": False,
            }

        results = self.model(
            frame,
            conf=self.conf,
            iou=self.iou,
            imgsz=self.sz,
            verbose=False
        )[0]
        ms = int((time.time() - t0) * 1000)

        boxes    = []
        top_cls  = "no_detection"
        top_conf = 0.0

        for box in results.boxes:
            cls_id = int(box.cls[0])
            conf   = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            label = CLASS_NAMES[cls_id] if 0 <= cls_id < len(CLASS_NAMES) else "unknown"

            boxes.append({
                "class":      label,
                "confidence": round(conf, 4),
                "x1": x1, "y1": y1,
                "x2": x2, "y2": y2,
            })

            if conf > top_conf:
                top_cls, top_conf = label, conf

        annotated = self._annotate(frame.copy(), boxes)

        return {
            "detected_class":  top_cls,
            "confidence":      round(top_conf, 4),
            "bounding_boxes":  boxes,
            "annotated_frame": annotated,
            "processing_ms":   ms,
            "alert_required":  top_cls in ALERT_NEEDED,
        }

    # ── Annotation helper ────────────────────────────────────────────────
    def _annotate(self, frame: np.ndarray, boxes: list) -> np.ndarray:
        for b in boxes:
            color = CLASS_COLORS.get(b["class"], (255, 255, 255))
            cv2.rectangle(frame, (b["x1"], b["y1"]), (b["x2"], b["y2"]), color, 2)

            label = f"{b['class']} {b['confidence']:.2f}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)

            # Label background
            cv2.rectangle(
                frame,
                (b["x1"], b["y1"] - th - 8),
                (b["x1"] + tw, b["y1"]),
                color, -1
            )
            cv2.putText(
                frame, label,
                (b["x1"], b["y1"] - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2
            )
        return frame
