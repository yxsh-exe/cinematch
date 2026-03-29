"""config.py — Application settings loaded from .env file."""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application configuration from environment variables."""
    DATABASE_URL: str
    JWT_SECRET: str = "change-this-to-a-random-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60

    model_config = {
        "env_file": os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"),
        "env_file_encoding": "utf-8",
    }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance (reads .env once)."""
    return Settings()
