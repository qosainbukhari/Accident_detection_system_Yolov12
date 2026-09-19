"""
alert_service.py – Emergency Email Alert System
Uses Gmail SMTP with App Password (or any SMTP provider)
"""
import os
import smtplib
import logging
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
from datetime import UTC, datetime
from sqlalchemy.orm import Session

from app.config import settings
from app.db import crud
from app.db.database import SessionLocal

logger = logging.getLogger(__name__)

def maybe_send_alert(
    event_id: int,
    detected_class: str,
    confidence: float,
    filename: str,
    db: Session | None = None,
    image_path: str | None = None,
) -> None:
    """
    Send email for any detected accident class.

    The only class we ignore is `no_detection`, which never reaches this path
    in normal detection flow.
    """
    owns_session = db is None
    db = db or SessionLocal()
    try:
        _send_email(event_id, detected_class, confidence, filename, db, image_path=image_path)
    finally:
        if owns_session:
            db.close()


def _send_email(
    event_id: int,
    cls: str,
    conf: float,
    filename: str,
    db: Session,
    image_path: str | None = None,
) -> str:
    smtp_user = (settings.SMTP_USER or "").strip()
    smtp_password = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()
    alert_email_to = (settings.ALERT_EMAIL_TO or "").strip()

    if not smtp_user or not smtp_password or not alert_email_to:
        logger.info("SMTP credentials are not configured; email alert skipped")
        return "skipped"

    safe_class = escape(cls.upper())
    safe_filename = escape(filename or "unknown")
    severity = "CRITICAL" if cls == "fire" else "HIGH"
    subject = f"[EMERGENCY ALERT] {safe_class} Accident Detected - Event #{event_id}"
    conf_pct = round(conf * 100, 1)
    timestamp = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")

    image_block = ""
    image_cid = None
    if image_path and os.path.exists(image_path):
        image_cid = "accident_image"
        image_block = (
            '<div style="margin:20px 0; text-align:center;">'
            f'<img src="cid:{image_cid}" alt="Accident image" '
            'style="max-width:100%;border-radius:8px;border:1px solid #e5e7eb;" />'
            '</div>'
        )

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
        <div style="background:{'#dc2626' if cls == 'fire' else '#b91c1c'};padding:24px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">🚨 EMERGENCY ALERT – {severity}</h1>
        </div>

        <div style="padding:28px;">
          <p style="font-size:16px;color:#333;">
            An <strong>{safe_class}</strong> accident has been detected by the AI surveillance system.
            Immediate response may be required.
          </p>

          {image_block}

          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr style="background:#fee2e2;">
              <td style="padding:12px;font-weight:bold;color:#991b1b;border:1px solid #fca5a5;">Detection Class</td>
              <td style="padding:12px;color:#991b1b;font-weight:bold;border:1px solid #fca5a5;">{safe_class}</td>
            </tr>
            <tr>
              <td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb;">Confidence</td>
              <td style="padding:12px;border:1px solid #e5e7eb;">{conf_pct}%</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb;">Event ID</td>
              <td style="padding:12px;border:1px solid #e5e7eb;">#{event_id}</td>
            </tr>
            <tr>
              <td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb;">File</td>
              <td style="padding:12px;border:1px solid #e5e7eb;">{safe_filename}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb;">Timestamp</td>
              <td style="padding:12px;border:1px solid #e5e7eb;">{timestamp}</td>
            </tr>
            <tr>
              <td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb;">Severity</td>
              <td style="padding:12px;border:1px solid #e5e7eb;color:{'#dc2626' if severity == 'CRITICAL' else '#b91c1c'};font-weight:bold;">{severity}</td>
            </tr>
          </table>

          <div style="text-align:center;margin:24px 0;">
            <a href="http://localhost:5173/history"
               style="background:#dc2626;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
              View Detection Report
            </a>
          </div>

          <p style="color:#6b7280;font-size:13px;">
            This is an automated emergency notification from the AI Accident Detection System.
            Do not reply to this email.
          </p>
        </div>

        <div style="background:#f3f4f6;padding:14px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            AI Accident Detection &amp; Emergency Response System v2.0
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("related")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = alert_email_to
    msg.attach(MIMEText(html, "html"))

    if image_path and os.path.exists(image_path):
      with open(image_path, "rb") as img_file:
        ext = os.path.splitext(image_path)[1].lower().lstrip('.')
        image_type = {"png": "png", "jpg": "jpeg", "jpeg": "jpeg", "webp": "webp"}.get(ext, "jpeg")
        image = MIMEImage(img_file.read(), _subtype=image_type)
        image.add_header("Content-ID", f"<{image_cid}>")
        image.add_header("Content-Disposition", "inline", filename=os.path.basename(image_path))
        msg.attach(image)

    status = "failed"
    error = None

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as srv:
            srv.ehlo()
            srv.starttls()
            srv.login(smtp_user, smtp_password)
            srv.sendmail(smtp_user, alert_email_to, msg.as_string())
        status = "sent"
        logger.info("Email alert sent for event %s", event_id)

        if db:
            crud.mark_alert_sent(db, event_id)

    except Exception as e:
        error = str(e)
        logger.warning("Email alert failed for event %s: %s", event_id, e)

    finally:
        if db:
            try:
                crud.create_alert_log(
                    db=db,
                    detection_id=event_id,
                    recipient=alert_email_to,
                    subject=subject,
                    body=html,
                    status=status,
                    error=error,
                )
            except Exception as log_err:
                logger.warning("Failed to persist email alert status: %s", log_err)

        return status
