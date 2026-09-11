print("🚀 Запуск бота...")

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.enums import ParseMode

from .config import settings
from .handlers import start_router, photo_router, history_router
from .database import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    bot = None
    session = None

    try:
        await db.connect()
        logger.info("✅ DB подключена")

        session = AiohttpSession(
            proxy="socks5://yyRZkMcA:zQ8WMyL4@172.120.189.135:63893", #Если впн не работает, то нужно вставить рабочее прокси, иначе бот не запустится
            timeout=1000,
        )

        bot = Bot(
            token=settings.BOT_TOKEN,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML),
            session=session, #Пока впн работает, не нужно использовать прокси, иначе бот не запустится
        )

        me = await bot.get_me()
        logger.info(f"✅ Бот запущен: @{me.username}")

        await bot.delete_webhook(drop_pending_updates=True)

        dp = Dispatcher()
        dp.include_router(start_router)
        dp.include_router(history_router)
        dp.include_router(photo_router)

        await dp.start_polling(bot)

    except Exception as e:
        logger.error(f"❌ Ошибка: {e}")

    finally:
        if bot is not None:
            await bot.session.close()
        elif session is not None:
            await session.close()
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())