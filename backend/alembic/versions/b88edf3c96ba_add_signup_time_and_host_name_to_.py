from alembic import op
import sqlalchemy as sa

revision = 'b88edf3c96ba'
down_revision = '863ba6541359'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('mic_series', sa.Column('signup_time', sa.Time(), nullable=True))
    op.add_column('mic_series', sa.Column('host_name', sa.String(), nullable=True))

def downgrade():
    op.drop_column('mic_series', 'host_name')
    op.drop_column('mic_series', 'signup_time')
