"""
alembic/env.py – Alembic migration environment
Reads DATABASE_URL from app.config so it matches the running app
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add backend root to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.config import settings
from app.db.database import Base
import app.db.models  # noqa: F401 – register all models with Base

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url with the one from .env. Alembic uses
# ConfigParser interpolation, so URL-encoded percent signs must be escaped.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

# Target metadata for 'autogenerate'
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL to stdout)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (direct DB connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,          # detect column type changes
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
