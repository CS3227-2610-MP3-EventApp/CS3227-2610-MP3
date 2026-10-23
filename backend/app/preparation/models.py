from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, BigInteger, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class PreparationDocument(Base):
    """One independently versioned, atomically replaced preparation document."""

    __tablename__ = "preparation_documents"
    __table_args__ = (CheckConstraint("revision >= 2", name="ck_preparation_documents_revision"),)

    participation_id: Mapped[UUID] = mapped_column(
        ForeignKey("event_participations.id", ondelete="CASCADE"), primary_key=True)
    id: Mapped[UUID] = mapped_column(default=uuid4, unique=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    tasks: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    overall_limit_minor_units: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    budget_lines: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    updated_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
