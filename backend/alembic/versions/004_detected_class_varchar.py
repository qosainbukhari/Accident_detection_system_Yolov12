"""Allow no_detection and other class labels without a MySQL ENUM constraint."""
from alembic import op
import sqlalchemy as sa

revision = "004_detected_class_varchar"
down_revision = "003_incidents_reports_audit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "mysql":
        op.execute(
            "ALTER TABLE detection_events "
            "MODIFY detected_class VARCHAR(20) NOT NULL"
        )
    elif bind.dialect.name == "postgresql":
        op.alter_column(
            "detection_events",
            "detected_class",
            existing_type=sa.Enum("fire", "moderate", "severe", name="accclass"),
            type_=sa.String(20),
            existing_nullable=False,
            postgresql_using="detected_class::text",
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "mysql":
        op.execute(
            "ALTER TABLE detection_events "
            "MODIFY detected_class ENUM('fire','moderate','severe') NOT NULL"
        )
