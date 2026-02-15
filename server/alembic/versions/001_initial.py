# Alembic initialization script

"""Initial migration - Create users table and enum.

Revision ID: 001_initial
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    """Create users table and configure initial schema."""
    # PostgreSQL specific: create ENUM type
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE userrole AS ENUM ('ADMIN', 'FACULTY');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("ADMIN", "FACULTY", name="userrole"),
            nullable=False,
            server_default="FACULTY",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    # Create index on email for faster lookups
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=False)


def downgrade() -> None:
    """Drop users table and enum."""
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    # Drop ENUM type
    op.execute("DROP TYPE IF EXISTS userrole;")
