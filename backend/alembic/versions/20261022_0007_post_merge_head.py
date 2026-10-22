"""post-merge linear head after F02 planning and AI analysis merge

Revision ID: 20261022_0007
Revises: 20261022_0006
Create Date: 2026-10-22 12:00:00.000000
"""
from typing import Sequence, Union


revision: str = '20261022_0007'
down_revision: Union[str, Sequence[str], None] = '20261022_0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Schema marker only: gives the merged graph a single-parent head. No schema change.
    pass


def downgrade() -> None:
    # Reverts to the merge point only; forward-only F02 migrations are not rolled back.
    pass
