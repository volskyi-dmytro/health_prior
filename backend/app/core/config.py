from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    OPENROUTER_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    DEFAULT_MODEL: str = "anthropic/claude-3.5-sonnet"
    DATABASE_URL: str = "postgresql+asyncpg://healthprior:healthprior_dev@postgres:5432/healthprior"
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3100"
    PUBLIC_URL: str = "https://healthprior.app"
    MCP_SERVER_URL: str = "http://mcp-server:8001"
    PAYER_AGENT_URL: str = "http://payer-agent:8200"
    TESTING: bool = False
    GITHUB_OAUTH_CLIENT_ID: str = ""
    GITHUB_OAUTH_CLIENT_SECRET: str = ""
    SESSION_SECRET_KEY: str = "dev-insecure-key-change-in-production"
    ADMIN_GITHUB_EMAIL: str = ""
    ADMIN_GITHUB_LOGIN: str = ""
    ENABLE_PDF_EXPORT: bool = True
    FHIR_SERVER_URL: str = "https://hapi.fhir.org/baseR4"

    @property
    def CORS_ORIGINS_LIST(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

settings = Settings()

def get_settings() -> Settings:
    return settings
