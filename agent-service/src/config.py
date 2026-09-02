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
    groq_model: str = "openai/gpt-oss-20b"

    groq_temperature: float = 0.1
    groq_max_tokens: int = 4096


    # Database
    database_url: str = "postgresql+asyncpg://sourcing_user:sourcing_password@localhost:5433/sourcing_db"

    # Data source
    serpapi_api_key: str = Field(default="", description="SerpAPI key — required for LinkedIn profile search")


    # Embeddings
    embedding_model: str = "all-MiniLM-L6-v2"

    # Spring Boot callback
    spring_boot_url: str = "http://localhost:8080"

    # CORS — frontend origin allowed to make cross-origin requests.
    # In production, set to the actual deployed frontend URL (no trailing slash).
    # In dev, the Vite dev server origin is added automatically alongside this.
    frontend_origin: str = Field(
        default="http://localhost:5173",
        description="Allowed frontend origin for CORS. Override in production.",
    )

    # JWT verification — must match the JWT_SECRET used by Spring Boot.
    # When empty, the security dependency logs a warning and skips validation
    # (useful for running the agent standalone without Spring Boot in dev).
    jwt_secret: str = Field(
        default="",
        description="HS256 signing secret shared with Spring Boot (hex-encoded). "
                    "Set to the same value as JWT_SECRET in the Spring Boot env.",
    )

    # Profile Enrichment (Apollo.io)
    apollo_api_key: str = Field(default="", description="Apollo.io API key for candidate enrichment")
    enrichment_enabled: bool = True
    enrichment_monthly_quota: int = 1000

    @property
    def has_serpapi(self) -> bool:
        return bool(self.serpapi_api_key and self.serpapi_api_key.strip())

    @property
    def has_enrichment(self) -> bool:
        """True when Apollo.io key is configured and enrichment is enabled."""
        has_key = bool(self.apollo_api_key and self.apollo_api_key.strip())
        return bool(has_key and self.enrichment_enabled)


@lru_cache
def get_settings() -> Settings:
    return Settings()
