"""database.py — Async SQLAlchemy engine, session factory, and table creation."""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=False)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    """FastAPI dependency that provides a database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tables():
    """Create all tables and add any missing columns to existing tables."""
    from sqlalchemy import text, inspect as sa_inspect

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def _add_missing_columns(sync_conn):
            inspector = sa_inspect(sync_conn)
            for table_name, table in Base.metadata.tables.items():
                if not inspector.has_table(table_name):
                    continue
                existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(sync_conn.dialect)
                        default = ""
                        if col.default is not None:
                            default = f" DEFAULT {col.default.arg!r}"
                        sync_conn.execute(
                            text(f'ALTER TABLE {table_name} ADD COLUMN "{col.name}" {col_type}{default}')
                        )

        await conn.run_sync(_add_missing_columns)
