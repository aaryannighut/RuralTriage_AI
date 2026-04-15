import os
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    LOG_LEVEL: str
    DEBUG: bool
    DATABASE_URL: str
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_UPLOAD_PRESET: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,https://ruralcare-rust.vercel.app"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env = os.environ.get("APP_CONFIG_FILE", "dev")
        env_file = Path(__file__).parent / f"config/{env}.env"
        case_sensitive = True
