"""Local emergency-call audit logging (no external voice provider)."""
import logging
from sqlalchemy.orm import Session

from app.db import crud

logger = logging.getLogger(__name__)


def maybe_trigger_call(event_id: int, detected_class: str, db: Session) -> None:
    """
    Trigger an emergency call for any detected accident class.

    External voice calling has been removed. This records a local simulated
    call entry so existing audit/history screens remain compatible.
    """
    _log_mock_call(event_id, detected_class, db)


def _log_mock_call(event_id: int, detected_class: str, db: Session) -> None:
    """Create a zero-cost call log for local development and demos."""
    message = _call_message(detected_class)
    logger.info("Mock call logged for event %s", event_id)

    if db and event_id:
        try:
            crud.create_call_log(db, {
                "detection_id":    event_id,
                "to_number":       "local-system",
                "from_number":     "local-system",
                "call_sid":        None,
                "call_status":     "simulated",
                "call_message":    message,
            })
            crud.mark_call_triggered(db, event_id)
        except Exception:
            logger.exception("Failed to persist mock call log")


def _call_message(detected_class: str) -> str:
    """Return the spoken emergency message for a detected class."""
    messages = {
        "fire": (
            "Emergency Alert! A vehicle fire has been detected by the AI surveillance system. "
            "Immediate emergency response is required. "
            "Please dispatch fire and ambulance services immediately."
        ),
        "moderate": (
            "Emergency Alert! A moderate road accident has been detected by the AI surveillance system. "
            "Please investigate immediately and dispatch emergency support if needed."
        ),
        "severe": (
            "Emergency Alert! A severe road accident has been detected by the AI surveillance system. "
            "There may be serious injuries or fatalities. "
            "Immediate emergency response is required. Please dispatch ambulance and police."
        ),
    }
    return messages.get(detected_class, "Accident detected. Please respond immediately.")
