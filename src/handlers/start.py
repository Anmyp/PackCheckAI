from aiogram import Router
from aiogram.types import Message
from aiogram.filters import Command
from ..utils.keyboards import get_main_menu, get_marketplace_menu
from ..database import db

router = Router()

@router.message(Command("start"))
async def cmd_start(message: Message):
    # Проверяем/создаём продавца при первом запуске
    user_check_query = "SELECT id FROM users WHERE telegram_id = $1 AND role_id = 1"
    user_row = await db.fetchrow(user_check_query, message.from_user.id)
    
    if not user_row:
        insert_user_query = """
            INSERT INTO users (telegram_id, role_id, full_name, is_active, created_at)
            VALUES ($1, 1, $2, TRUE, NOW())
            RETURNING id
        """
        await db.fetchrow(
            insert_user_query,
            message.from_user.id,
            message.from_user.full_name or f"User {message.from_user.id}"
        )
    
    await message.answer(
        "📦 Система верификации посылок\n\n"
        "Отправь фото посылки — я проверю её на повреждения!\n"
        "Работает мгновенно ⚡",
        reply_markup=get_main_menu(),
        parse_mode="HTML"
    )

@router.message(lambda msg: msg.text == "👤 Профиль")
async def cmd_profile(message: Message):
    # Получаем данные продавца
    query = """
        SELECT 
            u.full_name,
            u.telegram_id,
            u.email,
            u.created_at,
            COUNT(p.id) as total_checks,
            SUM(CASE WHEN COALESCE(c.final_result, ar.ai_result) = 'normal' THEN 1 ELSE 0 END) as normal_count,
            SUM(CASE WHEN COALESCE(c.final_result, ar.ai_result) = 'damaged' THEN 1 ELSE 0 END) as damaged_count,
            SUM(CASE WHEN COALESCE(c.final_result, ar.ai_result) = 'review' THEN 1 ELSE 0 END) as review_count
        FROM users u
        LEFT JOIN photos p ON u.id = p.seller_id
        LEFT JOIN ai_results ar ON p.id = ar.photo_id
        LEFT JOIN corrections c ON p.id = c.photo_id
        WHERE u.telegram_id = $1 AND u.role_id = 1
        GROUP BY u.id, u.full_name, u.telegram_id, u.email, u.created_at
    """
    user = await db.fetchrow(query, message.from_user.id)
    
    if not user:
        await message.answer("❌ Профиль не найден. Нажмите /start для регистрации.")
        return
    
    total = user["total_checks"] or 0
    normal = user["normal_count"] or 0
    damaged = user["damaged_count"] or 0
    review = user["review_count"] or 0
    
    normal_percent = round(normal / total * 100, 1) if total > 0 else 0
    damaged_percent = round(damaged / total * 100, 1) if total > 0 else 0
    review_percent = round(review / total * 100, 1) if total > 0 else 0
    
    profile_text = (
        f"👤 <b>Ваш профиль</b>\n\n"
        f"Имя: {user['full_name']}\n"
        f"Telegram ID: <code>{user['telegram_id']}</code>\n"
        f"Email: {user['email'] or 'не указан'}\n"
        f"Зарегистрирован: {user['created_at'].strftime('%d.%m.%Y')}\n\n"
        f"📊 <b>Статистика проверок</b>\n"
        f"Всего: {total}\n"
        f"✅ Норма: {normal} ({normal_percent}%)\n"
        f"⚠️ Повреждено: {damaged} ({damaged_percent}%)\n"
        f"🔍 На проверке: {review} ({review_percent}%)"
    )
    
    await message.answer(profile_text, parse_mode="HTML", reply_markup=get_main_menu())

@router.message(lambda msg: msg.text == "📋 Мои проверки")
async def cmd_history(message: Message):
    query = """
        SELECT 
            p.id,
            p.uploaded_at,
            COALESCE(c.final_result, ar.ai_result) as status,
            p.marketplace
        FROM photos p
        LEFT JOIN ai_results ar ON p.id = ar.photo_id
        LEFT JOIN corrections c ON p.id = c.photo_id
        WHERE p.seller_id = (SELECT id FROM users WHERE telegram_id = $1 AND role_id = 1)
          AND p.is_deleted = FALSE
        ORDER BY p.uploaded_at DESC
        LIMIT 10
    """
    rows = await db.fetch(query, message.from_user.id)
    
    if not rows:
        await message.answer(
            "📭 У вас пока нет проверенных посылок.\n\n"
            "Отправьте фото посылки, чтобы начать!",
            reply_markup=get_main_menu()
        )
        return
    
    history_text = "📋 <b>Ваши последние проверки</b>\n\n"
    for row in rows:
        status_emoji = "✅" if row["status"] == "normal" else "⚠️" if row["status"] == "damaged" else "🔍"
        marketplace_emoji = {
            "aliexpress": "📦",
            "wildberries": "🟣",
            "ozon": "🔵",
            "yandex": "🟡"
        }.get(row["marketplace"], "📦")
        
        history_text += (
            f"{status_emoji} ID {row['id']} | {row['uploaded_at'].strftime('%d.%m %H:%M')}\n"
            f"   {marketplace_emoji} {row['marketplace'].capitalize()} | Статус: {row['status']}\n\n"
        )
    
    history_text += "ℹ️ Последние 10 проверок"
    
    await message.answer(history_text, parse_mode="HTML", reply_markup=get_main_menu())

@router.message(lambda msg: msg.text == "ℹ️ Помощь")
async def cmd_help(message: Message):
    await message.answer(
        "📦 <b>Как пользоваться системой верификации:</b>\n\n"
        "1️⃣ Упакуйте товар в коробку/пакет\n"
        "2️⃣ Сфотографируйте посылку\n"
        "3️⃣ Нажмите «📸 Отправить фото» и отправьте изображение в чат\n"
        "4️⃣ Выберите маркетплейс из списка\n"
        "5️⃣ Через 3-5 секунд получите результат:\n\n"
        "   ✅ <b>Нормально</b> — посылка готова к отправке\n"
        "   ⚠️ <b>Повреждено</b> — замените упаковку перед отправкой\n"
        "   🔍 <b>Требует проверки</b> — модератор проверит вручную и уведомит вас\n\n"
        "💡 <i>Совет:</i> Делайте фото при хорошем освещении на нейтральном фоне",
        parse_mode="HTML",
        reply_markup=get_main_menu()
    )

@router.message(lambda msg: msg.text == "📸 Отправить фото")
async def cmd_send_photo(message: Message):
    await message.answer(
        "📷 Отправьте фото посылки прямо в этот чат.\n\n"
        "📸 <b>Рекомендации:</b>\n"
        "• Сфотографируйте посылку\n"
        "• Убедитесь, что углы и швы хорошо видны\n"
        "• Делайте фото при хорошем освещении\n"
        "• Фон должен быть нейтральным (стол, пол)\n\n"
        "После отправки фото выберите маркетплейс из списка 👇",
        parse_mode="HTML"
    )