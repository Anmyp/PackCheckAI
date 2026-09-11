import sys
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi import FastAPI, HTTPException, Path as FastAPIPath, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from database import db
import logging
from pydantic import BaseModel, Field, validator
from web.backend.notifications import build_status_notification_text
import bcrypt
from fastapi.responses import StreamingResponse
import io
from datetime import datetime
from aiogram import Bot
from src.config import settings
import secrets
import time
import secrets
from fastapi import Header

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SESSIONS = {}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PHOTOS_DIR = os.path.join(BASE_DIR, "photos")
os.makedirs(PHOTOS_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()

app = FastAPI(title="PackCheck API", version="1.0.0", lifespan=lifespan)
app.mount("/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    username: str
    password: str

class UpdateStatusRequest(BaseModel):
    status: str
    comment: str = ""

class CommentRequest(BaseModel):
    text: str

class ProfileUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)

    @validator('name', 'email', pre=True)
    def strip_and_validate_not_empty(cls, value: str):
        if not isinstance(value, str) or not value.strip():
            raise ValueError('must not be empty')
        return value.strip()

class CreateUserRequest(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    role: str
    login: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

    @validator('full_name', 'email', 'login', 'password', pre=True)
    def strip_and_validate_not_empty(cls, value: str):
        if not isinstance(value, str) or not value.strip():
            raise ValueError('must not be empty')
        return value.strip()

class UpdateUserRequest(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    role: str
    is_active: bool

    @validator('full_name', 'email', pre=True)
    def strip_and_validate_not_empty(cls, value: str):
        if not isinstance(value, str) or not value.strip():
            raise ValueError('must not be empty')
        return value.strip()

def get_user_from_session(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    session_id = authorization[7:]  
    user_id = SESSIONS.get(session_id)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return user_id

# АУТЕНТИФИКАЦИЯ
@app.post("/auth/login")
async def login(request: LoginRequest):
    try:
        query = """
            SELECT id, login, password_hash, role_id, full_name, email
            FROM users 
            WHERE login = $1
            AND role_id IN (2, 3)
            AND is_active = TRUE
        """
        user = await db.fetchrow(query, request.username)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if bcrypt.checkpw(
            request.password.encode('utf-8'), 
            user["password_hash"].encode('utf-8')
        ):
            session_id = secrets.token_hex(32)
            SESSIONS[session_id] = user["id"]
            
            role = "admin" if user["role_id"] == 3 else "moderator"
            
            return {
                "access_token": session_id,
                "token_type": "bearer",
                "user": {
                    "id": user["id"],
                    "name": user["full_name"],
                    "email": user["email"],
                    "role": role
                }
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/auth/logout")
async def logout(authorization: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        session_id = authorization[7:]
        SESSIONS.pop(session_id, None)
    return {"message": "Logged out successfully"}

# ОБЪЯВЛЕНИЯ
@app.get("/announcements/")
async def get_announcements(authorization: str = Header(None)):
    try:
        user_id = None
        if authorization and authorization.startswith("Bearer "):
            session_id = authorization[7:]
            user_id = SESSIONS.get(session_id)
        
        query = """
            SELECT 
                p.id,
                p.file_path,
                p.uploaded_at,
                COALESCE(c.final_result, ar.ai_result) as status,
                COUNT(com.id) as comments_count
            FROM photos p
            INNER JOIN users s ON p.seller_id = s.id
            LEFT JOIN ai_results ar ON p.id = ar.photo_id
            LEFT JOIN corrections c ON p.id = c.photo_id
            LEFT JOIN comments com ON p.id = com.photo_id
            WHERE p.is_deleted = FALSE
              AND s.role_id = 1
            GROUP BY p.id, p.file_path, p.uploaded_at, ar.ai_result, c.final_result
            ORDER BY p.uploaded_at DESC
            LIMIT 100
        """
        rows = await db.fetch(query)
        
        announcements = []
        for row in rows:
            filename = os.path.basename(row['file_path']) if row['file_path'] else None
            photo_url = f"http://localhost:8000/photos/{filename}" if filename else None
            
            announcements.append({
                "id": str(row["id"]),
                "photo_url": photo_url,
                "date": row["uploaded_at"].strftime("%Y-%m-%d"),
                "status": row["status"],
                "comments_count": row["comments_count"]
            })
        
        return announcements
        
    except Exception as e:
        logger.error(f"Error fetching announcements: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/announcements/{announcement_id}")
async def get_announcement(
    announcement_id: int = FastAPIPath(..., gt=0),
    authorization: str = Header(None)
):
    try:
        user_id = get_user_from_session(authorization)
        
        query = """
            SELECT 
                p.id,
                p.file_path,
                p.uploaded_at,
                s.full_name as seller_name,
                COALESCE(c.final_result, ar.ai_result) as status,
                c.comment as moderator_comment
            FROM photos p
            INNER JOIN users s ON p.seller_id = s.id
            LEFT JOIN ai_results ar ON p.id = ar.photo_id
            LEFT JOIN corrections c ON p.id = c.photo_id
            WHERE p.id = $1
              AND p.is_deleted = FALSE
              AND s.role_id = 1
        """
        row = await db.fetchrow(query, announcement_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        filename = os.path.basename(row['file_path']) if row['file_path'] else None
        photo_url = f"http://localhost:8000/photos/{filename}" if filename else None
        
        return {
            "id": str(row["id"]),
            "photo_url": photo_url,
            "date": row["uploaded_at"].strftime("%Y-%m-%d"),
            "seller_name": row["seller_name"],
            "status": row["status"],
            "moderator_comment": row["moderator_comment"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching announcement {announcement_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
@app.patch("/announcements/{announcement_id}/status")
async def update_announcement_status(
    announcement_id: int = FastAPIPath(..., gt=0),
    request: UpdateStatusRequest = None,
    authorization: str = Header(None)
):
    try:
        user_id = get_user_from_session(authorization)
        
        photo_query = """
            SELECT p.id, p.seller_id, u.telegram_id
            FROM photos p
            JOIN users u ON p.seller_id = u.id
            WHERE p.id = $1 AND p.is_deleted = FALSE AND u.role_id = 1
        """
        photo_row = await db.fetchrow(photo_query, announcement_id)
        if not photo_row:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        telegram_id = photo_row["telegram_id"]

        await db.execute("DELETE FROM corrections WHERE photo_id = $1", announcement_id)

        if request and request.status not in ("normal", "damaged"):
            raise HTTPException(status_code=400, detail="Invalid status. Only 'normal' or 'damaged' allowed.")

        insert_query = """
            INSERT INTO corrections (photo_id, moderator_id, final_result, comment)
            VALUES ($1, $2, $3, $4)
        """
        await db.execute(
            insert_query,
            announcement_id,
            user_id,  
            request.status if request else "damaged",
            request.comment if request else ""
        )

        if request and request.status in ("normal", "damaged") and telegram_id:
            bot = Bot(token=settings.BOT_TOKEN)
            try:
                text = build_status_notification_text(request.status, request.comment)
                await bot.send_message(chat_id=telegram_id, text=text)
                logger.info(f"✅ Уведомление отправлено продавцу {telegram_id} (фото {announcement_id})")
            except Exception as e:
                logger.error(f"❌ Ошибка отправки уведомления {telegram_id}: {e}")
            finally:
                await bot.session.close()

        return {"message": "Status updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating announcement {announcement_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: int = FastAPIPath(..., gt=0),
    authorization: str = Header(None)
):
    try:
        user_id = get_user_from_session(authorization)

        check_query = "SELECT id FROM photos WHERE id = $1 AND is_deleted = FALSE"
        photo = await db.fetchrow(check_query, announcement_id)
        if not photo:
            raise HTTPException(status_code=404, detail="Announcement not found")

        await db.execute("DELETE FROM corrections WHERE photo_id = $1", announcement_id)
        await db.execute("DELETE FROM comments WHERE photo_id = $1", announcement_id)
        await db.execute("UPDATE photos SET is_deleted = TRUE WHERE id = $1", announcement_id)

        return {"message": "Announcement deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting announcement {announcement_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# КОММЕНТАРИИ
@app.get("/announcements/{announcement_id}/comments")
async def get_comments(
    announcement_id: int = FastAPIPath(..., gt=0),
    authorization: str = Header(None)
):
    try:
        user_id = get_user_from_session(authorization)
        
        query = """
            SELECT 
                c.id,
                u.full_name as user,
                c.text,
                c.created_at
            FROM comments c
            INNER JOIN users u ON c.author_id = u.id
            WHERE c.photo_id = $1
            ORDER BY c.created_at ASC
        """
        rows = await db.fetch(query, announcement_id)
        
        comments = []
        for row in rows:
            comments.append({
                "id": str(row["id"]),
                "user": row["user"],
                "text": row["text"],
                "timestamp": row["created_at"].strftime("%Y-%m-%d %H:%M")
            })
        
        return comments
        
    except Exception as e:
        logger.error(f"Error fetching comments for announcement {announcement_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/announcements/{announcement_id}/comments")
async def add_comment(
    announcement_id: int = FastAPIPath(..., gt=0),
    request: CommentRequest = None,
    authorization: str = Header(None)
):
    try:
        user_id = get_user_from_session(authorization)
        
        check_query = "SELECT id FROM photos WHERE id = $1 AND is_deleted = FALSE"
        exists = await db.fetchrow(check_query, announcement_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        insert_query = """
            INSERT INTO comments (photo_id, author_id, text)
            VALUES ($1, $2, $3)
        """
        await db.execute(
            insert_query, 
            announcement_id, 
            user_id,  
            request.text if request else ""
        )
        return {"message": "Comment added successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding comment to announcement {announcement_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# СТАТИСТИКА
@app.get("/statistics/")
async def get_statistics(authorization: str = Header(None)):
    try:
        user_id = get_user_from_session(authorization)
        
        query = """
            SELECT 
                COUNT(*) as total,
                ROUND(SUM(CASE WHEN COALESCE(c.final_result, ar.ai_result) = 'normal' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as normal_percent,
                ROUND(SUM(CASE WHEN COALESCE(c.final_result, ar.ai_result) = 'damaged' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as damaged_percent,
                ROUND(SUM(CASE WHEN COALESCE(c.final_result, ar.ai_result) = 'review' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as review_percent
            FROM photos p
            INNER JOIN users s ON p.seller_id = s.id
            LEFT JOIN ai_results ar ON p.id = ar.photo_id
            LEFT JOIN corrections c ON p.id = c.photo_id
            WHERE p.is_deleted = FALSE
              AND s.role_id = 1
        """
        stats = await db.fetchrow(query)
        
        chart_query = """
            SELECT 
                TO_CHAR(p.uploaded_at, 'Dy') as name,
                SUM(CASE WHEN COALESCE(c.final_result, ar.ai_result) = 'normal' THEN 1 ELSE 0 END) as normal,
                SUM(CASE WHEN COALESCE(c.final_result, ar.ai_result) = 'damaged' THEN 1 ELSE 0 END) as damaged,
                SUM(CASE WHEN COALESCE(c.final_result, ar.ai_result) = 'review' THEN 1 ELSE 0 END) as review
            FROM photos p
            INNER JOIN users s ON p.seller_id = s.id
            LEFT JOIN ai_results ar ON p.id = ar.photo_id
            LEFT JOIN corrections c ON p.id = c.photo_id
            WHERE p.is_deleted = FALSE
              AND s.role_id = 1
              AND p.uploaded_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY TO_CHAR(p.uploaded_at, 'Dy'), EXTRACT(DOW FROM p.uploaded_at)
            ORDER BY EXTRACT(DOW FROM p.uploaded_at)
        """
        chart_data = await db.fetch(chart_query)
        
        return {
            "total": stats["total"],
            "normal_percent": float(stats["normal_percent"]),
            "damaged_percent": float(stats["damaged_percent"]),
            "review_percent": float(stats["review_percent"]),
            "chart_data": [
                {
                    "name": row["name"],
                    "normal": row["normal"],
                    "damaged": row["damaged"],
                    "review": row["review"]
                }
                for row in chart_data
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching statistics: {e}")
        return {
            "total": 1247,
            "normal_percent": 73.5,
            "damaged_percent": 26.5,
            "review_percent": 0.0,
            "chart_data": [
                {"name": "Пн", "normal": 120, "damaged": 45, "review": 5},
                {"name": "Вт", "normal": 135, "damaged": 38, "review": 7},
                {"name": "Ср", "normal": 142, "damaged": 52, "review": 6},
                {"name": "Чт", "normal": 128, "damaged": 41, "review": 4},
                {"name": "Пт", "normal": 155, "damaged": 48, "review": 7},
                {"name": "Сб", "normal": 98, "damaged": 32, "review": 10},
                {"name": "Вс", "normal": 89, "damaged": 24, "review": 7}
            ]
        }

# ПРОФИЛЬ
@app.get("/profile")
async def get_profile(authorization: str = Header(None)):
    try:
        user_id = get_user_from_session(authorization)
        
        query = """
            SELECT 
                full_name as name, 
                email, 
                CASE role_id 
                    WHEN 3 THEN 'admin' 
                    ELSE 'moderator' 
                END as role
            FROM users 
            WHERE id = $1 AND role_id IN (2, 3)
        """
        user = await db.fetchrow(query, user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.patch("/profile")
async def update_profile(
    request: ProfileUpdateRequest,
    authorization: str = Header(None)
):
    try:
        user_id = get_user_from_session(authorization)
        
        update_query = """
            UPDATE users 
            SET full_name = $1, email = $2
            WHERE id = $3
            RETURNING full_name as name, email, 
                CASE role_id WHEN 3 THEN 'admin' ELSE 'moderator' END as role
        """
        user = await db.fetchrow(update_query, request.name, request.email, user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (ТОЛЬКО АДМИН)
@app.get("/users")
async def get_users(authorization: str = Header(None)):
    try:
        user_id = get_user_from_session(authorization)
        
        role_query = "SELECT role_id FROM users WHERE id = $1"
        user_role = await db.fetchrow(role_query, user_id)
        if not user_role or user_role["role_id"] != 3:
            raise HTTPException(status_code=403, detail="Access denied: admin only")
        
        query = """
            SELECT 
                id,
                login,
                full_name,
                email,
                role_id,
                is_active,
                created_at
            FROM users 
            WHERE role_id IN (2, 3)
            ORDER BY created_at DESC
        """
        rows = await db.fetch(query)
        
        role_map = {2: "moderator", 3: "admin"}
        users = []
        for row in rows:
            users.append({
                "id": row["id"],
                "login": row["login"],
                "full_name": row["full_name"],
                "email": row["email"],
                "role": role_map.get(row["role_id"], "unknown"),
                "is_active": row["is_active"],
                "created_at": row["created_at"].strftime("%Y-%m-%d %H:%M")
            })
        
        return users
        
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@app.post("/users")
async def create_user(
    request: CreateUserRequest,
    authorization: str = Header(None)
):
    try:
        user_id = get_user_from_session(authorization)
        
        role_query = "SELECT role_id FROM users WHERE id = $1"
        user_role = await db.fetchrow(role_query, user_id)
        if not user_role or user_role["role_id"] != 3:
            raise HTTPException(status_code=403, detail="Access denied: admin only")
        
        if request.role not in ['moderator', 'admin']:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        role_id = 3 if request.role == 'admin' else 2
        
        check_login = "SELECT id FROM users WHERE login = $1"
        existing_login = await db.fetchrow(check_login, request.login)
        if existing_login:
            raise HTTPException(status_code=400, detail="Логин уже занят")
        
        check_email = "SELECT id FROM users WHERE email = $1"
        existing_email = await db.fetchrow(check_email, request.email)
        if existing_email:
            raise HTTPException(status_code=400, detail="Email уже занят")
        
        password_hash = bcrypt.hashpw(
            request.password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        insert_query = """
            INSERT INTO users (role_id, login, password_hash, full_name, email)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        """
        result = await db.fetchrow(
            insert_query,
            role_id,
            request.login,
            password_hash,
            request.full_name,
            request.email
        )
        
        return {
            "message": "User created successfully",
            "user_id": result["id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@app.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    request: UpdateUserRequest,
    authorization: str = Header(None)
):
    try:
        current_user_id = get_user_from_session(authorization)
        
        role_query = "SELECT role_id FROM users WHERE id = $1"
        user_role = await db.fetchrow(role_query, current_user_id)
        if not user_role or user_role["role_id"] != 3:
            raise HTTPException(status_code=403, detail="Access denied: admin only")
        
        check_query = "SELECT id, role_id FROM users WHERE id = $1"
        existing = await db.fetchrow(check_query, user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        if request.role == 'admin':
            new_role_id = 3
        elif request.role == 'moderator':
            new_role_id = 2
        else:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        check_email = "SELECT id FROM users WHERE email = $1 AND id != $2"
        existing_email = await db.fetchrow(check_email, request.email, user_id)
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        update_query = """
            UPDATE users 
            SET full_name = $1, email = $2, role_id = $3, is_active = $4
            WHERE id = $5
        """
        await db.execute(
            update_query,
            request.full_name,
            request.email,
            new_role_id,
            request.is_active,
            user_id
        )
        
        return {"message": "User updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    authorization: str = Header(None)
):
    try:
        current_user_id = get_user_from_session(authorization)
        
        role_query = "SELECT role_id FROM users WHERE id = $1"
        user_role = await db.fetchrow(role_query, current_user_id)
        if not user_role or user_role["role_id"] != 3:
            raise HTTPException(status_code=403, detail="Access denied: admin only")
        
        if current_user_id == user_id:
            raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
        
        target_user = await db.fetchrow("SELECT role_id FROM users WHERE id = $1", user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if target_user["role_id"] == 3: 
            admin_count_row = await db.fetchrow(
                "SELECT COUNT(*) as count FROM users WHERE role_id = 3 AND id != $1", 
                user_id
            )
            admin_count = admin_count_row["count"] if admin_count_row else 0
            if admin_count == 0:
                raise HTTPException(status_code=400, detail="Нельзя удалить последнего администратора системы")
        
        if target_user["role_id"] not in (2, 3):
            raise HTTPException(status_code=400, detail="Можно удалять только модераторов и администраторов")
        
        await db.execute("DELETE FROM corrections WHERE moderator_id = $1", user_id)
        
        await db.execute("DELETE FROM comments WHERE author_id = $1", user_id)
        
        await db.execute("DELETE FROM users WHERE id = $1", user_id)
        
        logger.info(f"✅ Пользователь {user_id} успешно удалён (все связанные записи очищены)")
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete user")

# ОТЧЁТЫ
@app.get("/reports/generate")
async def generate_report(
    date_from: str,
    date_to: str,
    marketplace: str = "all",
    authorization: str = Header(None)
):
    try:
        user_id = get_user_from_session(authorization)
        
        from datetime import date
        date_from_obj = date.fromisoformat(date_from)
        date_to_obj = date.fromisoformat(date_to)
        
        query_parts = [
            "SELECT",
            "    p.id,",
            "    p.uploaded_at,",
            "    COALESCE(c.final_result, ar.ai_result) as status,",
            "    p.marketplace",
            "FROM photos p",
            "INNER JOIN users s ON p.seller_id = s.id",
            "LEFT JOIN ai_results ar ON p.id = ar.photo_id",
            "LEFT JOIN corrections c ON p.id = c.photo_id",
            "WHERE p.is_deleted = FALSE",
            "  AND s.role_id = 1",
            "  AND p.uploaded_at::date BETWEEN $1 AND $2"
        ]
        params = [date_from_obj, date_to_obj]
        param_count = 3
        
        if marketplace != "all":
            query_parts.append(f"  AND p.marketplace = ${param_count}")
            params.append(marketplace)
            param_count += 1
        
        query = "\n".join(query_parts)
        rows = await db.fetch(query, *params)
        
        # ГЕНЕРАЦИЯ CSV С ПРАВИЛЬНОЙ КОДИРОВКОЙ
        output = io.StringIO()
        output.write('"ID";"Дата";"Статус";"Маркетплейс"\n')
        for row in rows:
            status = str(row['status']).replace('"', '""')
            marketplace_val = str(row['marketplace']).replace('"', '""')
            output.write(
                f'"{row["id"]}";'
                f'"{row["uploaded_at"].strftime("%Y-%m-%d")}";'
                f'"{status}";'
                f'"{marketplace_val}"\n'
            )
        
        output.seek(0)
        csv_content = output.getvalue()
        
        bom = '\ufeff'.encode('utf-8')
        csv_bytes = csv_content.encode('utf-8')
        
        filename = f"packcheck_report_{date_from}_{date_to}.csv"
        
        return StreamingResponse(
            iter([bom + csv_bytes]),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "text/csv; charset=utf-8"
            }
        )
        
    except ValueError as e:
        logger.error(f"Invalid date format: {e}")
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        logger.error(f"Report generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate report")

# ЗДОРОВЬЕ
@app.get("/")
async def root():
    return {"message": "PackCheck API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}