"""Bound therapy session durations to realistic values.

Revision ID: 20261115_therapy_duration_bounds
Revises: 1b6c4a1f2d3e
Create Date: 2026-11-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '20261115_therapy_duration_bounds'
down_revision: Union[str, Sequence[str], None] = '1b6c4a1f2d3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The seeded workspace is synthetic test data. Normalize obviously invalid
    # entries before adding the database-level guard so the migration is safe.
    op.execute("UPDATE therapy_sessions SET duration_minutes = 60 WHERE duration_minutes > 480")
    op.execute("UPDATE therapy_sessions SET duration_minutes = 1 WHERE duration_minutes < 1")
    with op.batch_alter_table('therapy_sessions') as batch_op:
        batch_op.create_check_constraint(
            'ck_therapy_sessions_duration_minutes',
            sa.text('duration_minutes BETWEEN 1 AND 480'),
        )


def downgrade() -> None:
    op.drop_constraint('ck_therapy_sessions_duration_minutes', 'therapy_sessions', type_='check')
