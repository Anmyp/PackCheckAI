import asyncpg
from typing import Optional
from config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self):
        self.pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=1,
            max_size=10,
            command_timeout=60
        )
        logger.info("✅ Подключение к БД установлено (бэкенд)")
    
    async def disconnect(self):
        if self.pool:
            await self.pool.close()
            logger.info("🔌 Подключение к БД закрыто (бэкенд)")
    
    async def execute(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)
    
    async def fetch(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)
    
    async def fetchrow(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

db = Database()