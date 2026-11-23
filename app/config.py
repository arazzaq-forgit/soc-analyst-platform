import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = os.getenv("SECRET_KEY", "")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
    encryption_key: str = os.getenv("ENCRYPTION_KEY", "")
    fp_cleared_cutoff: float = float(os.getenv("FP_CLEARED_CUTOFF", 0.30))
    fp_dismiss_cutoff: float = float(os.getenv("FP_DISMISS_CUTOFF", 0.70))
    auto_dismiss_enabled: bool = os.getenv("AUTO_DISMISS_ENABLED", "false").lower() == "true"

    class Config:
     env_file = ".env"
     extra = "ignore"


settings = Settings()

if not settings.secret_key:
    raise RuntimeError(
        "SECRET_KEY is not set. Copy .env.example to .env and fill it in."
    )