from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

def get_main_menu() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📸 Отправить фото")],
            [KeyboardButton(text="📋 Мои проверки")],
            [KeyboardButton(text="👤 Профиль")],
            [KeyboardButton(text="ℹ️ Помощь")]
        ],
        resize_keyboard=True,
        one_time_keyboard=False
    )

def get_marketplace_menu() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📦 AliExpress")],
            [KeyboardButton(text="📦 Wildberries")],
            [KeyboardButton(text="📦 Ozon")],
            [KeyboardButton(text="📦 Яндекс.Маркет")],
            [KeyboardButton(text="↩️ Отмена")],
        ],
        resize_keyboard=True,
        one_time_keyboard=True
    )