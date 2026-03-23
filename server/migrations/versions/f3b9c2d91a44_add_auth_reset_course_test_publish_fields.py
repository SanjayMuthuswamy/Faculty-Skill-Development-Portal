"""add auth reset related course/test publish metadata fields

Revision ID: f3b9c2d91a44
Revises: d2c4a9f8b123
Create Date: 2026-03-23 16:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f3b9c2d91a44"
down_revision: Union[str, Sequence[str], None] = "d2c4a9f8b123"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("short_description", sa.String(), nullable=True))
    op.add_column("courses", sa.Column("prerequisites", sa.JSON(), nullable=True))
    op.add_column("courses", sa.Column("learning_outcomes", sa.JSON(), nullable=True))
    op.add_column(
        "courses",
        sa.Column("estimated_weeks", sa.Integer(), nullable=False, server_default="1"),
    )

    op.add_column("tests", sa.Column("short_description", sa.String(), nullable=True))
    op.add_column("tests", sa.Column("instructions", sa.String(), nullable=True))
    op.add_column("tests", sa.Column("tags", sa.JSON(), nullable=True))
    op.add_column(
        "tests",
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.alter_column("courses", "estimated_weeks", server_default=None)
    op.alter_column("tests", "is_published", server_default=None)


def downgrade() -> None:
    op.drop_column("tests", "is_published")
    op.drop_column("tests", "tags")
    op.drop_column("tests", "instructions")
    op.drop_column("tests", "short_description")

    op.drop_column("courses", "estimated_weeks")
    op.drop_column("courses", "learning_outcomes")
    op.drop_column("courses", "prerequisites")
    op.drop_column("courses", "short_description")
