"""Add attempt evaluation columns

Revision ID: b91d8a6c4e7f
Revises: 7c5a3f1a9b2d
Create Date: 2026-03-14 15:12:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b91d8a6c4e7f"
down_revision: Union[str, Sequence[str], None] = "7c5a3f1a9b2d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _get_columns(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if table_name not in table_names:
        return set()
    return {col["name"] for col in inspector.get_columns(table_name)}


def upgrade() -> None:
    """Upgrade schema."""
    columns = _get_columns("attempts")
    if not columns:
        return

    additions = [
        ("correct_count", sa.Integer(), "0"),
        ("incorrect_count", sa.Integer(), "0"),
        ("unanswered_count", sa.Integer(), "0"),
        ("time_taken_seconds", sa.Integer(), "0"),
    ]

    for column_name, column_type, default_value in additions:
        if column_name in columns:
            continue
        op.add_column(
            "attempts",
            sa.Column(column_name, column_type, nullable=False, server_default=default_value),
        )
        op.alter_column("attempts", column_name, server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    columns = _get_columns("attempts")
    for column_name in [
        "time_taken_seconds",
        "unanswered_count",
        "incorrect_count",
        "correct_count",
    ]:
        if column_name in columns:
            op.drop_column("attempts", column_name)
