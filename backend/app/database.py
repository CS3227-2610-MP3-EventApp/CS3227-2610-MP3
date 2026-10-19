from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.settings import Settings


engine = create_engine(Settings().database_url)
SessionLocal = sessionmaker(bind=engine)
