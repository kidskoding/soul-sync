from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str
    anthropic_api_key: str = ""
    openai_api_key: str
    webhook_secret: str = "dev-secret"
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
