# Integration Guide — AI Emergency Agent + Twilio WhatsApp

Drop this into your **existing** project. Nothing is restructured.

**19 files total:** 9 brand new (just copy them in) and 10 small edits to files
you already have. Every edit is **additive** — 470 lines added, 12 removed
across the whole integration.

---

## Pick your path

| Path | Use when | Time |
| ---- | -------- | ---- |
| **A — Apply the patch** | Your files still match the GitHub repo | 2 min |
| **B — Manual edits** | You've changed these files since | 20 min |

Both end at the same place. Try A first — if it fails, fall back to B.

---

# PATH A — Apply the patch

```bash
cd /path/to/your/Accident_detection_system_Yolov12

# 0. Safety net
git checkout -b ai-agent-integration

# 1. Copy the 9 new files in
cp -r /path/to/ai-agent-integration/new_files/* .

# 2. Dry run first — this changes nothing
git apply --check /path/to/ai-agent-integration/01-code-changes.patch
```

**If that printed nothing, you're good:**

```bash
git apply /path/to/ai-agent-integration/01-code-changes.patch
```

**If it printed errors**, your files have drifted → skip to Path B.

Optional second patch (Docker env vars, Vite proxy fix, README, .gitignore):

```bash
git apply /path/to/ai-agent-integration/02-optional-infra.patch
```

Then jump to **"Finish up"** at the bottom.

---

# PATH B — Manual edits

Copy the 9 new files in first:

```bash
cp -r /path/to/ai-agent-integration/new_files/* .
```

Then make these 10 edits. Each one says exactly where to put it.

---

## B1 · `backend/app/config.py`

Find the Twilio block and add **after** `EMERGENCY_CALL_TO`:

```python
    # ── AI Emergency Agent (LangChain + Google Gemini) ─────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    AGENT_ENABLED: bool = True
    AGENT_TIMEOUT_SECONDS: int = 45

    # ── WhatsApp (Twilio) ──────────────────────────────────────────
    # Sandbox sender is whatsapp:+14155238886
    WHATSAPP_ENABLED: bool = True
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"
    TWILIO_WHATSAPP_TO: str = ""          # e.g. whatsapp:+923001234567
    WHATSAPP_INCLUDE_MEDIA: bool = False  # needs a public PUBLIC_BASE_URL
    PUBLIC_BASE_URL: str = ""             # e.g. https://abc123.ngrok.io
```

---

## B2 · `backend/app/db/models.py`

**Edit 1** — in `class DetectionEvent`, after `call_triggered`:

```python
    whatsapp_sent      = Column(Boolean, default=False)
```

**Edit 2** — in the same class, after the `video_log` relationship:

```python
    agent_report = relationship(
        "AgentReport", back_populates="event", uselist=False, cascade="all, delete-orphan"
    )
```

**Edit 3** — append this at the very **end of the file**:

```python


# ─────────────────────────────────────────────
# 6. AI AGENT REPORTS
# ─────────────────────────────────────────────
class AgentReport(Base):
    """
    Structured emergency assessment produced by the LangChain + Gemini agent,
    plus the outcome of the WhatsApp dispatch that followed it.
    """
    __tablename__ = "agent_reports"

    id                   = Column(Integer, primary_key=True, index=True)
    detection_id         = Column(
        Integer, ForeignKey("detection_events.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True
    )

    # LLM assessment
    incident_level       = Column(String(20), index=True)   # CRITICAL | HIGH | MODERATE | LOW
    situation_summary    = Column(Text)
    visible_hazards      = Column(JSON)                     # list[str]
    recommended_services = Column(JSON)                     # list[str]
    immediate_actions    = Column(JSON)                     # list[str]
    casualty_risk        = Column(String(20))               # none | possible | likely | unknown
    full_report          = Column(Text)

    # Provenance
    model_used           = Column(String(60))
    llm_error            = Column(Text)
    processing_ms        = Column(Integer)

    # WhatsApp dispatch
    whatsapp_sent        = Column(Boolean, default=False, index=True)
    whatsapp_sid         = Column(String(64))
    whatsapp_error       = Column(Text)

    created_at           = Column(DateTime, server_default=func.now(), index=True)

    event = relationship("DetectionEvent", back_populates="agent_report")
```

> Your existing imports already cover everything used here.

---

## B3 · `backend/app/db/crud.py`

**Edit 1** — extend the models import:

```python
from app.db.models import (
    User, DetectionEvent, Alert, CallLog, VideoLog, AgentReport
)
```

**Edit 2** — append at the **end of the file**:

```python


# ─────────────────────────────────────────────
# VIDEO LOG LOOKUP
# ─────────────────────────────────────────────

def get_video_log(db: Session, detection_id: int) -> Optional[VideoLog]:
    return db.query(VideoLog).filter(VideoLog.detection_id == detection_id).first()


# ─────────────────────────────────────────────
# AI AGENT REPORT CRUD
# ─────────────────────────────────────────────

def create_agent_report(db: Session, data: Dict[str, Any]) -> AgentReport:
    """
    Persist an AI agent report. Upserts on detection_id so a re-run of the
    agent for the same event replaces the previous assessment.
    """
    existing = db.query(AgentReport).filter(
        AgentReport.detection_id == data.get("detection_id")
    ).first()

    if existing:
        for key, val in data.items():
            if hasattr(existing, key):
                setattr(existing, key, val)
        db.commit()
        db.refresh(existing)
        return existing

    report = AgentReport(**data)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def get_agent_report(
    db: Session,
    detection_id: int,
    user_id: Optional[int] = None,
) -> Optional[AgentReport]:
    """Fetch the agent report for a detection event, honouring ownership."""
    query = db.query(AgentReport).join(DetectionEvent).filter(
        AgentReport.detection_id == detection_id
    )
    if user_id is not None:
        query = query.filter(DetectionEvent.user_id == user_id)
    return query.first()


def get_agent_reports(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    user_id: Optional[int] = None,
    whatsapp_only: bool = False,
):
    """Paginated agent reports, newest first."""
    query = db.query(AgentReport).join(DetectionEvent)
    if user_id is not None:
        query = query.filter(DetectionEvent.user_id == user_id)
    if whatsapp_only:
        query = query.filter(AgentReport.whatsapp_sent == True)  # noqa: E712
    return query.order_by(desc(AgentReport.created_at)).offset(skip).limit(limit).all()


def count_agent_reports(db: Session, user_id: Optional[int] = None) -> int:
    query = db.query(AgentReport).join(DetectionEvent)
    if user_id is not None:
        query = query.filter(DetectionEvent.user_id == user_id)
    return query.count()


def mark_whatsapp_sent(db: Session, event_id: int):
    event = get_detection_event(db, event_id)
    if event:
        event.whatsapp_sent = True
        db.commit()


# ─────────────────────────────────────────────
# AGENT CONTEXT HELPERS
# ─────────────────────────────────────────────

def count_events_today(db: Session) -> int:
    """Detections logged since midnight UTC — context for the AI agent."""
    from sqlalchemy import func as _func
    today = datetime.now(UTC).date()
    return db.query(DetectionEvent).filter(
        _func.date(DetectionEvent.created_at) == today
    ).count()


def count_recent_by_class(db: Session, detected_class: str, hours: int = 24) -> int:
    """How many times this class fired in the last N hours."""
    from datetime import timedelta
    since = datetime.now(UTC) - timedelta(hours=hours)
    return db.query(DetectionEvent).filter(
        DetectionEvent.detected_class == detected_class,
        DetectionEvent.created_at >= since,
    ).count()
```

---

## B4 · `backend/app/main.py`

**Edit 1** — add `agent` to the routes import:

```python
from app.api.routes import auth, detection, alerts, dashboard, users, agent
```

**Edit 2** — after the `users` router registration:

```python
app.include_router(agent.router,      prefix="/agent",      tags=["AI Agent"])
```

**Edit 3 (optional)** — replace the startup print for clearer diagnostics:

```python
    if settings.AGENT_ENABLED and (settings.GEMINI_API_KEY or "").strip():
        print(f"[STARTUP] ✅ AI Emergency Agent enabled ({settings.GEMINI_MODEL})")
    else:
        print("[STARTUP] ⚠️  AI Emergency Agent inactive (set GEMINI_API_KEY to enable)")

    if settings.WHATSAPP_ENABLED and (settings.TWILIO_WHATSAPP_TO or "").strip():
        print("[STARTUP] ✅ Twilio WhatsApp dispatch configured")
    else:
        print("[STARTUP] ⚠️  WhatsApp dispatch inactive (set Twilio credentials)")

    print("[STARTUP] ✅ AI Accident Detection API v2.1 running")
```

---

## B5 · `backend/app/api/routes/detection.py` ⭐ the important one

**Edit 1** — add the import next to `maybe_send_alert`:

```python
from app.core.emergency_agent import run_emergency_agent
```

**Edit 2** — in `detect_image()`, inside the existing
`if result["alert_required"]:` block, right after the `maybe_send_alert`
background task:

```python
        # Background: AI emergency agent → report + WhatsApp dispatch
        bg.add_task(
            run_emergency_agent,
            event.id,
            result["detected_class"],
            result["confidence"],
            proc_path,
            "image",
            file.filename or "",
        )
```

**Edit 3** — in `detect_video()`, same place inside its `if result["alert_required"]:`:

```python
        # Background: AI emergency agent → report + WhatsApp dispatch
        bg.add_task(
            run_emergency_agent,
            event.id,
            result["dominant_class"],
            result["avg_confidence"],
            result.get("snapshot_path"),
            "video",
            file.filename or "",
        )
```

**Edit 4** — add one key to each return dict so the UI knows to poll.

In `detect_image()`'s return, after `"alert_triggered"`:

```python
        "agent_pending":   bool(result["alert_required"] and settings.AGENT_ENABLED),
```

In `detect_video()`'s return, after `"alert_triggered"`:

```python
        "agent_pending":       bool(result["alert_required"] and settings.AGENT_ENABLED),
```

**Edit 5** — replace the `get_history` function so history cards can show the
🤖 pill without one request per card. Paste this **above** `@router.get("/history")`:

```python
def _serialise_event(event) -> dict:
    """
    Flatten a DetectionEvent for the frontend, attaching a compact summary of
    the AI agent report so History cards can show the 🤖 pill without an
    extra request per card.
    """
    data = {
        "id":                 event.id,
        "user_id":            event.user_id,
        "media_type":         event.media_type,
        "original_filename":  event.original_filename,
        "processed_filename": event.processed_filename,
        "detected_class":     str(getattr(event.detected_class, "value", event.detected_class)),
        "confidence":         event.confidence,
        "bounding_boxes":     event.bounding_boxes,
        "snapshot_path":      event.snapshot_path,
        "total_frames":       event.total_frames,
        "detected_frames":    event.detected_frames,
        "dominant_class":     event.dominant_class,
        "processing_ms":      event.processing_ms,
        "alert_sent":         event.alert_sent,
        "call_triggered":     event.call_triggered,
        "whatsapp_sent":      event.whatsapp_sent,
        "created_at":         event.created_at,
        "agent_report":       None,
    }

    report = getattr(event, "agent_report", None)
    if report:
        data["agent_report"] = {
            "id":                   report.id,
            "incident_level":       report.incident_level,
            "situation_summary":    report.situation_summary,
            "casualty_risk":        report.casualty_risk,
            "recommended_services": report.recommended_services,
            "whatsapp_sent":        report.whatsapp_sent,
        }
    return data
```

Then change the last line of `get_history` from `return events` to:

```python
    return [_serialise_event(e) for e in events]
```

And in `get_event`, change `return event` to:

```python
    return _serialise_event(event)
```

---

## B6 · `backend/app/api/routes/dashboard.py`

**Edit 1** — extend the models import:

```python
from app.db.models import DetectionEvent, CallLog, AgentReport
```

**Edit 2** — in `get_stats()`, after the `avg_conf = ...` line:

```python
    # AI agent reports + WhatsApp dispatches
    reports_query = db.query(AgentReport).join(DetectionEvent)
    if user.role != "admin":
        reports_query = reports_query.filter(DetectionEvent.user_id == user.id)
    ai_reports = reports_query.count()
    whatsapp_sent = reports_query.filter(AgentReport.whatsapp_sent == True).count()  # noqa: E712
```

**Edit 3** — add two keys to the returned dict:

```python
        "ai_reports":     ai_reports,
        "whatsapp_sent":  whatsapp_sent,
```

---

## B7 · `backend/requirements.txt`

Append:

```
# ── AI Emergency Agent (LangChain + Google Gemini) ──
langchain-core>=0.3.0
langchain-google-genai>=2.0.0
requests>=2.31.0
```

---

## B8 · `database/init.sql`

**Edit 1** — in `CREATE TABLE detection_events`, after `call_triggered`:

```sql
  whatsapp_sent      BOOLEAN DEFAULT FALSE,
```

**Edit 2** — append at the end of the file:

```sql

-- ─────────────────────────────────────────────────
-- 6. AI AGENT REPORTS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_reports (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  detection_id         INT NOT NULL UNIQUE,

  incident_level       VARCHAR(20),    -- CRITICAL | HIGH | MODERATE | LOW
  situation_summary    TEXT,
  visible_hazards      JSON,
  recommended_services JSON,
  immediate_actions    JSON,
  casualty_risk        VARCHAR(20),    -- none | possible | likely | unknown
  full_report          TEXT,

  model_used           VARCHAR(60),
  llm_error            TEXT,
  processing_ms        INT,

  whatsapp_sent        BOOLEAN DEFAULT FALSE,
  whatsapp_sid         VARCHAR(64),
  whatsapp_error       TEXT,

  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (detection_id) REFERENCES detection_events(id) ON DELETE CASCADE,
  INDEX idx_ar_level    (incident_level),
  INDEX idx_ar_whatsapp (whatsapp_sent),
  INDEX idx_ar_created  (created_at)
);
```

> Only affects **fresh** databases. For an existing one, see "Database" below.

---

## B9 · Frontend — `ImageDetect.jsx` and `VideoDetect.jsx`

Both take the same four edits.

**Edit 1** — imports:

```jsx
import { pollAgentReport } from "../api/agentApi";
import AgentReportCard from "../components/AgentReportCard";
```

**Edit 2** — two extra state vars next to your existing `useState` calls:

```jsx
  const [report,  setReport]  = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);
```

**Edit 3** — in your detect/process function, right after `setResult(data)`
and the toast:

```jsx
      // The AI agent runs in the background — poll for its assessment
      if (data.agent_pending && data.event_id) {
        setAgentLoading(true);
        pollAgentReport(data.event_id)
          .then((r) => {
            setReport(r);
            if (r?.whatsapp_sent) toast.success("WhatsApp alert dispatched");
          })
          .finally(() => setAgentLoading(false));
      }
```

Also clear them in your `reset()` / `onFile()` handlers:

```jsx
    setReport(null); setAgentLoading(false);
```

**Edit 4** — render the card inside the results block:

```jsx
              {/* AI Emergency Agent */}
              <AgentReportCard report={report} loading={agentLoading} />
```

In **ImageDetect** put it just before `{/* Bbox table */}`.
In **VideoDetect** put it just before `{/* Class stats */}`.

---

## B10 · Frontend — the four small ones

### `components/DetectionCard.jsx`

Add to the heroicons import: `ChatBubbleLeftRightIcon, SparklesIcon`

Widen the indicator condition:

```jsx
        {(event.alert_sent || event.call_triggered || event.whatsapp_sent || event.agent_report) && (
```

Add two pills after the `call_triggered` pill:

```jsx
            {event.whatsapp_sent && (
              <span className="flex items-center gap-1 text-[10px] font-medium
                               text-emerald-400 bg-emerald-500/10 border border-emerald-500/20
                               px-2 py-0.5 rounded-full">
                <ChatBubbleLeftRightIcon className="w-3 h-3" /> WhatsApp
              </span>
            )}
            {event.agent_report && (
              <span className="flex items-center gap-1 text-[10px] font-medium
                               text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20
                               px-2 py-0.5 rounded-full"
                    title={event.agent_report?.incident_level
                      ? `AI level: ${event.agent_report.incident_level}`
                      : "AI report available"}>
                <SparklesIcon className="w-3 h-3" /> AI
              </span>
            )}
```

### `pages/Dashboard.jsx`

Add to the heroicons import: `SparklesIcon, ChatBubbleLeftRightIcon`

Change the KPI grid from `xl:grid-cols-4` to `xl:grid-cols-3` and add:

```jsx
        <StatsCard label="AI Reports"       value={stats?.ai_reports}  icon={SparklesIcon}      accent="#d946ef" />
        <StatsCard label="WhatsApp Sent"    value={stats?.whatsapp_sent} icon={ChatBubbleLeftRightIcon} accent="#22c55e" />
```

### `pages/AlertsCenter.jsx`

This one has the most edits — easiest is to diff against my version:

```bash
diff your-repo/frontend/src/pages/AlertsCenter.jsx \
     ai-agent-integration/reference/AlertsCenter.jsx
```

Summary: import `agentApi` + `ChatBubbleLeftRightIcon`, add a `waLogs` state,
fetch `agentApi.getReports(0, 50)` alongside the other two, add a `whatsapp`
tab, and extend `cols`/`row` to handle it.

### `pages/Settings.jsx` (optional, cosmetic)

Adds two read-only panels showing live agent/WhatsApp config from
`GET /agent/status`. Copy from `reference/Settings.jsx` if you want it.

---

# Finish up

### 1. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Database

**Fresh DB** → nothing to do, SQLAlchemy creates `agent_reports` on startup.

**Existing DB with data** → run the migration:

```bash
cd backend && alembic upgrade head
```

Or apply the SQL by hand:

```sql
ALTER TABLE detection_events ADD COLUMN whatsapp_sent BOOLEAN DEFAULT FALSE;
-- then the CREATE TABLE agent_reports block from step B8
```

### 3. Configure keys

```bash
cp backend/.env.example backend/.env
```

Fill in `GEMINI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_WHATSAPP_TO`. Where to get them: see `AI_AGENT_SETUP.md`.

### 4. Verify

```bash
cd backend && pytest -q
# expect: 40 passed, 7 skipped
```

Start the app and check:

```bash
curl http://localhost:8000/health
# {"status":"ok","model":"yolov12","version":"2.1.0","agent":true}
```

Then log in as admin → **Alerts Center → Test WhatsApp**.

---

# Troubleshooting

**`ModuleNotFoundError: langchain_google_genai`**
→ `pip install -r requirements.txt`. Not fatal — the agent falls back to
rule-based reports.

**`Table 'agent_reports' doesn't exist`**
→ Run `alembic upgrade head`, or restart the backend so `create_all()` fires.

**Card never appears on the detection page**
→ `agent_pending` must be `true` in the detection response (check B5 edit 4),
and the agent only runs when `alert_required` is true.

**WhatsApp says "not configured"**
→ All three of `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_TO`
must be set. The `whatsapp:` prefix is added automatically if you forget it.

**WhatsApp 63015 / 63016 error**
→ Sandbox session expired. Re-send the join code to +1 415 523 8886.

**Report says "rule-based-fallback"**
→ Gemini wasn't reachable. The real reason is stored in
`agent_reports.llm_error` — query it or check `GET /agent/report/{id}`.

---

# Rollback

```bash
git checkout .          # undo the edits
git clean -fd           # remove the new files
```

Or if you branched: `git checkout main && git branch -D ai-agent-integration`

The agent is fully isolated — deleting `emergency_agent.py`, removing the two
`bg.add_task(...)` calls and the router line returns you to your original
behaviour. The `agent_reports` table can stay; nothing else reads it.
