"""Add AI emergency agent reports and WhatsApp state."""
from alembic import op
import sqlalchemy as sa

revision = "002_ai_agent_integration"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "whatsapp_sent" not in {column["name"] for column in inspector.get_columns("detection_events")}:
        op.add_column("detection_events", sa.Column("whatsapp_sent", sa.Boolean(),
                                                     nullable=True, server_default=sa.text("0")))

    if "agent_reports" not in inspector.get_table_names():
        op.create_table(
            "agent_reports",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("detection_id", sa.Integer(), nullable=False, unique=True),
            sa.Column("incident_level", sa.String(20)),
            sa.Column("situation_summary", sa.Text()),
            sa.Column("visible_hazards", sa.JSON()),
            sa.Column("recommended_services", sa.JSON()),
            sa.Column("immediate_actions", sa.JSON()),
            sa.Column("casualty_risk", sa.String(20)),
            sa.Column("full_report", sa.Text()),
            sa.Column("model_used", sa.String(60)),
            sa.Column("llm_error", sa.Text()),
            sa.Column("processing_ms", sa.Integer()),
            sa.Column("whatsapp_sent", sa.Boolean(), server_default=sa.text("0")),
            sa.Column("whatsapp_sid", sa.String(64)),
            sa.Column("whatsapp_error", sa.Text()),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["detection_id"], ["detection_events.id"], ondelete="CASCADE"),
        )

    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("agent_reports")}
    if "idx_agent_reports_level" not in indexes:
        op.create_index("idx_agent_reports_level", "agent_reports", ["incident_level"])
    if "idx_agent_reports_whatsapp" not in indexes:
        op.create_index("idx_agent_reports_whatsapp", "agent_reports", ["whatsapp_sent"])


def downgrade() -> None:
    op.drop_index("idx_agent_reports_whatsapp", table_name="agent_reports")
    op.drop_index("idx_agent_reports_level", table_name="agent_reports")
    op.drop_table("agent_reports")
    op.drop_column("detection_events", "whatsapp_sent")
