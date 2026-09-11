import logging
from aiogram import Router, Bot
from aiogram.types import Message, ContentType
from aiogram.filters import Filter
import os
from datetime import datetime, timedelta
from ..config import settings
from ..ai_service import ai_service
from ..database import db
from ..utils.keyboards import get_main_menu, get_marketplace_menu

router = Router()
logger = logging.getLogger(__name__)

TEMP_PHOTOS = {}

PROCESSED_MEDIA_GROUPS = {}

class IsPhoto(Filter):
    async def __call__(self, message: Message) -> bool:
        return message.content_type == ContentType.PHOTO

@router.message(IsPhoto())
async def handle_photo(message: Message, bot: Bot):
    logger.info(f"📸 Получено фото от пользователя {message.from_user.id}")

    user_id = message.from_user.id
    if message.media_group_id is not None:
        media_group_key = (message.chat.id, message.media_group_id)
        expire_before = datetime.now() - timedelta(minutes=5)
        for key, timestamp in list(PROCESSED_MEDIA_GROUPS.items()):
            if timestamp < expire_before:
                PROCESSED_MEDIA_GROUPS.pop(key, None)

        if media_group_key in PROCESSED_MEDIA_GROUPS:
            return

        PROCESSED_MEDIA_GROUPS[media_group_key] = datetime.now()
        await message.answer(
            "❌ Отправляйте только одно фото за раз. Альбомы не поддерживаются.",
            reply_markup=get_main_menu()
        )
        return

    if user_id in TEMP_PHOTOS:
        await message.answer(
            "❌ Вы уже отправили фото. Сначала выберите маркетплейс или отмените текущую операцию.",
            reply_markup=get_marketplace_menu()
        )
        return
    
    photo = message.photo[-1]
    file = await bot.get_file(photo.file_id)
    photo_bytes = await bot.download_file(file.file_path)
    photo_bytes = photo_bytes.read() if hasattr(photo_bytes, 'read') else photo_bytes
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{message.from_user.id}_{timestamp}.jpg"
    filepath = os.path.join(settings.PHOTOS_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(photo_bytes)
    
    file_size = os.path.getsize(filepath)
    
    user_check_query = "SELECT id FROM users WHERE telegram_id = $1 AND role_id = 1"
    user_row = await db.fetchrow(user_check_query, message.from_user.id)
    
    if user_row:
        seller_id = user_row["id"]
    else:
        insert_user_query = """
            INSERT INTO users (telegram_id, role_id, full_name, is_active, created_at)
            VALUES ($1, 1, $2, TRUE, NOW())
            RETURNING id
        """
        user_row = await db.fetchrow(
            insert_user_query,
            message.from_user.id,
            message.from_user.full_name or f"User {message.from_user.id}"
        )
        seller_id = user_row["id"]
        logger.info(f"✅ Создан новый продавец: telegram_id={message.from_user.id}, seller_id={seller_id}")
    
    TEMP_PHOTOS[message.from_user.id] = {
        "filename": filename,
        "file_size": file_size,
        "seller_id": seller_id,
        "timestamp": datetime.now()
    }
    
    await message.answer(
        "📦 <b>Выберите маркетплейс</b> для этой посылки:",
        reply_markup=get_marketplace_menu(),
        parse_mode="HTML"
    )

@router.message(lambda msg: msg.text in ["📦 AliExpress", "📦 Wildberries", "📦 Ozon", "📦 Яндекс.Маркет"])
async def handle_marketplace_selection(message: Message, bot: Bot):
    marketplace_map = {
        "📦 AliExpress": "aliexpress",
        "📦 Wildberries": "wildberries",
        "📦 Ozon": "ozon",
        "📦 Яндекс.Маркет": "yandex"
    }
    
    marketplace = marketplace_map.get(message.text)
    user_id = message.from_user.id
    
    if not marketplace or user_id not in TEMP_PHOTOS:
        await message.answer(
            "❌ Ошибка выбора маркетплейса. Отправьте фото заново.",
            reply_markup=get_main_menu()
        )
        return
    
    temp_data = TEMP_PHOTOS.pop(user_id)
    filepath = os.path.join(settings.PHOTOS_DIR, temp_data["filename"])
    
    if not os.path.exists(filepath):
        await message.answer(
            "❌ Фото не найдено. Отправьте фото заново.",
            reply_markup=get_main_menu()
        )
        return
    
    query = """
    INSERT INTO photos (file_path, seller_id, file_size, uploaded_at, marketplace, is_deleted)
    VALUES ($1, $2, $3, NOW(), $4, FALSE)
    RETURNING id
    """
    row = await db.fetchrow(
        query, 
        temp_data["filename"],  
        temp_data["seller_id"], 
        temp_data["file_size"], 
        marketplace
    )
    photo_id = row["id"]
    
    logger.info(f"✅ Фото сохранено: ID={photo_id}, маркетплейс={marketplace}, файл={temp_data['filename']}")
    
    await message.answer("🔍 Анализирую фото через ИИ...", reply_markup=get_main_menu())
    
    try:
        with open(filepath, "rb") as f:
            photo_bytes = f.read()
        
        ai_result, confidence = await ai_service.analyze_photo(photo_bytes)
        
        await db.execute(
            "INSERT INTO ai_results (photo_id, ai_model_id, ai_result, ai_confidence) VALUES ($1, $2, $3, $4)",
            photo_id, 1, ai_result, confidence
        )
        
        if ai_result == "normal":
            status_emoji = "✅"
            status_text = "Нормально"
            description = "Посылка без видимых повреждений."
        elif ai_result == "damaged":
            status_emoji = "⚠️"
            status_text = "Повреждено"
            description = "Обнаружены признаки повреждений."
        else:  
            status_emoji = "🔍"
            status_text = "Требует проверки"
            description = "Сложный случай — модератор проверит вручную."

        await message.answer(
            f"{status_emoji} <b>{status_text}</b>\n\n"
            f"Уверенность ИИ: {confidence * 100:.0f}%\n\n"
            f"{description}\n\n"
            f"<i>ID проверки: {photo_id}</i>",
            parse_mode="HTML",
            reply_markup=get_main_menu()
        )
        
    except Exception as e:
        logger.error(f"Ошибка анализа ИИ: {e}")
        await message.answer(
            "❌ Ошибка при анализе фото. Попробуйте отправить другое изображение.",
            reply_markup=get_main_menu()
        )
        await db.execute("DELETE FROM photos WHERE id = $1", photo_id)
        if os.path.exists(filepath):
            os.remove(filepath)

@router.message(lambda msg: msg.text == "↩️ Отмена")
async def handle_cancel(message: Message):
    user_id = message.from_user.id
    
    if user_id in TEMP_PHOTOS:
        temp_data = TEMP_PHOTOS.pop(user_id)
        filepath = os.path.join(settings.PHOTOS_DIR, temp_data["filename"])
        
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"🗑️ Временный файл удалён: {filepath}")
    
    await message.answer(
        "❌ Операция отменена.\nОтправьте новое фото для проверки.",
        reply_markup=get_main_menu()
    )