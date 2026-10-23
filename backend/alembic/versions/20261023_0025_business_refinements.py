"""Separate setup publication and add the optional overall budget limit."""
from alembic import op
import sqlalchemy as sa
revision = "20261023_0025"
down_revision = "20261023_0024"
branch_labels = depends_on = None

def upgrade():
    op.add_column("preparation_documents", sa.Column("overall_limit_minor_units", sa.BigInteger(), nullable=True))
    for column in [sa.Column("published_revision", sa.Integer(), nullable=False, server_default="1"), sa.Column("published_draft_revision", sa.Integer()), sa.Column("published_booth_label", sa.Text()), sa.Column("published_setup_instructions", sa.Text()), sa.Column("published_at", sa.DateTime(timezone=True))]:
        op.add_column("participation_setup", column)
    op.execute("UPDATE participation_setup SET published_revision=revision, published_draft_revision=revision, published_booth_label=booth_label, published_setup_instructions=setup_instructions, published_at=updated_at")

def downgrade():
    for name in ["published_at", "published_setup_instructions", "published_booth_label", "published_draft_revision", "published_revision"]:
        op.drop_column("participation_setup", name)
    op.drop_column("preparation_documents", "overall_limit_minor_units")
