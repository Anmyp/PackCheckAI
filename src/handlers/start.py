from aiogram import Router
from aiogram.types import Message
from aiogram.filters import Command
from ..utils.keyboards import get_main_menu

router = Router()

@router.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer(
        "📦 Система верификации посылок\n\n"
        "Отправь фото посылки — я проверю её на повреждения!\n"
        "Работает мгновенно ⚡",
        reply_markup=get_main_menu(),
        parse_mode="HTML"
    )

@router.message(lambda msg: msg.text == "ℹ️ Помощь")
async def cmd_help(message: Message):
    await message.answer(
        "Как пользоваться:\n"
        "1. Упакуй товар и закрой коробку\n"
        "2. Сфоткай посылку со всех сторон\n"
        "3. Отправь фото сюда\n"
        "4. Через 3 секунды получишь результат:\n"
        "   ✅ Нормально — можно отправлять\n"
        "   ⚠️ Повреждено — замени упаковку\n"
        "   🔍 Требует проверки — модератор посмотрит",
        parse_mode="HTML"
    )