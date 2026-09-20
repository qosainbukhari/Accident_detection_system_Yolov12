-- =====================================================
-- AI Accident Detection System – Full Database Schema
-- Version 2.0
-- =====================================================

CREATE DATABASE IF NOT EXISTS accident_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE accident_db;

-- ─────────────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(50)  UNIQUE NOT NULL,
  email           VARCHAR(100) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  role            ENUM('admin','operator','viewer') DEFAULT 'viewer',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_username (username),
  INDEX idx_users_email (email)
);

-- ─────────────────────────────────────────────────
-- 2. DETECTION EVENTS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS detection_events (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  user_id            INT,
  media_type         ENUM('image','video') NOT NULL,
  original_filename  VARCHAR(255),
  processed_filename VARCHAR(255),
  detected_class     VARCHAR(20) NOT NULL,
  confidence         FLOAT NOT NULL,
  bounding_boxes     JSON,
  snapshot_path      VARCHAR(500),
  total_frames       INT,           -- video only
  detected_frames    INT,           -- video only
  dominant_class     VARCHAR(20),   -- video only: most frequent class
  processing_ms      INT,
  alert_sent         BOOLEAN DEFAULT FALSE,
  call_triggered     BOOLEAN DEFAULT FALSE,
  whatsapp_sent      BOOLEAN DEFAULT FALSE,
  incident_status    VARCHAR(20) DEFAULT 'open',
  location           VARCHAR(255) DEFAULT 'Unknown',
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_de_class   (detected_class),
  INDEX idx_de_created (created_at),
  INDEX idx_de_alert   (alert_sent),
  INDEX idx_de_user    (user_id),
  INDEX idx_de_incident_status (incident_status)
);

-- ─────────────────────────────────────────────────
-- 3. ALERTS (EMAIL LOG)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  detection_id    INT NOT NULL,
  recipient_email VARCHAR(150),
  subject         VARCHAR(255),
  body            TEXT,
  status          ENUM('pending','sent','failed') DEFAULT 'pending',
  error_message   TEXT,
  sent_at         DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (detection_id) REFERENCES detection_events(id) ON DELETE CASCADE,
  INDEX idx_alerts_detection (detection_id),
  INDEX idx_alerts_status    (status)
);

-- ─────────────────────────────────────────────────
-- 4. LOCAL CALL AUDIT LOGS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_logs (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  detection_id     INT NOT NULL,
  to_number        VARCHAR(20),
  from_number      VARCHAR(20),
  call_sid         VARCHAR(50),
  call_status      ENUM(
                     'initiated','simulated','ringing','in-progress',
                     'completed','failed','no-answer','busy'
                   ) DEFAULT 'initiated',
  duration_seconds INT,
  call_message     TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (detection_id) REFERENCES detection_events(id) ON DELETE CASCADE,
  INDEX idx_calls_detection (detection_id),
  INDEX idx_calls_status    (call_status)
);

-- ─────────────────────────────────────────────────
-- 5. VIDEO PROCESSING LOGS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_processing_logs (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  detection_id         INT NOT NULL,
  total_frames         INT,
  processed_frames     INT,
  fire_frames          INT DEFAULT 0,
  moderate_frames      INT DEFAULT 0,
  severe_frames        INT DEFAULT 0,
  no_detection_frames  INT DEFAULT 0,
  avg_confidence       FLOAT,
  fps_processed        FLOAT,
  output_path          VARCHAR(500),
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (detection_id) REFERENCES detection_events(id) ON DELETE CASCADE,
  INDEX idx_vpl_detection (detection_id)
);

-- ─────────────────────────────────────────────────
-- 6. AI AGENT REPORTS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_reports (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  detection_id         INT NOT NULL UNIQUE,
  incident_level       VARCHAR(20),
  situation_summary    TEXT,
  visible_hazards      JSON,
  recommended_services JSON,
  immediate_actions    JSON,
  casualty_risk        VARCHAR(20),
  full_report          TEXT,
  model_used           VARCHAR(60),
  llm_error            TEXT,
  processing_ms        INT,
  whatsapp_sent        BOOLEAN DEFAULT FALSE,
  whatsapp_sid         VARCHAR(64),
  whatsapp_error       TEXT,
  report_path          VARCHAR(500),
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (detection_id) REFERENCES detection_events(id) ON DELETE CASCADE,
  INDEX idx_ar_level (incident_level),
  INDEX idx_ar_whatsapp (whatsapp_sent),
  INDEX idx_ar_created (created_at)
);

-- ─────────────────────────────────────────────────
-- 7. AUDIT LOG
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  detection_id INT NULL,
  actor        VARCHAR(80) NOT NULL DEFAULT 'system',
  action       VARCHAR(80) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'success',
  details      JSON,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (detection_id) REFERENCES detection_events(id) ON DELETE SET NULL,
  INDEX idx_audit_detection (detection_id),
  INDEX idx_audit_created (created_at)
);
