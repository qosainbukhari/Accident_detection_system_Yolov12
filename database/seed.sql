-- =====================================================
-- Seed Data – AI Accident Detection System v2.0
-- Run AFTER init.sql
-- =====================================================
USE accident_db;

-- ─────────────────────────────────────────────────────
-- USERS  (bcrypt rounds=12, generated fresh)
--   admin    password → admin123
--   operator password → operator123
-- ─────────────────────────────────────────────────────
INSERT IGNORE INTO users (username, email, hashed_password, role, is_active)
VALUES (
  'admin',
  'admin@accident-system.com',
  '$2b$12$7zRNKom63v1gVz9X5NdtEeHh7n/OcDwCAehG4VNXphm6OdU0vnXbK',
  'admin',
  TRUE
);

INSERT IGNORE INTO users (username, email, hashed_password, role, is_active)
VALUES (
  'operator1',
  'operator@accident-system.com',
  '$2b$12$x6HaYSDsM6/DtWjwcOh6xeatu2TQtdYldsCKSEIfrFd2yo5/dIWSO',
  'operator',
  TRUE
);

-- ─────────────────────────────────────────────────────
-- SAMPLE DETECTION EVENTS
-- ─────────────────────────────────────────────────────
INSERT IGNORE INTO detection_events
  (user_id, media_type, original_filename, processed_filename,
   detected_class, confidence, processing_ms, alert_sent, call_triggered,
   created_at)
VALUES
  (1, 'image', 'highway_fire.jpg',   'img_sample01.jpg', 'fire',   0.92, 45,  TRUE,  TRUE,  NOW() - INTERVAL 2 DAY),
  (1, 'image', 'fender_bender.jpg',  'img_sample02.jpg', 'moderate',  0.78, 38,  FALSE, FALSE, NOW() - INTERVAL 2 DAY),
  (1, 'video', 'motorway_crash.mp4', 'vid_sample01.mp4', 'severe', 0.88, 0,   TRUE,  TRUE,  NOW() - INTERVAL 1 DAY),
  (2, 'image', 'parking_scrape.jpg', 'img_sample03.jpg', 'moderate',  0.71, 42,  FALSE, FALSE, NOW() - INTERVAL 1 DAY),
  (2, 'image', 'vehicle_fire2.jpg',  'img_sample04.jpg', 'fire',   0.95, 51,  TRUE,  TRUE,  NOW() - INTERVAL 12 HOUR),
  (1, 'video', 'intersection.mp4',   'vid_sample02.mp4', 'severe', 0.83, 0,   TRUE,  FALSE, NOW() - INTERVAL 6 HOUR),
  (2, 'image', 'rear_end.jpg',       'img_sample05.jpg', 'moderate',  0.69, 35,  FALSE, FALSE, NOW() - INTERVAL 3 HOUR),
  (1, 'image', 'rollover.jpg',       'img_sample06.jpg', 'severe', 0.91, 48,  TRUE,  TRUE,  NOW() - INTERVAL 1 HOUR);

-- ─────────────────────────────────────────────────────
-- SAMPLE EMAIL ALERT LOGS
-- ─────────────────────────────────────────────────────
INSERT IGNORE INTO alerts
  (detection_id, recipient_email, subject, status, sent_at, created_at)
VALUES
  (1, 'emergency@example.com', '[EMERGENCY ALERT] FIRE Accident Detected – Event #1',   'sent',   NOW() - INTERVAL 2 DAY,   NOW() - INTERVAL 2 DAY),
  (3, 'emergency@example.com', '[EMERGENCY ALERT] SEVERE Accident Detected – Event #3', 'sent',   NOW() - INTERVAL 1 DAY,   NOW() - INTERVAL 1 DAY),
  (5, 'emergency@example.com', '[EMERGENCY ALERT] FIRE Accident Detected – Event #5',   'sent',   NOW() - INTERVAL 12 HOUR, NOW() - INTERVAL 12 HOUR),
  (6, 'emergency@example.com', '[EMERGENCY ALERT] SEVERE Accident Detected – Event #6', 'failed', NULL,                     NOW() - INTERVAL 6 HOUR),
  (8, 'emergency@example.com', '[EMERGENCY ALERT] SEVERE Accident Detected – Event #8', 'sent',   NOW() - INTERVAL 1 HOUR,  NOW() - INTERVAL 1 HOUR);

-- ─────────────────────────────────────────────────────
-- SAMPLE TWILIO CALL LOGS
-- ─────────────────────────────────────────────────────
INSERT IGNORE INTO call_logs
  (detection_id, to_number, from_number, twilio_call_sid, call_status, call_message, created_at)
VALUES
  (1, '+923001234567', '+1234567890', 'CA_seed_001', 'completed', 'Fire emergency. A vehicle fire has been detected.',        NOW() - INTERVAL 2 DAY),
  (3, '+923001234567', '+1234567890', 'CA_seed_002', 'completed', 'Severe accident emergency. Major road accident detected.', NOW() - INTERVAL 1 DAY),
  (5, '+923001234567', '+1234567890', 'CA_seed_003', 'failed',    'Fire emergency. A vehicle fire has been detected.',        NOW() - INTERVAL 12 HOUR),
  (8, '+923001234567', '+1234567890', 'CA_seed_004', 'completed', 'Severe accident emergency. Major road accident detected.', NOW() - INTERVAL 1 HOUR);

-- ─────────────────────────────────────────────────────
-- SAMPLE VIDEO PROCESSING LOGS
-- ─────────────────────────────────────────────────────
INSERT IGNORE INTO video_processing_logs
  (detection_id, total_frames, processed_frames,
  fire_frames, moderate_frames, severe_frames, no_detection_frames,
   avg_confidence, fps_processed, output_path, created_at)
VALUES
  (3, 450, 225, 0, 12, 180, 33, 0.88, 12.5, 'static/processed/vid_sample01.mp4', NOW() - INTERVAL 1 DAY),
  (6, 300, 150, 0,  8, 110, 32, 0.83, 12.5, 'static/processed/vid_sample02.mp4', NOW() - INTERVAL 6 HOUR);
