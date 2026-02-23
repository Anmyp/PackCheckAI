# src/utils/notifications.py
from aiogram import Bot
from ..config import settings

_bot_instance = None

def get_bot() -> Bot:
    global _bot_instance
    if _bot_instance is None:
        _bot_instance = Bot(token=settings.BOT_TOKEN)
    return _bot_instance

async def send_moderation_result(user_id: int, status: str):
    bot = get_bot()
    if status == "normal":
        text = "✅ Ваша посылка проверена модератором: состояние — нормальное."
    elif status == "damaged":
        text = "⚠️ Ваша посылка проверена модератором: обнаружены повреждения."
    else:
        return

    try:
        await bot.send_message(chat_id=user_id, text=text)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Не удалось отправить уведомление пользователю {user_id}: {e}")