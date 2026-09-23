"""
config.py – Pydantic Settings loader
Reads all environment variables from .env
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import secrets
from pathlib import Path


class Settings(BaseSettings):
    APP_ENV: str = "development"
    # Database
    DATABASE_URL: str

    # Security / JWT
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost"
    TRUSTED_HOSTS: str = "localhost,127.0.0.1,testserver,backend"
    ENABLE_DOCS: bool = False

    # YOLOv12 Model
    MODEL_PATH: str = "ml_model/best.pt"
    DETECTION_CONFIDENCE: float = 0.45
    IOU_THRESHOLD: float = 0.45
    IMG_SIZE: int = 640

    # Alert Classes
    ALERT_CLASSES: str = "fire,moderate,severe"
    ALERT_COOLDOWN_SECONDS: int = 60
    VIDEO_FRAME_STRIDE: int = 2
    VIDEO_CONFIRMATION_FRAMES: int = 3

    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    ALERT_EMAIL_TO: str = ""
    # Dashboard URL used for the "View Detection Report" link in alert emails.
    FRONTEND_URL: str = "http://localhost:5173"


    # AI emergency agent
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    AGENT_ENABLED: bool = True
    AGENT_TIMEOUT_SECONDS: int = 90

    # WhatsApp (Kapso / Meta Cloud API)
    WHATSAPP_ENABLED: bool = True
    WHATSAPP_MODE: str = "mock"
    KAPSO_API_KEY: str = ""
    KAPSO_PHONE_NUMBER_ID: str = ""
    KAPSO_WHATSAPP_TO: str = ""
    WHATSAPP_INCLUDE_MEDIA: bool = False
    PUBLIC_BASE_URL: str = ""

    # File Storage
    # Original uploads stay outside the public static root. Generated outputs
    # are safe-to-serve artifacts and retain the existing dashboard URLs.
    UPLOAD_DIR: str = "data/uploads"
    PROCESSED_DIR: str = "static/processed"
    SNAPSHOTS_DIR: str = "static/snapshots"
    REPORTS_DIR: str = "static/reports"
    MAX_UPLOAD_SIZE_MB: int = 100
    MAX_VIDEO_FRAMES: int = 9000
    MAX_IMAGE_PIXELS: int = 25_000_000
    ALLOWED_IMAGE_TYPES: str = "jpg,jpeg,png,webp"
    ALLOWED_VIDEO_TYPES: str = "mp4,avi,mov,mkv"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
