import logging
from aiogram import Router
from aiogram.types import Message
from datetime import datetime
from ..database import db

router = Router()
logger = logging.getLogger(__name__)

@router.message(lambda msg: msg.text and msg.text.strip() == "📋 Мои проверки")
async def show_history(message: Message):
    logger.info(f"Кнопка 'Мои проверки' нажата пользователем {message.from_user.id}")
    
    query = """
        SELECT 
            p.id,
            p.uploaded_at,
            ar.ai_result,
            ar.ai_confidence,
            c.final_result
        FROM photos p
        INNER JOIN users u ON p.seller_id = u.id
        INNER JOIN ai_results ar ON p.id = ar.photo_id
        LEFT JOIN corrections c ON p.id = c.photo_id
        WHERE u.telegram_id = $1 AND p.is_deleted = FALSE
        ORDER BY p.uploaded_at DESC
        LIMIT 5
    """
    
    rows = await db.fetch(query, message.from_user.id)
    
    if not rows:
        await message.answer("📭 У вас пока нет проверенных посылок.\nОтправьте фото, чтобы начать!")
        return
    
    text = "📦 <b>Ваши последние проверки:</b>\n\n"
    for i, row in enumerate(rows, 1):
        dt = row['uploaded_at']
        time_str = dt.strftime("%d.%m %H:%M")
        final_status = row['final_result'] or row['ai_result']
        emoji = "✅" if final_status == "normal" else "⚠️" if final_status == "damaged" else "🔍"
        text += f"{i}. {time_str} — {emoji} {final_status}\n"
    
    await message.answer(text, parse_mode="HTML")