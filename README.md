# AI Accident Detection and Emergency Response System

A full-stack final year project for detecting road accidents in images and videos using a custom YOLO model, with secure user authentication, event history, analytics, and automated email notification support.

## Overview

This project combines:

- A FastAPI backend for inference, authentication, and persistence
- A React frontend for detection, monitoring, and history review
- A YOLO-based detection pipeline for `fire`, `moderate`, and `severe` classes
- MySQL database storage for users, detections, alerts, and logs
- SMTP email alerting for detected accident events
- Optional mock call logging for admin test mode

The system is designed for academic demonstration, evaluation, and local deployment.

## Key Features

- Image-based accident detection
- Video-based accident detection with annotated output
- Role-based authentication and protected routes
- Detection history and alert logs
- Dashboard and analytics views
- Configurable email alerting
- Optional mock call logging for controlled testing

## Technology Stack

- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic
- Frontend: React, Vite, Tailwind CSS
- ML: Ultralytics YOLO, OpenCV, NumPy
- Database: MySQL
- Notifications: SMTP email, optional mock call logging
- Deployment: Docker Compose

## Model Class Contract

The application expects the following class order:

```text
0 = fire
1 = moderate
2 = severe
```

If the class names or order change, the model and application logic must be updated together.

## Repository Structure

```text
backend/                 FastAPI application, inference, DB layer, tests
backend/alembic/         Database migrations
backend/ml_model/        Model files and class contract
frontend/                React application
database/                MySQL init and seed scripts
ml_training/             Training notebooks and artifacts
docker-compose.yml       Multi-service local deployment
```

## Prerequisites

- Docker Engine and Docker Compose, or
- Manual setup with:
  - Python 3.11+
  - Node.js 18+
  - npm

## Quick Start

### Docker Recommended

1. Create the root environment file:

```bash
cp backend/.env.example .env
```

2. Set the required values in `.env`:

- `SECRET_KEY`
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- Optional SMTP settings
- `ENABLE_DOCS=true` if you want Swagger UI locally

3. Ensure the model file exists at:

```text
backend/ml_model/best.pt
```

4. Start the stack:

```bash
docker compose up --build
```

5. Open the application:

- Frontend: http://localhost
- Backend API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs when `ENABLE_DOCS=true`
- Health check: http://localhost:8000/health

## Manual Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
```

Set `DATABASE_URL` in `backend/.env`, for example:

```text
DATABASE_URL=mysql+pymysql://user:password@127.0.0.1:3306/accident_db
```

Run the backend:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

Frontend development URL:

```text
http://localhost:5173
```

## Configuration

Primary backend variables:

- `DATABASE_URL`
- `SECRET_KEY`
- `MODEL_PATH`
- `DETECTION_CONFIDENCE`
- `IOU_THRESHOLD`
- `ALERT_CLASSES`
- `ALERT_COOLDOWN_SECONDS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `ALERT_EMAIL_TO`
- `CALL_PROVIDER`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `EMERGENCY_CALL_TO`

Recommended default behavior:

- Email alerts are enabled when SMTP is configured
- Call logging stays in `mock` mode by default
- Admin test-call is available for controlled testing

## Alerting

### Email Alerts

The system can send alert emails with detection details and the annotated image when SMTP settings are provided.

Required SMTP settings:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_sender@gmail.com
SMTP_PASSWORD=your_16_char_app_password
ALERT_EMAIL_TO=recipient@example.com
```

### Call Logging

The codebase includes a call service for test and logging purposes. By default it runs in mock mode, which does not place live calls.

## API Endpoints

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Detection

- `POST /detection/image`
- `POST /detection/video`
- `GET /detection/history`
- `GET /detection/history/{id}`

### Alerts

- `GET /alerts`
- `GET /alerts/calls`
- `POST /alerts/test-email` - admin only
- `POST /alerts/test-call` - admin only, mock log by default

### Dashboard

- `GET /dashboard/stats`
- `GET /dashboard/timeline`
- `GET /dashboard/confidence-distribution`

### Users

- `GET /users`
- `PUT /users/{id}`
- `DELETE /users/{id}`

## Testing

### Backend

```bash
cd backend
source .venv/bin/activate
pytest -q
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

## Security Notes

- Replace all default credentials before deployment
- Use a strong `SECRET_KEY`
- Restrict CORS for non-local environments
- Keep secrets out of version control
- Enable HTTPS, monitoring, and backup policies for production

## Deployment Notes

This repository is well suited for a final year project, academic demonstration, and local deployment. For production use, add stronger operational controls, observability, and a proper incident response workflow.

## License

This project is intended for academic and demonstration use.
# Accident_detection_system
# Accident_detection_system_Yolov12
