"""
routes/dashboard.py – /dashboard/stats, /dashboard/timeline
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import UTC, datetime, timedelta

from app.db.database import get_db
from app.db.models import DetectionEvent, CallLog, AgentReport
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    KPI dashboard statistics:
      total, today, alerts_sent, calls_made,
      avg_confidence, class_counts
    """
    today = datetime.now(UTC).date()

    owner_filter = DetectionEvent.user_id == user.id if user.role != "admin" else True
    total    = db.query(DetectionEvent).filter(owner_filter).count()
    today_c  = db.query(DetectionEvent).filter(owner_filter).filter(
        func.date(DetectionEvent.created_at) == today
    ).count()
    alerts   = db.query(DetectionEvent).filter(owner_filter).filter(DetectionEvent.alert_sent == True).count()
    calls_query = db.query(CallLog).join(DetectionEvent)
    if user.role != "admin":
        calls_query = calls_query.filter(DetectionEvent.user_id == user.id)
    calls    = calls_query.count()
    avg_conf = db.query(func.avg(DetectionEvent.confidence)).filter(owner_filter).scalar() or 0.0
    reports_query = db.query(AgentReport).join(DetectionEvent)
    if user.role != "admin":
        reports_query = reports_query.filter(DetectionEvent.user_id == user.id)
    ai_reports = reports_query.count()
    whatsapp_sent = reports_query.filter(AgentReport.whatsapp_sent.is_(True)).count()

    by_class = {}
    for cls in ["fire", "moderate", "severe"]:
        by_class[cls] = db.query(DetectionEvent).filter(owner_filter).filter(
            DetectionEvent.detected_class == cls
        ).count()

    # Recent 5 events
    recent = db.query(DetectionEvent).filter(owner_filter).order_by(
        DetectionEvent.created_at.desc()
    ).limit(5).all()

    recent_list = [
        {
            "id":             e.id,
            "detected_class": e.detected_class,
            "confidence":     e.confidence,
            "media_type":     e.media_type,
            "alert_sent":     e.alert_sent,
            "created_at":     str(e.created_at),
        }
        for e in recent
    ]

    return {
        "total":          total,
        "today":          today_c,
        "alerts_sent":    alerts,
        "calls_made":     calls,
        "avg_confidence": round(float(avg_conf) * 100, 1),
        "ai_reports":     ai_reports,
        "whatsapp_sent":  whatsapp_sent,
        "class_counts":   by_class,
        "recent_events":  recent_list,
    }


@router.get("/timeline")
def get_timeline(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Daily detection counts per class for the last N days."""
    since = datetime.now(UTC) - timedelta(days=days)

    rows = (
        db.query(
            func.date(DetectionEvent.created_at).label("date"),
            DetectionEvent.detected_class,
            func.count().label("count"),
        )
        .filter(DetectionEvent.created_at >= since)
        .filter(DetectionEvent.user_id == user.id if user.role != "admin" else True)
        .group_by(
            func.date(DetectionEvent.created_at),
            DetectionEvent.detected_class,
        )
        .order_by(func.date(DetectionEvent.created_at))
        .all()
    )

    return [
        {"date": str(r.date), "class": r.detected_class, "count": r.count}
        for r in rows
    ]


@router.get("/confidence-distribution")
def get_confidence_distribution(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Histogram data: count of events grouped by confidence buckets."""
    buckets = [(i / 10, (i + 1) / 10) for i in range(0, 10)]
    result  = []
    for lo, hi in buckets:
        query = db.query(DetectionEvent).filter(
            DetectionEvent.confidence >= lo,
            DetectionEvent.confidence < hi,
        ).count()
        if user.role != "admin":
            query = db.query(DetectionEvent).filter(
                DetectionEvent.confidence >= lo,
                DetectionEvent.confidence < hi,
                DetectionEvent.user_id == user.id,
            ).count()
        count = query
        result.append({"range": f"{int(lo*100)}–{int(hi*100)}%", "count": count})
    return result
