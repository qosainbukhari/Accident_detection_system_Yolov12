"""
main.py – FastAPI application entry point
Lifespan: initialises DB tables + loads YOLOv12 model at startup
"""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.database import Base, engine
from app.core.detection_engine import DetectionEngine
from app.core.whatsapp_service import kapso_configured
from app.api.routes import auth, detection, alerts, dashboard, users, agent
from app.config import settings

logger = logging.getLogger(__name__)

for directory in ["static", settings.PROCESSED_DIR, settings.SNAPSHOTS_DIR,
                  settings.REPORTS_DIR, settings.UPLOAD_DIR]:
    os.makedirs(directory, exist_ok=True)


# ── Startup / Shutdown ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables (if they don't exist)
    Base.metadata.create_all(bind=engine)

    # Ensure storage directories exist
    for d in ["static", settings.PROCESSED_DIR, settings.SNAPSHOTS_DIR,
              settings.REPORTS_DIR, settings.UPLOAD_DIR]:
        os.makedirs(d, exist_ok=True)

    # Pre-load YOLOv12 model (singleton)
    DetectionEngine.get_instance()

    logger.info("Database ready")
    logger.info("Detection model initialization complete")
    logger.info("AI emergency agent enabled=%s", settings.AGENT_ENABLED)
    whatsapp_ready = (
        settings.WHATSAPP_ENABLED
        and settings.WHATSAPP_MODE.lower() == "kapso"
        and kapso_configured()
    )
    logger.info("Kapso WhatsApp configured=%s", whatsapp_ready)
    logger.info("AI Accident Detection API started")

    yield

    logger.info("Application shutdown")


# ── App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Accident Detection & Emergency Response API",
    description="YOLOv12-powered accident detection with automated email + call alerts",
    version="2.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[host.strip() for host in settings.TRUSTED_HOSTS.split(",") if host.strip()],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault("X-Permitted-Cross-Domain-Policies", "none")
    response.headers.setdefault("Cache-Control", "no-store" if request.url.path.startswith(("/auth", "/agent")) else "no-cache")
    if settings.APP_ENV.lower() == "production":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
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
