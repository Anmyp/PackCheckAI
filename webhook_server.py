# webhook_server.py
from fastapi import FastAPI, Request
from aiogram import Bot, Dispatcher
from aiogram.types import Update
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from src.config import settings
from src.handlers import start_router, photo_router, history_router
from src.database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 🔥 Отключаем автоматические редиректы
app = FastAPI(docs_url=None, redoc_url=None, redirect_slashes=False)

bot = Bot(token=settings.BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()
dp.include_router(start_router)
dp.include_router(photo_router)
dp.include_router(history_router)

@app.on_event("startup")
async def on_startup():
    await db.connect()
    logger.info("✅ DB подключена")

@app.on_event("shutdown")
async def on_shutdown():
    try:
        await bot.delete_webhook(drop_pending_updates=True)
    except:
        pass
    await db.disconnect()
    logger.info("🔌 Подключение закрыто")

@app.post("/webhook")
async def webhook(request: Request):
    update = Update(**await request.json())
    await dp.feed_update(bot, update)
    return {"ok": True}  # ← должен вернуться JSON + статус 200