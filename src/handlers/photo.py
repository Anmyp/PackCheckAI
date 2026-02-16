import logging
from aiogram import Router, Bot
from aiogram.types import Message
from aiogram.filters import Filter
import os
from datetime import datetime
from ..config import settings
from ..ai_service import ai_service
from ..database import db

router = Router()
logger = logging.getLogger(__name__)

class IsPhoto(Filter):
    async def __call__(self, message: Message) -> bool:
        return message.content_type == "photo"

@router.message(IsPhoto())
async def handle_photo(message: Message, bot: Bot):
    logger.info(f"📸 Получено фото от пользователя {message.from_user.id}")
    
    # Скачиваем фото
    photo = message.photo[-1]
    file = await bot.get_file(photo.file_id)
    photo_bytes = await bot.download_file(file.file_path)
    photo_bytes = photo_bytes.read() if hasattr(photo_bytes, 'read') else photo_bytes
    
    # Сохраняем на диск
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{message.from_user.id}_{timestamp}.jpg"
    filepath = os.path.join(settings.PHOTOS_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(photo_bytes)
    
    # Получаем/создаем пользователя
    user_query = """
        INSERT INTO users (role_id, telegram_id, full_name)
        VALUES (1, $1, $2)
        ON CONFLICT (telegram_id) DO NOTHING
        RETURNING id
    """
    user_row = await db.fetchrow(user_query, message.from_user.id, message.from_user.full_name or "Unknown")
    
    if not user_row:
        user_row = await db.fetchrow("SELECT id FROM users WHERE telegram_id = $1", message.from_user.id)
    
    seller_id = user_row['id']
    
    # Анализ
    await message.answer("🔍 Анализирую фото через ИИ...", parse_mode="HTML")
    await bot.send_chat_action(chat_id=message.chat.id, action="upload_photo")
    
    ai_result, confidence, photo_id = await ai_service.analyze_photo(photo_bytes, seller_id, filepath)
    
    # Ответ
    if ai_result == "normal":
        status_emoji = "✅"
        status_text = "Нормально"
        description = "Посылка без видимых повреждений. Можно отправлять покупателю."
    elif ai_result == "damaged":
        status_emoji = "⚠️"
        status_text = "Повреждено"
        description = "Обнаружены признаки повреждений упаковки. Рекомендуется заменить коробку."
    else:
        status_emoji = "🔍"
        status_text = "Требует проверки"
        description = "Сложный случай — модератор проверит вручную в течение 15 минут."
    
    await message.answer(
        f"{status_emoji} <b>{status_text}</b>\n\n"
        f"Уверенность ИИ: {confidence * 100:.0f}%\n\n"
        f"{description}\n\n"
        f"<i>ID проверки: {photo_id}</i>",
        parse_mode="HTML"
    )