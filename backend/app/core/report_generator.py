"""Professional, printable A4 incident report generation."""
from datetime import datetime, timezone
from html import escape
from pathlib import Path
import uuid
from typing import Any, Optional

from app.config import settings


def generate_whatsapp_report_image(event, report: dict, evidence_path: Optional[str] = None) -> str:
    """Create a compact, professional PNG report suitable for WhatsApp media."""
    from PIL import Image, ImageDraw, ImageFont

    output_dir = Path(settings.REPORTS_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    # Served publicly so the WhatsApp provider can fetch it; the random suffix
    # keeps other incidents' images from being enumerated by ID.
    output_path = output_dir / f"whatsapp-incident-{event.id}-{uuid.uuid4().hex}.png"
    width, height = 1200, 1500
    canvas = Image.new("RGB", (width, height), "#f8fafc")
    draw = ImageDraw.Draw(canvas)

    def font(size, bold=False):
        path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            return ImageFont.load_default()

    title_font, section_font, body_font, small_font = font(42, True), font(25, True), font(23), font(18)
    level = str(_value(report, "incident_level", "HIGH")).upper()
    level_color = {"CRITICAL": "#b91c1c", "HIGH": "#c2410c", "MODERATE": "#a16207"}.get(level, "#475569")
    detected_value = _value(event, "detected_class", "unknown")
    detected = str(getattr(detected_value, "value", detected_value)).upper()
    confidence = float(_value(event, "confidence", 0) or 0)

    draw.rectangle((0, 0, width, 185), fill="#0f172a")
    draw.rectangle((0, 175, width, 185), fill=level_color)
    draw.text((55, 35), "INCIDENT RESPONSE ALERT", fill="#ffffff", font=title_font)
    draw.text((58, 105), f"AI ACCIDENT DETECTION  ·  INC-{event.id:06d}", fill="#cbd5e1", font=small_font)
    draw.rounded_rectangle((930, 55, 1145, 130), radius=18, fill=level_color)
    draw.text((965, 77), level, fill="#ffffff", font=section_font)

    y = 225
    facts = [
        ("INCIDENT", f"{detected}  ·  {confidence:.0%} confidence"),
        ("LOCATION", str(_value(event, "location", "Not provided"))),
        ("STATUS", str(_value(event, "incident_status", "OPEN")).upper()),
    ]
    for label, value in facts:
        draw.text((60, y), label, fill="#64748b", font=small_font)
        draw.text((60, y + 27), value[:62], fill="#0f172a", font=body_font)
        y += 78

    draw.line((55, y, width - 55, y), fill="#cbd5e1", width=2)
    y += 28
    draw.text((60, y), "SITUATION SUMMARY", fill=level_color, font=section_font)
    y += 42
    summary = str(_value(report, "situation_summary", "Assessment pending."))
    for line in _wrap_text(summary, 72):
        draw.text((60, y), line, fill="#1e293b", font=body_font)
        y += 31
    y += 18
    sections = [
        ("RECOMMENDED RESPONSE", _value(report, "recommended_services", [])),
        ("IMMEDIATE ACTIONS", _value(report, "immediate_actions", [])),
    ]
    for heading, items in sections:
        draw.text((60, y), heading, fill=level_color, font=section_font)
        y += 40
        values = items if isinstance(items, list) else []
        for index, item in enumerate(values[:4], 1):
            prefix = f"{index}." if heading == "IMMEDIATE ACTIONS" else "•"
            for line_index, line in enumerate(_wrap_text(str(item), 67)):
                draw.text((65, y), f"{prefix} {line}" if line_index == 0 else f"   {line}", fill="#1e293b", font=body_font)
                y += 29
        y += 14

    if evidence_path and Path(evidence_path).is_file():
        try:
            evidence = Image.open(evidence_path).convert("RGB")
            evidence.thumbnail((1080, 300))
            y = min(y, height - evidence.height - 85)
            draw.rounded_rectangle((55, y - 8, 1145, y + evidence.height + 12), radius=12, fill="#e2e8f0")
            canvas.paste(evidence, ((width - evidence.width) // 2, y))
        except (OSError, ValueError):
            pass
    draw.text((60, height - 42), "Automated report — verify details before operational action.", fill="#64748b", font=small_font)
    canvas.save(output_path, "PNG", optimize=True)
    return str(output_path)


def _wrap_text(value: str, max_chars: int) -> list[str]:
    words, lines, current = value.split(), [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > max_chars:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or [""]


def _value(source: Any, key: str, default: Any = None) -> Any:
    if isinstance(source, dict):
        return source.get(key, default)
    return getattr(source, key, default)


def _text(value: Any, default: str = "Not available") -> str:
    rendered = str(value).strip() if value is not None else ""
    return escape(rendered or default)


def _list(items: Any) -> str:
    values = items if isinstance(items, list) else []
    if not values:
        return "<i>Not specified</i>"
    return "<br/>".join(f"• {_text(item)}" for item in values)


def _footer(canvas, document) -> None:
    from reportlab.lib import colors
    from reportlab.lib.units import mm

    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
    canvas.line(18 * mm, 13 * mm, 192 * mm, 13 * mm)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(18 * mm, 8 * mm, "AI Accident Detection System · Confidential operational record")
    canvas.drawRightString(192 * mm, 8 * mm, f"Page {document.page}")
    canvas.restoreState()


def generate_incident_pdf(event, report, image_path: Optional[str] = None) -> str:
    """Create a formal A4 incident report and return its filesystem path."""
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    output_dir = Path(settings.REPORTS_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"incident-{event.id}.pdf"
    styles = getSampleStyleSheet()
    title = ParagraphStyle("IncidentTitle", parent=styles["Title"], alignment=TA_CENTER,
                           textColor=colors.HexColor("#7f1d1d"), fontSize=20, leading=24)
    subtitle = ParagraphStyle("IncidentSubtitle", parent=styles["Normal"], alignment=TA_CENTER,
                              textColor=colors.HexColor("#475569"), fontSize=9, leading=13)
    section = ParagraphStyle("Section", parent=styles["Heading2"], textColor=colors.HexColor("#991b1b"),
                             fontSize=12, leading=16, spaceBefore=7, spaceAfter=5)
    body = ParagraphStyle("ReportBody", parent=styles["BodyText"], fontSize=9, leading=13)
    label = ParagraphStyle("TableLabel", parent=body, textColor=colors.HexColor("#334155"), fontName="Helvetica-Bold")

    created = _value(event, "created_at", "Unknown")
    detected_class = _value(event, "detected_class", "unknown")
    detected_class = getattr(detected_class, "value", detected_class)
    sent = bool(_value(report, "whatsapp_sent", False))
    sid = _value(report, "whatsapp_sid")
    error = _value(report, "whatsapp_error")
    if sent and str(sid or "").startswith("mock-"):
        notification = "Simulation only — no WhatsApp recipient was contacted."
    elif sent:
        notification = f"Submitted to WhatsApp provider for delivery (message ID: {_text(sid)}). Recipient delivery must be verified."
    else:
        notification = f"Not submitted: {_text(error, 'dispatch was not completed')}"

    values = [
        ("Incident reference", f"INC-{event.id:06d}"),
        ("Detection date and time", created),
        ("Reported location", _value(event, "location", "Unknown")),
        ("Incident classification", str(detected_class).upper()),
        ("Assessment level", _value(report, "incident_level", "PENDING")),
        ("Model confidence", f"{float(_value(event, 'confidence', 0) or 0):.1%}"),
        ("Incident status", _value(event, "incident_status", "open")),
    ]
    table_data = [[Paragraph(_text(key), label), Paragraph(_text(value), body)] for key, value in values]
    table = Table(table_data, colWidths=[50 * mm, 122 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#fef2f2")),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story = [
        Paragraph("AI Accident Detection System", title),
        Paragraph("FORMAL INCIDENT ASSESSMENT REPORT", subtitle),
        Spacer(1, 4),
        Paragraph(f"Generated {generated_at} · Incident reference INC-{event.id:06d}", subtitle),
        Spacer(1, 12),
        table,
        Spacer(1, 8),
        Paragraph("Executive assessment", section),
        Paragraph(_text(_value(report, "situation_summary"), "Assessment pending."), body),
        Spacer(1, 5),
        Paragraph(f"<b>Casualty risk:</b> {_text(_value(report, 'casualty_risk'), 'unknown')}", body),
        Paragraph("Hazards observed", section),
        Paragraph(_list(_value(report, "visible_hazards")), body),
        Paragraph("Recommended emergency response", section),
        Paragraph(f"<b>Services:</b><br/>{_list(_value(report, 'recommended_services'))}", body),
        Spacer(1, 4),
        Paragraph(f"<b>Immediate actions:</b><br/>{_list(_value(report, 'immediate_actions'))}", body),
        Paragraph("Notification record", section),
        Paragraph(notification, body),
    ]
    if image_path and Path(image_path).is_file():
        evidence = Image(str(image_path), width=160 * mm, height=88 * mm, kind="proportional")
        story.extend([Paragraph("Annotated visual evidence", section), KeepTogether([evidence, Spacer(1, 4)])])
    story.extend([
        Paragraph("Operational notice", section),
        Paragraph("This automated assessment supports emergency triage and does not replace on-scene verification or instructions from authorised emergency services.", body),
    ])
    SimpleDocTemplate(str(output_path), pagesize=A4, rightMargin=18 * mm,
                      leftMargin=18 * mm, topMargin=16 * mm, bottomMargin=20 * mm,
                      title=f"Incident report INC-{event.id:06d}", author="AI Accident Detection System").build(
        story, onFirstPage=_footer, onLaterPages=_footer
    )
    return str(output_path)
