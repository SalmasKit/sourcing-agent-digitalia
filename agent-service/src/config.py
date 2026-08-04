"""
config.py — Centralized Pydantic Settings for Digitalia Sourcing Agent.
"""
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service
    app_host: str = "0.0.0.0"
    app_port: int = 8001
    app_env: str = "development"
    debug: bool = True

    # Groq LLM
    groq_api_key: str = Field(default="", description="Groq API key — required for LLM inference")
    groq_model: str = "llama-3.3-70b-versatile"
    groq_temperature: float = 0.1
    groq_max_tokens: int = 4096

    # Database
    database_url: str = "postgresql+asyncpg://sourcing_user:sourcing_password@localhost:5433/sourcing_db"

    # Data source
    serpapi_api_key: str = ""
    use_mock_data: bool = True

    # Embeddings
    embedding_model: str = "all-MiniLM-L6-v2"

    # Spring Boot callback
    spring_boot_url: str = "http://localhost:8080"

    @property
    def has_serpapi(self) -> bool:
        return bool(self.serpapi_api_key and self.serpapi_api_key.strip())

    @property
    def effective_use_mock(self) -> bool:
        return self.use_mock_data or not self.has_serpapi


@lru_cache
def get_settings() -> Settings:
    return Settings()
