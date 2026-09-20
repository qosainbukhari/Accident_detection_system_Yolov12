"""Isolated SQLite fixtures for API and workflow tests."""
import os

os.environ["DATABASE_URL"] = "sqlite:////tmp/accident_detection_test.db"
os.environ["MODEL_PATH"] = "/tmp/nonexistent-test-model.pt"
os.environ["AGENT_ENABLED"] = "false"
os.environ["WHATSAPP_MODE"] = "mock"
os.environ["WHATSAPP_ENABLED"] = "true"
os.environ["TRUSTED_HOSTS"] = "localhost,127.0.0.1,testserver,backend"

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.database import Base, SessionLocal, engine
from app.db.models import User
from app.main import app


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.add(User(username="admin", email="admin@example.test", role="admin",
                is_active=True, hashed_password=hash_password("admin123")))
    db.add(User(username="viewer", email="viewer@example.test", role="viewer",
                is_active=True, hashed_password=hash_password("viewer123!")))
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def admin_user(db):
    return db.query(User).filter(User.username == "admin").one()


@pytest.fixture
def viewer_user(db):
    return db.query(User).filter(User.username == "viewer").one()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
