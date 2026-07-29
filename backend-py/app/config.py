from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    port: int = 5000
    node_env: str = "development"

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: Optional[str] = None

    anthropic_api_key: Optional[str] = None
    openai_api_key: str
    mentor_openai_api_key: Optional[str] = None

    redis_url: str = "redis://localhost:6379"
    rapidapi_key: str = ""

    github_client_id: str = ""
    github_client_secret: str = ""
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_callback_url: Optional[str] = None
    github_callback_url: Optional[str] = None
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_callback_url: Optional[str] = None

    frontend_url: str = "http://localhost:3000"
    resume_storage_bucket: str = "resumes"
    jwt_secret: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def resolved_service_role_key(self) -> str:
        return self.supabase_service_role_key or self.supabase_anon_key


settings = Settings()
