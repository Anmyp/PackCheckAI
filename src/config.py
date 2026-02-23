import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Загружаем переменные из .env файла
load_dotenv()

class Settings:
    # Токен бота из переменных окружения
    BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
    
    # API ключ OpenAI из переменных окружения (а не из кода!)
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
    
    # Модель OpenAI (можно тоже вынести в .env, если нужно)
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o").strip()
    
    # Директория для фото
    PHOTOS_DIR = "photos"
    
    # Настройки базы данных
    DB_HOST = os.getenv("DB_HOST", "localhost").strip()
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "packcheckai_db").strip()
    DB_USER = os.getenv("DB_USER", "postgres").strip()
    DB_PASSWORD = os.getenv("DB_PASSWORD", "").strip()
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

# Создаем экземпляр настроек
settings = Settings()

# Создаем директорию для фото, если её нет
os.makedirs(settings.PHOTOS_DIR, exist_ok=True)