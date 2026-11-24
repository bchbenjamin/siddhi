"""Bind student portal accounts to student records.
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20261123_student_login_binding"
down_revision: Union[str, Sequence[str], None] = "20261115_therapy_duration_bounds"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # SQLite does not support ALTER for constraints; use batch mode.
    with op.batch_alter_table('students') as batch_op:
        batch_op.add_column(sa.Column('login_user_id', postgresql.UUID(as_uuid=True), nullable=True))
        batch_op.create_foreign_key('fk_students_login_user_id_users', 'users', ['login_user_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_students_login_user_id', ['login_user_id'], unique=True)

def downgrade() -> None:
    with op.batch_alter_table('students') as batch_op:
        batch_op.drop_index('ix_students_login_user_id')
        batch_op.drop_constraint('fk_students_login_user_id_users', type_='foreignkey')
        batch_op.drop_column('login_user_id')
