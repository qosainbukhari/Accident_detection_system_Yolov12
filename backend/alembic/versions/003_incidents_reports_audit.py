"""Add incident state, location, generated report path and audit log."""
from alembic import op
import sqlalchemy as sa

revision = "003_incidents_reports_audit"
down_revision = "002_ai_agent_integration"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    detection_columns = {c["name"] for c in inspector.get_columns("detection_events")}
    for name, column in (
        ("incident_status", sa.Column("incident_status", sa.String(20), nullable=True, server_default="open")),
        ("location", sa.Column("location", sa.String(255), nullable=True, server_default="Unknown")),
    ):
        if name not in detection_columns:
            op.add_column("detection_events", column)
    report_columns = {c["name"] for c in inspector.get_columns("agent_reports")}
    if "report_path" not in report_columns:
        op.add_column("agent_reports", sa.Column("report_path", sa.String(500)))
    if "audit_log" not in inspector.get_table_names():
        op.create_table(
            "audit_log",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("detection_id", sa.Integer(), nullable=True),
            sa.Column("actor", sa.String(80), nullable=False, server_default="system"),
            sa.Column("action", sa.String(80), nullable=False),
            sa.Column("status", sa.String(20), nullable=False, server_default="success"),
            sa.Column("details", sa.JSON()),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["detection_id"], ["detection_events.id"], ondelete="SET NULL"),
        )
        op.create_index("idx_audit_log_detection", "audit_log", ["detection_id"])
        op.create_index("idx_audit_log_created", "audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_audit_log_created", table_name="audit_log")
    op.drop_index("idx_audit_log_detection", table_name="audit_log")
    op.drop_table("audit_log")
    op.drop_column("agent_reports", "report_path")
    op.drop_column("detection_events", "location")
    op.drop_column("detection_events", "incident_status")
