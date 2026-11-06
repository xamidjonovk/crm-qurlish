from functools import lru_cache

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: SecretStr
    cors_origins: list[str] = ["http://localhost:3000"]
    environment: str = "development"
    allowed_hosts: list[str] = ["localhost", "127.0.0.1", "testserver"]
    jwt_secret: SecretStr
    access_minutes: int = 15
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    @model_validator(mode="after")
    def validate_settings(self):
        if not self.database_url.get_secret_value().startswith("postgresql+psycopg://"):
            raise ValueError("Use PostgreSQL with psycopg")
        if len(self.jwt_secret.get_secret_value()) < 40:
            raise ValueError("JWT_SECRET needs at least 40 random characters")
        if self.environment == "production" and any(
            not s.startswith("https://") for s in self.cors_origins
        ):
            raise ValueError("Production needs explicit HTTPS origins")
        return self


@lru_cache
def settings():
    return Settings()
