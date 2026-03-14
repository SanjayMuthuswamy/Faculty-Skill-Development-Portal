"""Add progress to course enrollments

Revision ID: 7c5a3f1a9b2d
Revises: 3121f8178785
Create Date: 2026-03-14 14:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7c5a3f1a9b2d"
down_revision: Union[str, Sequence[str], None] = "3121f8178785"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "course_enrollments" not in table_names:
        return

    columns = {column["name"] for column in inspector.get_columns("course_enrollments")}
    if "progress" not in columns:
        op.add_column(
            "course_enrollments",
            sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        )
        op.alter_column("course_enrollments", "progress", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "course_enrollments" not in table_names:
        return

    columns = {column["name"] for column in inspector.get_columns("course_enrollments")}
    if "progress" in columns:
        op.drop_column("course_enrollments", "progress")
