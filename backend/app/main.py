"""
main.py – FastAPI application entry point
Lifespan: initialises DB tables + loads YOLOv12 model at startup
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.database import Base, engine
from app.core.detection_engine import DetectionEngine
from app.api.routes import auth, detection, alerts, dashboard, users, agent
from app.config import settings

for directory in ["static", "static/uploads", "static/processed", "static/snapshots"]:
    os.makedirs(directory, exist_ok=True)


# ── Startup / Shutdown ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables (if they don't exist)
    Base.metadata.create_all(bind=engine)

    # Ensure storage directories exist
    for d in ["static/uploads", "static/processed", "static/snapshots"]:
        os.makedirs(d, exist_ok=True)

    # Pre-load YOLOv12 model (singleton)
    DetectionEngine.get_instance()

    print("=" * 50)
    print("[STARTUP] ✅ Database ready")
    print("[STARTUP] ✅ YOLOv12 model loaded")
    print(f"[STARTUP] {'✅' if settings.AGENT_ENABLED and settings.GEMINI_API_KEY.strip() else '⚠️ '} "
          f"AI Emergency Agent {'enabled' if settings.AGENT_ENABLED and settings.GEMINI_API_KEY.strip() else 'inactive'}")
    whatsapp_ready = (
        settings.WHATSAPP_ENABLED
        and settings.TWILIO_ACCOUNT_SID.strip().startswith("AC")
        and settings.TWILIO_AUTH_TOKEN.strip()
        and settings.TWILIO_WHATSAPP_TO.strip()
    )
    print(f"[STARTUP] {'✅' if whatsapp_ready else '⚠️ '} "
          f"Twilio WhatsApp {'configured' if whatsapp_ready else 'inactive'}")
    print("[STARTUP] ✅ AI Accident Detection API v2.1 running")
    print("=" * 50)

    yield

    print("[SHUTDOWN] Cleaning up resources...")


# ── App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Accident Detection & Emergency Response API",
    description="YOLOv12-powered accident detection with automated email + call alerts",
    version="2.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    return response


# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Files ──────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Routes ───────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/auth",       tags=["Authentication"])
app.include_router(detection.router,  prefix="/detection",  tags=["Detection"])
app.include_router(alerts.router,     prefix="/alerts",     tags=["Alerts"])
app.include_router(dashboard.router,  prefix="/dashboard",  tags=["Dashboard"])
app.include_router(users.router,      prefix="/users",      tags=["Users"])
app.include_router(agent.router,       prefix="/agent",       tags=["AI Agent"])


# ── Health Check ──────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status":  "ok",
        "model":   "yolov12",
        "version": "2.1.0",
        "agent":   settings.AGENT_ENABLED,
    }
