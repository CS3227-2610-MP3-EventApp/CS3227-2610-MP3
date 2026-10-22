from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.settings import Settings
from app.database import Base
from app.auth import models  # noqa: F401 -- register every foundation table
from app.business import models as business_models  # noqa: F401
from app.applications import models as application_models  # noqa: F401
from app.programme import models as programme_models  # noqa: F401 -- register programme tables
from app.ai import models as ai_models  # noqa: F401 -- register analysis tables
from app.preparation import models as preparation_models  # noqa: F401 -- register preparation table
from app.setup import models as setup_models  # noqa: F401 -- register participation setup table


from app.preparation_drafts import models as preparation_draft_models

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def run_migrations_offline() -> None:
    context.configure(
        url=Settings().database_url,
        target_metadata=Base.metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(Settings().database_url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
