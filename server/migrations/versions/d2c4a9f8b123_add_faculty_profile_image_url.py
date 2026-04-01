"""add_faculty_profile_image_url

Revision ID: d2c4a9f8b123
Revises: b91d8a6c4e7f
Create Date: 2026-03-14 21:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d2c4a9f8b123"
down_revision: Union[str, Sequence[str], None] = "b91d8a6c4e7f"
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
    columns = _get_columns("faculty_profiles")
    if "profile_image_url" not in columns:
        op.add_column("faculty_profiles", sa.Column("profile_image_url", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    columns = _get_columns("faculty_profiles")
    if "profile_image_url" in columns:
        op.drop_column("faculty_profiles", "profile_image_url")
