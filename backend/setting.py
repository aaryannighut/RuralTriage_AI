from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    LOG_LEVEL: str = "info"
    DEBUG: bool = True
    DATABASE_URL: str
    GROQ_API_KEY: str = ""

    class Config:
        env_file = ".env"