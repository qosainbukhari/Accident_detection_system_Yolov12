"""001_initial_schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-01-01 00:00:00.000000

Creates all 5 tables:
  users, detection_events, alerts, call_logs, video_processing_logs
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id",              sa.Integer(),     nullable=False, autoincrement=True),
        sa.Column("username",        sa.String(50),    nullable=False),
        sa.Column("email",           sa.String(100),   nullable=False),
        sa.Column("hashed_password", sa.String(255),   nullable=False),
        sa.Column("role",            sa.String(20),    nullable=True, server_default="viewer"),
        sa.Column("is_active",       sa.Boolean(),     nullable=True, server_default=sa.text("1")),
        sa.Column("created_at",      sa.DateTime(),    nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at",      sa.DateTime(),    nullable=True, server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("idx_users_username", "users", ["username"])

    # ── detection_events ───────────────────────────────────────────
    op.create_table(
        "detection_events",
        sa.Column("id",                 sa.Integer(),  nullable=False, autoincrement=True),
        sa.Column("user_id",            sa.Integer(),  nullable=True),
        sa.Column("media_type",         sa.String(10), nullable=False),
        sa.Column("original_filename",  sa.String(255),nullable=True),
        sa.Column("processed_filename", sa.String(255),nullable=True),
        sa.Column("detected_class",     sa.Enum("fire","moderate","severe"), nullable=False),
        sa.Column("confidence",         sa.Float(),    nullable=False),
        sa.Column("bounding_boxes",     sa.JSON(),     nullable=True),
        sa.Column("snapshot_path",      sa.String(500),nullable=True),
        sa.Column("total_frames",       sa.Integer(),  nullable=True),
        sa.Column("detected_frames",    sa.Integer(),  nullable=True),
        sa.Column("dominant_class",     sa.String(20), nullable=True),
        sa.Column("processing_ms",      sa.Integer(),  nullable=True),
        sa.Column("alert_sent",         sa.Boolean(),  nullable=True, server_default=sa.text("0")),
        sa.Column("call_triggered",     sa.Boolean(),  nullable=True, server_default=sa.text("0")),
        sa.Column("created_at",         sa.DateTime(), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_de_class",   "detection_events", ["detected_class"])
    op.create_index("idx_de_created", "detection_events", ["created_at"])
    op.create_index("idx_de_alert",   "detection_events", ["alert_sent"])

    # ── alerts ─────────────────────────────────────────────────────
    op.create_table(
        "alerts",
        sa.Column("id",              sa.Integer(),  nullable=False, autoincrement=True),
        sa.Column("detection_id",    sa.Integer(),  nullable=False),
        sa.Column("recipient_email", sa.String(150),nullable=True),
        sa.Column("subject",         sa.String(255),nullable=True),
        sa.Column("body",            sa.Text(),     nullable=True),
        sa.Column("status",          sa.String(20), nullable=True, server_default="pending"),
        sa.Column("error_message",   sa.Text(),     nullable=True),
        sa.Column("sent_at",         sa.DateTime(), nullable=True),
        sa.Column("created_at",      sa.DateTime(), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["detection_id"], ["detection_events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── call_logs ──────────────────────────────────────────────────
    op.create_table(
        "call_logs",
        sa.Column("id",               sa.Integer(),  nullable=False, autoincrement=True),
        sa.Column("detection_id",     sa.Integer(),  nullable=False),
        sa.Column("to_number",        sa.String(20), nullable=True),
        sa.Column("from_number",      sa.String(20), nullable=True),
        sa.Column("twilio_call_sid",  sa.String(50), nullable=True),
        sa.Column("call_status",      sa.String(30), nullable=True, server_default="initiated"),
        sa.Column("duration_seconds", sa.Integer(),  nullable=True),
        sa.Column("call_message",     sa.Text(),     nullable=True),
        sa.Column("created_at",       sa.DateTime(), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["detection_id"], ["detection_events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── video_processing_logs ──────────────────────────────────────
    op.create_table(
        "video_processing_logs",
        sa.Column("id",                   sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("detection_id",         sa.Integer(), nullable=False),
        sa.Column("total_frames",         sa.Integer(), nullable=True),
        sa.Column("processed_frames",     sa.Integer(), nullable=True),
        sa.Column("fire_frames",          sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("moderate_frames",      sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("severe_frames",        sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("no_detection_frames",  sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("avg_confidence",       sa.Float(),   nullable=True),
        sa.Column("fps_processed",        sa.Float(),   nullable=True),
        sa.Column("output_path",          sa.String(500), nullable=True),
        sa.Column("created_at",           sa.DateTime(), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["detection_id"], ["detection_events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("video_processing_logs")
    op.drop_table("call_logs")
    op.drop_table("alerts")
    op.drop_index("idx_de_alert",   "detection_events")
    op.drop_index("idx_de_created", "detection_events")
    op.drop_index("idx_de_class",   "detection_events")
    op.drop_table("detection_events")
    op.drop_index("idx_users_username", "users")
    op.drop_table("users")
