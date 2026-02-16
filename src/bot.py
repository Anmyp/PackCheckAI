import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from .config import settings
from .handlers import start_router, photo_router, history_router
from .database import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    await db.connect()
    
    bot = Bot(
        token=settings.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )
    
    await bot.delete_webhook(drop_pending_updates=True)
    logger.info("✅ Вебхук удалён")
    
    dp = Dispatcher()
    dp.include_router(start_router)
    dp.include_router(history_router)
    dp.include_router(photo_router)

    logger.info("✅ Бот запущен в режиме поллинга")
    
    try:
        await dp.start_polling(bot, skip_updates=True)
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())