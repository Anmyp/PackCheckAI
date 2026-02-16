import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

load_dotenv()

class Settings:
    BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
    PHOTOS_DIR = "photos"
    
    DB_HOST = os.getenv("DB_HOST", "localhost").strip()
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "packcheckai_db").strip()
    DB_USER = os.getenv("DB_USER", "postgres").strip()
    DB_PASSWORD = os.getenv("DB_PASSWORD", "").strip()
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = Settings()
os.makedirs(settings.PHOTOS_DIR, exist_ok=True)