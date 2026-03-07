from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    DEFAULT_MODEL: str = "anthropic/claude-3.5-sonnet"
    DATABASE_URL: str = "postgresql+asyncpg://healthprior:healthprior_dev@postgres:5432/healthprior"
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "https://healthprior.volskyi-dmytro.com,http://localhost:3000,http://localhost:3100"
    MCP_SERVER_URL: str = "http://mcp-server:8001"
    TESTING: bool = False

    @property
    def CORS_ORIGINS_LIST(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
