"""merge F02 planning and AI analysis

Revision ID: 20261022_0006
Revises: 20261021_0005, 20261021_f02
Create Date: 2026-10-22 07:49:44.728014
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20261022_0006'
down_revision: Union[str, Sequence[str], None] = ('20261021_0005', '20261021_f02')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
