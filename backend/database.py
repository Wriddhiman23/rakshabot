import os
import logging
from dotenv import load_dotenv, find_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("rakshabot.database")

# Load environment variables from .env
dotenv_path = find_dotenv(usecwd=True)
if dotenv_path:
    load_dotenv(dotenv_path)
else:
    load_dotenv()

raw_db_url = os.getenv("DATABASE_URL")
db_url = None
if raw_db_url:
    # Ensure psycopg2 driver scheme for PostgreSQL URLs
    if raw_db_url.startswith("postgres://"):
        db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        db_url = raw_db_url

engine = None
is_postgres = False

# Try PostgreSQL (Neon) if configured
if db_url:
    try:
        pg_engine = create_engine(
            db_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 10}
        )
        # Test connection without logging connection string
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = pg_engine
        is_postgres = True
        logger.info("Successfully connected to PostgreSQL (Neon) database.")
    except Exception as e:
        # Never print or log the connection string
        logger.warning(f"PostgreSQL connection failed ({type(e).__name__}). Falling back to SQLite database.")
        engine = None

# Fallback to local SQLite database if Postgres is not configured or fails to connect
if engine is None:
    db_path = os.path.join(os.path.dirname(__file__), "rakshabot.db")
    sqlite_url = f"sqlite:///{db_path}"
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False}
    )
    logger.info("Operating with SQLite fallback database.")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables and creates hazards compatibility view"""
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            if is_postgres:
                conn.execute(text("CREATE OR REPLACE VIEW hazards AS SELECT * FROM hazard_zones;"))
            else:
                conn.execute(text("CREATE VIEW IF NOT EXISTS hazards AS SELECT * FROM hazard_zones;"))
            conn.commit()
    except Exception as e:
        logger.debug(f"View creation note: {type(e).__name__}")
