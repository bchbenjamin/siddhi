"""Add faculty IDs for staff login.

Revision ID: 1b6c4a1f2d3e
Revises: 8fee2c7bca17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1b6c4a1f2d3e"
down_revision: Union[str, Sequence[str], None] = "8fee2c7bca17"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("faculty_id", sa.String(length=50), nullable=True))
    op.create_index("ix_users_faculty_id", "users", ["faculty_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_faculty_id", table_name="users")
    op.drop_column("users", "faculty_id")
