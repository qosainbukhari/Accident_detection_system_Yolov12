"""Remove the Twilio-specific call SID name from local call audit logs."""
from alembic import op


revision = "005_remove_twilio_call_sid"
down_revision = "004_detected_class_varchar"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "mysql":
        op.execute("ALTER TABLE call_logs CHANGE twilio_call_sid call_sid VARCHAR(50) NULL")
    elif bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE call_logs RENAME COLUMN twilio_call_sid TO call_sid")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "mysql":
        op.execute("ALTER TABLE call_logs CHANGE call_sid twilio_call_sid VARCHAR(50) NULL")
    elif bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE call_logs RENAME COLUMN call_sid TO twilio_call_sid")
