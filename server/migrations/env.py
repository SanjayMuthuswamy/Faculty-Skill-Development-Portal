# Alembic configuration file

from logging.config import fileConfig
import os
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# this is the Alembic Config object, which provides
# the values of the [alembic] section of the .ini file.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import models for autogenerate support
from app.db.base import Base
from app.core.config import settings
import app.models # Register models

target_metadata = Base.metadata

# Convert async database URL to sync for Alembic
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql+psycopg://")
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://")

# psycopg/libpq expects sslmode rather than asyncpg-style ssl.
parts = urlsplit(db_url)
if parts.query:
    query_pairs = parse_qsl(parts.query, keep_blank_values=True)
    has_sslmode = any(k == "sslmode" for k, _ in query_pairs)
    if not has_sslmode:
        converted = []
        changed = False
        for key, val in query_pairs:
            if key == "ssl":
                converted.append(("sslmode", val))
                changed = True
            else:
                converted.append((key, val))
        if changed:
            db_url = urlunsplit(
                (parts.scheme, parts.netloc, parts.path, urlencode(converted), parts.fragment)
            )

# Escape % for ConfigParser interpolation (e.g. URL-encoded passwords like %24).
config.set_main_option("sqlalchemy.url", db_url.replace("%", "%%"))


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
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
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
