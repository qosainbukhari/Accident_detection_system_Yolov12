"""
call_service.py – Twilio Emergency Voice Call System
"""
from sqlalchemy.orm import Session

from app.config import settings
from app.db import crud


def maybe_trigger_call(event_id: int, detected_class: str, db: Session) -> None:
    """
    Trigger an emergency call for any detected accident class.

    Provider modes:
      - mock: free, logs a simulated call only
      - twilio_trial: real call via Twilio trial account
      - twilio: real call via Twilio paid account
    """
    provider = (settings.CALL_PROVIDER or "mock").strip().lower()
    if provider in {"mock", "free", "simulation"}:
        _log_mock_call(event_id, detected_class, db)
        return

    if provider in {"twilio", "twilio_trial"}:
        make_call(event_id, detected_class, db)
        return

    print(f"[CALL] Unknown CALL_PROVIDER='{settings.CALL_PROVIDER}', falling back to mock mode.")
    _log_mock_call(event_id, detected_class, db)


def _log_mock_call(event_id: int, detected_class: str, db: Session) -> None:
    """Create a zero-cost call log for local development and demos."""
    message = _call_message(detected_class)
    print(f"[CALL] 🧪 Mock call logged for event #{event_id} ({detected_class})")

    if db and event_id:
        try:
            crud.create_call_log(db, {
                "detection_id":    event_id,
                "to_number":       settings.EMERGENCY_CALL_TO or "mock",
                "from_number":     settings.TWILIO_FROM_NUMBER or "mock",
                "twilio_call_sid": None,
                "call_status":     "simulated",
                "call_message":    message,
            })
            crud.mark_call_triggered(db, event_id)
        except Exception as log_err:
            print(f"[CALL] Failed to log mock call: {log_err}")


def make_call(event_id: int, detected_class: str, db: Session) -> None:
    """Initiate Twilio voice call for the given detection event."""

    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        print("[CALL] Twilio credentials not configured, skipping.")
        return

    message = _call_message(detected_class)

    # ── Build inline TwiML ─────────────────────────────────────────────
    twiml = (
        f"<Response>"
        f"<Say voice='alice' loop='3'>{message}</Say>"
        f"<Pause length='1'/>"
        f"</Response>"
    )

    call_sid    = None
    call_status = "failed"

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        call = client.calls.create(
            to     = settings.EMERGENCY_CALL_TO,
            from_  = settings.TWILIO_FROM_NUMBER,
            twiml  = twiml,
        )

        call_sid    = call.sid
        call_status = call.status
        print(f"[CALL] ✅ Initiated: {call.sid} | status: {call.status} | event #{event_id}")

        if db:
            crud.mark_call_triggered(db, event_id)

    except Exception as e:
        print(f"[CALL] ❌ FAILED for event #{event_id}: {e}")

    finally:
        # Always log the call attempt
        if db and event_id:
            try:
                crud.create_call_log(db, {
                    "detection_id":    event_id,
                    "to_number":       settings.EMERGENCY_CALL_TO,
                    "from_number":     settings.TWILIO_FROM_NUMBER,
                    "twilio_call_sid": call_sid,
                    "call_status":     call_status,
                    "call_message":    message,
                })
            except Exception as log_err:
                print(f"[CALL] Failed to log call: {log_err}")


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
