from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = ""
    DEFAULT_MODEL: str = "anthropic/claude-3.5-sonnet"
    PAYER_AGENT_URL: str = "http://payer-agent:8200"

    class Config:
        env_file = ".env"


settings = Settings()
