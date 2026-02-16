import logging
import asyncio
from typing import Tuple
import random
from .database import db

logger = logging.getLogger(__name__)

class AIService:
    async def analyze_photo(self, photo_bytes: bytes, seller_id: int, file_path: str) -> Tuple[str, float, int]:
        await asyncio.sleep(1.2)
        
        result = random.choice([
            ("normal", 0.92),
            ("normal", 0.88),
            ("damaged", 0.87),
            ("damaged", 0.79),
            ("review", 0.61)
        ])
        
        status, confidence = result
        
        # Сохраняем фото
        photo_id = await self._save_photo(seller_id, file_path, len(photo_bytes))
        
        # Сохраняем результат ИИ
        await self._save_ai_result(photo_id, status, confidence)
        
        logger.info(f"✅ Результат: {status} ({confidence:.0%}), photo_id={photo_id}")
        return status, confidence, photo_id
    
    async def _save_photo(self, seller_id: int, file_path: str, file_size: int) -> int:
        query = """
            INSERT INTO photos (seller_id, file_path, file_size)
            VALUES ($1, $2, $3)
            RETURNING id
        """
        row = await db.fetchrow(query, seller_id, file_path, file_size)
        return row['id']
    
    async def _save_ai_result(self, photo_id: int, ai_result: str, ai_confidence: float):
        query = """
            INSERT INTO ai_results (photo_id, ai_model_id, ai_result, ai_confidence)
            VALUES ($1, 1, $2, $3)
        """
        await db.execute(query, photo_id, ai_result, ai_confidence)

ai_service = AIService()