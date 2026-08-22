import numpy as np

from app.config import settings
from app.core.detection_engine import ALERT_NEEDED, CLASS_NAMES, DetectionEngine


def test_model_class_contract():
    assert CLASS_NAMES == ["fire", "moderate", "severe"]
    assert ALERT_NEEDED == {"fire", "moderate", "severe"}


def test_prediction_is_safe_without_weights(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "MODEL_PATH", str(tmp_path / "missing.pt"))
    monkeypatch.setattr(DetectionEngine, "_instance", None)

    engine = DetectionEngine.get_instance()
    result = engine.predict_frame(np.zeros((16, 16, 3), dtype=np.uint8))

    assert result["detected_class"] == "no_detection"
    assert result["confidence"] == 0.0
    assert result["bounding_boxes"] == []
    assert result["alert_required"] is False

    monkeypatch.setattr(DetectionEngine, "_instance", None)
