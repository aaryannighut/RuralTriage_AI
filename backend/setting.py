from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    LOG_LEVEL: str
    DEBUG: bool
    DATABASE_URL: str

    class Config:
        env_file = ".env"