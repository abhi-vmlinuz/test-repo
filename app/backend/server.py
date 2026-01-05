"""
CTF Platform API - PostgreSQL Version
Integrated with ZecurX LMS (shared PostgreSQL database)

Features:
- PUBLIC CTF Platform (anyone can register, categories, challenges, leaderboard)
- LMS Student CTF (course-based challenges for enrolled students)
- Admin management (courses, modules, challenges, enrollments)
- Notification system
- Docker container support
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile, Form
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import asyncio
import json
from datetime import datetime, timezone, timedelta
import bcrypt
import argon2  # LMS uses Argon2 for password hashing
import jwt
import asyncpg
import zipfile
import shutil
import tempfile
import httpx

# Optional Docker support
try:
    import docker
    from docker.errors import DockerException
    docker_client = docker.from_env()
except (ImportError, Exception):
    docker_client = None
    logging.warning("Docker is not available. Container features will be disabled.")

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database Configuration
DATABASE_URL = os.environ.get('DATABASE_URL')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'ctf-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# GitHub OAuth Configuration
GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', '')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '')
GITHUB_REDIRECT_URI = os.environ.get('GITHUB_REDIRECT_URI', 'https://ctf.zecurx.com/api/auth/github/callback')

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'https://ctf.zecurx.com/api/auth/google/callback')

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ===========================================
# DATABASE CONNECTION
# ===========================================

class Database:
    _pool: Optional[asyncpg.Pool] = None
    
    @classmethod
    async def get_pool(cls) -> asyncpg.Pool:
        if cls._pool is None:
            min_size = int(os.environ.get('DB_POOL_MIN', 5))
            max_size = int(os.environ.get('DB_POOL_MAX', 20))
            cls._pool = await asyncpg.create_pool(DATABASE_URL, min_size=min_size, max_size=max_size)
        return cls._pool
    
    @classmethod
    async def close(cls):
        if cls._pool:
            await cls._pool.close()
            cls._pool = None


# ===========================================
# PYDANTIC MODELS
# ===========================================

# User Models
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    """Public CTF registration"""
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: Optional[str] = None
    email: str
    score: int = 0
    role: str = "user"

class UserUpdate(BaseModel):
    """Admin update user (ban/unban, change role)"""
    is_banned: Optional[bool] = None
    role: Optional[str] = None

# Public CTF Models
class Hint(BaseModel):
    text: str
    cost: int = 10

class Question(BaseModel):
    question: str
    flag: str
    points: int = 25

class CategoryCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "🏴"
    color: str = "gray"

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None


class PublicChallengeCreate(BaseModel):
    category_id: str
    title: str
    description: str
    difficulty: str = "medium"  # easy, medium, hard
    points: int = 100
    flag: str
    docker_image: Optional[str] = None
    docker_port: Optional[int] = None  # Port to expose for players
    github_repo: Optional[str] = None
    github_path: Optional[str] = None
    hints: List[Hint] = []
    questions: List[Question] = []
    tags: List[str] = []  # Tags for filtering/display (e.g., "web", "crypto", "forensics")
    is_published: bool = True


class FlagSubmit(BaseModel):
    challenge_id: str
    flag: str

class QuestionSubmit(BaseModel):
    challenge_id: str
    question_index: int
    flag: str

class HintRequest(BaseModel):
    challenge_id: str
    hint_index: int


# Student Models  
class StudentFlag(BaseModel):
    flag: str
    points: int = 50
    description: str = ""

class StudentChallengeCreate(BaseModel):
    title: str
    short_description: str = ""
    context: str = ""
    course_id: str
    module_id: str
    topic_number: int
    topic_name: str = ""
    is_capstone: bool = False
    docker_image: Optional[str] = None
    docker_compose: Optional[str] = None
    flags: List[StudentFlag] = []
    hints: List[dict] = []
    points: int = 100
    order: int = 0

class CourseCreate(BaseModel):
    code: str
    name: str
    description: str = ""
    duration: str = "40+ hours"
    color: str = "gray"
    lms_course_id: Optional[str] = None  # If provided, link to existing LMS course

class CourseUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    color: Optional[str] = None

class ModuleCreate(BaseModel):
    course_id: str
    name: str
    description: str = ""
    order: int
    has_capstone: bool = True

class EnrollmentCodeCreate(BaseModel):
    course_id: str
    expires_days: int = 7

class JoinCourseRequest(BaseModel):
    enrollment_code: str

class StudentFlagSubmit(BaseModel):
    challenge_id: str
    flag_index: int
    flag: str

class EnrollUserRequest(BaseModel):
    user_id: str
    course_id: str
    expires_days: int = 7

class UnenrollUserRequest(BaseModel):
    user_id: str
    course_id: str

# Notification Models
class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "announcement"
    target_type: str = "all"  # "all" or "specific"
    target_user_ids: Optional[List[str]] = None


# ===========================================
# HELPER FUNCTIONS
# ===========================================

def generate_uuid() -> str:
    return str(uuid.uuid4())

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Create Argon2 password hasher (matches LMS settings)
argon2_hasher = argon2.PasswordHasher()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash. Supports both Argon2 (LMS) and bcrypt (CTF)."""
    try:
        # Try Argon2 first (LMS uses Argon2)
        if hashed.startswith('$argon2'):
            try:
                argon2_hasher.verify(hashed, password)
                return True
            except argon2.exceptions.VerifyMismatchError:
                return False
        # Fall back to bcrypt (CTF registered users)
        else:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_code(length: int = 8) -> str:
    """Generate a random code for enrollment"""
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def time_ago(dt: datetime) -> str:
    """Convert datetime to 'time ago' string"""
    if not dt:
        return "unknown"
    
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    diff = now - dt
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "just now"
    elif seconds < 3600:
        mins = int(seconds / 60)
        return f"{mins} minute{'s' if mins > 1 else ''} ago"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    else:
        days = int(seconds / 86400)
        return f"{days} day{'s' if days > 1 else ''} ago"


# ===========================================
# MIDDLEWARE CLASSES
# ===========================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Permissions Policy for added security
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.rate_limit_records = {}
        self.limit = 300  # requests per window
        self.window = 60  # seconds (1 minute)
    
    async def dispatch(self, request: Request, call_next):
        # Exempt static files, documentation, or OPTIONS requests
        if request.url.path.startswith(("/public", "/docs", "/openapi.json")) or request.method == "OPTIONS":
            return await call_next(request)
            
        client_ip = request.client.host
        current_time = int(asyncio.get_event_loop().time())
        window_start = current_time // self.window
        
        key = (client_ip, window_start)
        
        # Simple cleanup to prevent internal memory growth
        if len(self.rate_limit_records) > 10000:
            self.rate_limit_records.clear()
            
        count = self.rate_limit_records.get(key, 0)
        
        if count >= self.limit:
            return Response("Too Many Requests", status_code=429)
            
        self.rate_limit_records[key] = count + 1
        return await call_next(request)


# ===========================================
# FASTAPI APP SETUP
# ===========================================

app = FastAPI(
    title="ZecurX CTF Platform API",
    description="CTF Platform integrated with ZecurX LMS",
    version="2.0.0"
)

import mimetypes

# Note: This will be accessible at /api/uploads/... since api_router has /api prefix
# We'll add a direct app route too for backward compatibility
@app.get("/uploads/{file_path:path}")
async def serve_upload(file_path: str):
    """Serve uploaded files manually to avoid aiofiles dependency"""
    try:
        upload_dir = (ROOT_DIR / "uploads").resolve()
        file_location = (upload_dir / file_path).resolve()
        
        # Security check
        if not str(file_location).startswith(str(upload_dir)):
             raise HTTPException(status_code=403, detail="Access denied")
        
        if not file_location.exists() or not file_location.is_file():
            raise HTTPException(status_code=404, detail="File not found")
            
        mime_type, _ = mimetypes.guess_type(file_location)
        
        return FileResponse(
            path=file_location, 
            media_type=mime_type or "application/octet-stream",
            filename=file_location.name
        )
    except Exception as e:
        logger.error(f"Error serving file: {e}")
        raise HTTPException(status_code=404, detail="File not found")



api_router = APIRouter(prefix="/api")
security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


# Also serve uploads via api_router for frontend compatibility
@api_router.get("/uploads/{file_path:path}")
async def serve_upload_via_api(file_path: str):
    """Serve uploaded files via API path for frontend compatibility"""
    return await serve_upload(file_path)


# ===========================================
# AUTHENTICATION MIDDLEWARE
# ===========================================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current authenticated user from LMS database"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            user = await conn.fetchrow('''
                SELECT u.id, u.name, u.email, u."ctfScore" as score,
                       u."isActive", u."isLocked" as is_banned,
                       u.avatar_url, u."createdAt" as created_at,
                       u.google_id, u.github_id, u.bio, u.social_links,
                       r.type as role_type
                FROM users u
                JOIN "Role" r ON u."roleId" = r.id
                WHERE u.id = $1
            ''', user_id)
            
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            if user['is_banned'] and user['role_type'] != 'SUPERADMIN':
                raise HTTPException(status_code=403, detail="Account is banned")
            
            # Parse social_links JSON if it's a string
            social_links = {}
            if user.get('social_links'):
                try:
                    social_links = json.loads(user['social_links']) if isinstance(user['social_links'], str) else (user['social_links'] or {})
                except:
                    pass
            
            role_map = {
                'SUPERADMIN': 'superadmin', 
                'ADMIN': 'admin', 
                'INSTRUCTOR': 'admin',
                'STUDENT': 'student',
                'CTF_USER': 'user'
            }
            return {
                'id': user['id'],
                'name': user['name'],
                'username': user['name'],  # Alias for frontend compatibility
                'email': user['email'],
                'score': user['score'] or 0,
                'role': role_map.get(user['role_type'], 'user'),
                'role_type': user['role_type'],  # Include for LMS integration
                'is_active': user['isActive'],
                'avatar_url': user['avatar_url'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                'google_id': user.get('google_id'),
                'github_id': user.get('github_id'),
                'bio': user.get('bio') or '',
                'social_links': social_links
            }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)) -> Optional[dict]:
    """Optional authentication for public pages"""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except:
        return None


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require admin or superadmin role"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ===========================================
# BASIC ROUTES
# ===========================================

@api_router.get("/")
async def root():
    return {"message": "ZecurX CTF Platform API v2.0 (PostgreSQL)"}

@api_router.get("/health")
async def health():
    try:
        pool = await Database.get_pool()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


# ===========================================
# AUTH ROUTES (Uses LMS users)
# ===========================================

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login with LMS credentials"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow('''
            SELECT u.id, u.name, u.email, u.password,
                   u."ctfScore" as score, u."isLocked" as is_banned,
                   u.avatar_url,
                   r.type as role_type
            FROM users u
            JOIN "Role" r ON u."roleId" = r.id
            WHERE LOWER(u.email) = LOWER($1)
        ''', credentials.email)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not verify_password(credentials.password, user['password']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if user['is_banned'] and user['role_type'] != 'SUPERADMIN':
            raise HTTPException(status_code=403, detail="Account is banned")
        
        # CTF Access Control
        # Allowed roles for CTF login:
        # - CTF_USER: Direct CTF platform users
        # - SUPERADMIN, ADMIN, INSTRUCTOR: Admins can access CTF for management
        # - STUDENT: Only if they have an active LMS enrollment with a linked CTF course
        
        allowed_ctf_roles = ['CTF_USER', 'SUPERADMIN', 'ADMIN', 'INSTRUCTOR']
        
        if user['role_type'] not in allowed_ctf_roles:
            if user['role_type'] == 'STUDENT':
                # Check if student has any LMS enrollment with linked CTF course
                has_ctf_access = await conn.fetchval('''
                    SELECT EXISTS (
                        SELECT 1 
                        FROM enrollments e
                        JOIN courses c ON e."courseId" = c.id
                        JOIN ctf_courses cc ON cc."lmsCourseId" = c.id
                        WHERE e."userId" = $1 AND e.status = 'ACTIVE'
                    )
                ''', user['id'])
                
                if not has_ctf_access:
                    raise HTTPException(
                        status_code=403, 
                        detail="LMS students need to be enrolled in a course with CTF challenges to access this platform. Please enroll through the LMS first."
                    )
            else:
                raise HTTPException(
                    status_code=403, 
                    detail="This account does not have CTF platform access."
                )
        
        # Map roles to CTF display roles
        role_map = {
            'SUPERADMIN': 'superadmin', 
            'ADMIN': 'admin', 
            'INSTRUCTOR': 'admin',
            'STUDENT': 'student',  # Students with LMS CTF enrollment
            'CTF_USER': 'user'
        }
        token = create_token(user['id'])
        
        return {
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'username': user['name'],  # Alias for frontend compatibility
                'email': user['email'],
                'score': user['score'] or 0,
                'role': role_map.get(user['role_type'], 'user'),
                'role_type': user['role_type'],  # Include actual role type for LMS integration
                'avatar_url': user['avatar_url']
            }
        }


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user


@api_router.patch("/auth/me")
@api_router.put("/auth/me")
async def update_me(data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update current user profile (bio, social links)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Build update query
        update_fields = []
        params = []
        idx = 1
        
        if data.bio is not None:
            update_fields.append(f'bio = ${idx}')
            params.append(data.bio)
            idx += 1
            
        if data.social_links is not None:
            update_fields.append(f'social_links = ${idx}')
            params.append(json.dumps(data.social_links))
            idx += 1
            
        if not update_fields:
            return current_user
            
        params.append(current_user['id'])
        
        await conn.execute(f'''
            UPDATE users 
            SET {', '.join(update_fields)}, "updatedAt" = NOW()
            WHERE id = ${idx}
        ''', *params)
        
        # Return updated usage
        return {**current_user, **data.dict(exclude_unset=True)}


@api_router.post("/auth/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...), 
    current_user: dict = Depends(get_current_user)
):
    """Upload user avatar"""
    # Validation: 5MB limit, image only
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Invalid file type (image only)")
    
    pool = await Database.get_pool()
    
    # 1. Fetch current avatar for cleanup
    async with pool.acquire() as conn:
        old_avatar = await conn.fetchval('SELECT avatar_url FROM users WHERE id = $1', current_user['id'])
        
        # Cleanup old local file if it exists
        if old_avatar and ('/uploads/avatars/' in old_avatar or '/api/uploads/avatars/' in old_avatar):
            try:
                old_filename = old_avatar.split('/avatars/')[-1]
                old_file_path = ROOT_DIR / "uploads" / "avatars" / old_filename
                if old_file_path.exists():
                    old_file_path.unlink()
                    logger.info(f"Cleaned up old avatar: {old_filename}")
            except Exception as e:
                logger.warning(f"Failed to cleanup old avatar: {e}")

    # 2. Save new file
    ext = file.filename.split('.')[-1]
    filename = f"{current_user['id']}_{int(datetime.now().timestamp())}.{ext}"
    
    # Ensure directory exists
    AVATARS_DIR = ROOT_DIR / "uploads" / "avatars"
    AVATARS_DIR.mkdir(parents=True, exist_ok=True)
    
    file_path = AVATARS_DIR / filename
    
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
            
        # URL Construction
        backend_url = os.environ.get('BACKEND_URL', '')
        if backend_url:
            avatar_url = f"{backend_url}/api/uploads/avatars/{filename}"
        else:
            avatar_url = f"/api/uploads/avatars/{filename}"
        
        # 3. Update database
        async with pool.acquire() as conn:
            await conn.execute('UPDATE users SET avatar_url = $1 WHERE id = $2', avatar_url, current_user['id'])
            
        return {'avatar_url': avatar_url}
        
    except Exception as e:
        logger.error(f"Avatar upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to save avatar")


@api_router.delete("/auth/me/avatar")
async def reset_avatar(current_user: dict = Depends(get_current_user)):
    """Delete custom avatar and revert to OAuth provider's avatar or LMS avatar"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Try to get user's OAuth avatar or LMS avatar as fallback
        # The `avatar` column is used by LMS, avatar_url by CTF
        try:
            user = await conn.fetchrow('''
                SELECT avatar_url, avatar, google_avatar, github_avatar
                FROM users WHERE id = $1
            ''', current_user['id'])
        except Exception:
            # Some columns don't exist, try simpler query
            try:
                user = await conn.fetchrow('''
                    SELECT avatar_url, avatar FROM users WHERE id = $1
                ''', current_user['id'])
            except Exception:
                user = await conn.fetchrow('''
                    SELECT avatar_url FROM users WHERE id = $1
                ''', current_user['id'])
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete the custom avatar file if it's a local upload
        current_avatar = user.get('avatar_url') or ''
        if '/uploads/avatars/' in current_avatar or '/api/uploads/avatars/' in current_avatar:
            try:
                filename = current_avatar.split('/avatars/')[-1]
                file_path = ROOT_DIR / "uploads" / "avatars" / filename
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"Deleted avatar file: {filename}")
            except Exception as e:
                logger.warning(f"Failed to delete avatar file: {e}")
        
        # Determine the new avatar from various sources:
        # Priority: google_avatar > github_avatar > avatar (LMS) > null
        new_avatar = (
            user.get('google_avatar') or 
            user.get('github_avatar') or 
            user.get('avatar') or  # LMS avatar field
            None
        )
        
        await conn.execute('UPDATE users SET avatar_url = $1 WHERE id = $2', new_avatar, current_user['id'])
        
        return {'avatar_url': new_avatar}


# ===========================================
# PUBLIC CTF: REGISTRATION
# ===========================================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    """Register a new CTF user (public CTF platform)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Check if user exists
        existing = await conn.fetchrow(
            'SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR name = $2',
            user_data.email, user_data.username
        )
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Get CTF_USER role
        role = await conn.fetchrow("SELECT id FROM \"Role\" WHERE type = 'CTF_USER'")
        if not role:
            # Create CTF_USER role if not exists
            role_id = generate_uuid()
            await conn.execute('''
                INSERT INTO "Role" (id, name, type, "createdAt", "updatedAt")
                VALUES ($1, 'CTF User', 'CTF_USER', NOW(), NOW())
            ''', role_id)
        else:
            role_id = role['id']
        
        # Create user
        user_id = generate_uuid()
        await conn.execute('''
            INSERT INTO users (
                id, name, email, password, "roleId",
                "isActive", "isVerified", "ctfScore",
                "createdAt", "updatedAt", "passwordChangedAt"
            ) VALUES ($1, $2, $3, $4, $5, true, true, 0, NOW(), NOW(), NOW())
        ''', user_id, user_data.username, user_data.email, 
             hash_password(user_data.password), role_id)
        
        token = create_token(user_id)
        
        return {
            'token': token,
            'user': {
                'id': user_id,
                'name': user_data.username,
                'username': user_data.username,  # Alias for frontend
                'email': user_data.email,
                'score': 0,
                'role': 'user'
            }
        }


# ===========================================
# GITHUB OAUTH INTEGRATION
# ===========================================

@api_router.get("/auth/github")
async def github_oauth_start():
    """
    Initiate GitHub OAuth flow.
    Returns the GitHub authorization URL to redirect the user to.
    """
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    # Generate state for CSRF protection
    import secrets
    state = secrets.token_urlsafe(32)
    
    # Store state in a temporary way (in production, use Redis or database)
    # For now, we'll include it in the redirect and verify on callback
    
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
        f"&scope=read:user,repo,read:packages,write:packages"
        f"&state={state}"
    )
    
    return {"url": github_auth_url, "state": state}


@api_router.get("/auth/github/callback")
async def github_oauth_callback(code: str, state: Optional[str] = None):
    """
    Handle GitHub OAuth callback.
    Routes to login flow if state starts with 'login_', otherwise handles admin integration.
    """
    # Route to login callback if this is a login flow
    if state and state.startswith('login_'):
        return await _handle_github_login_callback(code, state)
    
    # Otherwise, this is admin repo integration
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    try:
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": GITHUB_REDIRECT_URI
                },
                headers={"Accept": "application/json"},
                timeout=15.0
            )
            
            if token_response.status_code != 200:
                logger.error(f"GitHub token exchange failed: {token_response.text}")
                raise HTTPException(status_code=400, detail="Failed to exchange code for token")
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            if not access_token:
                logger.error(f"No access token in response: {token_data}")
                raise HTTPException(status_code=400, detail="No access token received")
            
            # Fetch user info from GitHub
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json"
                },
                timeout=10.0
            )
            
            if user_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch GitHub user info")
            
            github_user = user_response.json()
            
            # Store the GitHub connection in admin_settings for this user
            # This links the GitHub account for repo access
            pool = await Database.get_pool()
            async with pool.acquire() as conn:
                # Store GitHub token (encrypted in production)
                await conn.execute('''
                    INSERT INTO admin_settings (key, value, encrypted, updated_at)
                    VALUES ('github_oauth_token', $1, true, NOW())
                    ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
                ''', access_token)
                
                await conn.execute('''
                    INSERT INTO admin_settings (key, value, updated_at)
                    VALUES ('github_oauth_username', $1, NOW())
                    ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
                ''', github_user.get('login', ''))
            
            logger.info(f"GitHub OAuth successful for user: {github_user.get('login')}")
            
            # Return HTML that closes the popup and notifies the parent
            return HTMLResponse(content=f'''
                <!DOCTYPE html>
                <html>
                <head><title>GitHub Connected</title></head>
                <body>
                    <script>
                        if (window.opener) {{
                            window.opener.postMessage({{
                                type: 'github-oauth-success',
                                username: '{github_user.get("login", "")}',
                                avatar: '{github_user.get("avatar_url", "")}'
                            }}, '*');
                            window.close();
                        }} else {{
                            document.body.innerHTML = '<h2> GitHub Connected!</h2><p>You can close this window.</p>';
                        }}
                    </script>
                    <h2> GitHub Connected!</h2>
                    <p>Connected as: <strong>{github_user.get("login", "")}</strong></p>
                    <p>You can close this window.</p>
                </body>
                </html>
            ''', status_code=200)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub OAuth error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/auth/github/status")
async def github_oauth_status(admin: dict = Depends(require_admin)):
    """Check if GitHub is connected via OAuth"""
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            token = await conn.fetchrow(
                "SELECT value FROM admin_settings WHERE key = 'github_oauth_token'"
            )
            username = await conn.fetchrow(
                "SELECT value FROM admin_settings WHERE key = 'github_oauth_username'"
            )
            
            if token and username:
                return {
                    "connected": True,
                    "username": username['value']
                }
            return {"connected": False}
    except Exception as e:
        logger.error(f"Error checking GitHub status: {e}")
        return {"connected": False}


@api_router.delete("/auth/github/disconnect")
async def github_oauth_disconnect(admin: dict = Depends(require_admin)):
    """Disconnect GitHub OAuth"""
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM admin_settings WHERE key = 'github_oauth_token'")
            await conn.execute("DELETE FROM admin_settings WHERE key = 'github_oauth_username'")
        return {"success": True, "message": "GitHub disconnected"}
    except Exception as e:
        logger.error(f"Error disconnecting GitHub: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/github/repos")
async def list_github_repos(admin: dict = Depends(require_admin)):
    """List user's GitHub repositories for challenge import"""
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            token_row = await conn.fetchrow(
                "SELECT value FROM admin_settings WHERE key = 'github_oauth_token'"
            )
            
            if not token_row:
                raise HTTPException(status_code=401, detail="GitHub not connected")
            
            access_token = token_row['value']
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.github.com/user/repos?per_page=100&sort=updated",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/vnd.github+json"
                    },
                    timeout=15.0
                )
                
                if response.status_code != 200:
                    raise HTTPException(status_code=400, detail="Failed to fetch repositories")
                
                repos = response.json()
                return {
                    "repos": [
                        {
                            "name": repo["name"],
                            "full_name": repo["full_name"],
                            "description": repo.get("description"),
                            "html_url": repo["html_url"],
                            "private": repo["private"],
                            "updated_at": repo["updated_at"]
                        }
                        for repo in repos
                    ]
                }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching repos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================================
# GITHUB OAUTH LOGIN (User Authentication)
# ===========================================

@api_router.get("/auth/github/login")
async def github_oauth_login_start():
    """
    Initiate GitHub OAuth for USER LOGIN (not admin integration).
    This is for users to sign in/sign up with their GitHub account.
    Uses the same callback URL but with 'login_' state prefix.
    """
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    import secrets
    state = "login_" + secrets.token_urlsafe(32)  # Prefix to identify this is for login
    
    # Use user:email scope to get user's email even if private
    # Use the SAME callback URL - we'll route based on state prefix
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
        f"&scope=read:user,user:email"
        f"&state={state}"
    )
    
    return {"url": github_auth_url, "state": state}


async def _handle_github_login_callback(code: str, state: Optional[str] = None):
    """
    Handle GitHub OAuth callback for USER LOGIN.
    Called from main callback when state starts with 'login_'.
    - If user exists with same email: link GitHub and login
    - If user exists with same github_id: login
    - If new user: create account and login
    """
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        return HTMLResponse(content=_github_error_html("GitHub OAuth not configured"), status_code=500)
    
    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for access token
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": GITHUB_REDIRECT_URI
                },
                headers={"Accept": "application/json"},
                timeout=15.0
            )
            
            if token_response.status_code != 200:
                logger.error(f"GitHub token exchange failed: {token_response.text}")
                return HTMLResponse(content=_github_error_html("Failed to authenticate with GitHub"), status_code=400)
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            if not access_token:
                return HTMLResponse(content=_github_error_html("No access token received"), status_code=400)
            
            # Fetch user info
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json"
                },
                timeout=10.0
            )
            
            if user_response.status_code != 200:
                return HTMLResponse(content=_github_error_html("Failed to fetch GitHub user info"), status_code=400)
            
            github_user = user_response.json()
            github_id = str(github_user.get("id"))
            github_login = github_user.get("login", "")
            github_avatar = github_user.get("avatar_url", "")
            github_name = github_user.get("name") or github_login
            
            # Try to get email (some users have private emails)
            github_email = github_user.get("email")
            if not github_email:
                emails_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/vnd.github+json"
                    },
                    timeout=10.0
                )
                if emails_response.status_code == 200:
                    emails = emails_response.json()
                    primary_email = next((e["email"] for e in emails if e.get("primary")), None)
                    github_email = primary_email or (emails[0]["email"] if emails else None)
            
            if not github_email:
                return HTMLResponse(content=_github_error_html("Could not retrieve email from GitHub. Please make sure your email is public or use password login."), status_code=400)
            
            # Process login/registration
            pool = await Database.get_pool()
            async with pool.acquire() as conn:
                # First, ensure github_id and avatar_url columns exist
                await _ensure_github_columns(conn)
                
                # 1. Check if user exists with this github_id
                existing_by_github = await conn.fetchrow(
                    'SELECT id, name, email, "ctfScore" as score, "roleId", avatar_url, github_avatar FROM users WHERE github_id = $1',
                    github_id
                )
                
                if existing_by_github:
                    # User already linked to this GitHub - just login
                    user_id = existing_by_github['id']
                    
                    # Only update if something changed to avoid redundant writes
                    if existing_by_github['github_avatar'] != github_avatar or existing_by_github['avatar_url'] is None:
                        await conn.execute(
                            'UPDATE users SET avatar_url = COALESCE(avatar_url, $1), github_avatar = $1, "updatedAt" = NOW() WHERE id = $2',
                            github_avatar, user_id
                        )
                else:
                    # 2. Check if user exists with this email
                    existing_by_email = await conn.fetchrow(
                        'SELECT id, name, email, "ctfScore" as score, "roleId" FROM users WHERE LOWER(email) = LOWER($1)',
                        github_email
                    )
                    
                    if existing_by_email:
                        # Link GitHub to existing account
                        user_id = existing_by_email['id']
                        await conn.execute('''
                            UPDATE users SET 
                                github_id = $1, 
                                github_avatar = $2,
                                avatar_url = COALESCE(avatar_url, $2),
                                "updatedAt" = NOW()
                            WHERE id = $3
                        ''', github_id, github_avatar, user_id)
                        logger.info(f"Linked GitHub {github_login} to existing user {github_email}")
                    else:
                        # 3. Create new user
                        # Get CTF_USER role
                        role = await conn.fetchrow("SELECT id FROM \"Role\" WHERE type = 'CTF_USER'")
                        if not role:
                            role_id = generate_uuid()
                            await conn.execute('''
                                INSERT INTO "Role" (id, name, type, "createdAt", "updatedAt")
                                VALUES ($1, 'CTF User', 'CTF_USER', NOW(), NOW())
                            ''', role_id)
                        else:
                            role_id = role['id']
                        
                        # Create user with random password (they'll use GitHub to login)
                        import secrets
                        random_password = secrets.token_urlsafe(32)
                        user_id = generate_uuid()
                        
                        await conn.execute('''
                            INSERT INTO users (
                                id, name, email, password, "roleId",
                                "isActive", "isVerified", "ctfScore",
                                github_id, github_avatar, avatar_url,
                                "createdAt", "updatedAt", "passwordChangedAt"
                            ) VALUES ($1, $2, $3, $4, $5, true, true, 0, $6, $7, $7, NOW(), NOW(), NOW())
                        ''', user_id, github_name, github_email, 
                             hash_password(random_password), role_id, github_id, github_avatar)
                        
                        logger.info(f"Created new user from GitHub: {github_login} ({github_email})")
                
                # Fetch user for token creation
                user = await conn.fetchrow('''
                    SELECT u.id, u.name, u.email, u."ctfScore" as score, u.avatar_url,
                           u."createdAt" as created_at,
                           r.type as role_type
                    FROM users u
                    JOIN "Role" r ON u."roleId" = r.id
                    WHERE u.id = $1
                ''', user_id)
                
                # Map roles
                role_map = {
                    'SUPERADMIN': 'superadmin', 
                    'ADMIN': 'admin', 
                    'INSTRUCTOR': 'admin',
                    'STUDENT': 'student',
                    'CTF_USER': 'user'
                }
                
                token = create_token(user_id)
                
                # Return HTML that sends message to parent and redirects
                user_data = {
                    'id': user['id'],
                    'name': user['name'],
                    'username': user['name'],  # Alias for frontend compatibility
                    'email': user['email'],
                    'score': user['score'] or 0,
                    'role': role_map.get(user['role_type'], 'user'),
                    'avatar_url': user['avatar_url'],
                    'created_at': user['created_at'].isoformat() if user['created_at'] else None
                }
                
                return HTMLResponse(content=f'''
                    <!DOCTYPE html>
                    <html>
                    <head><title>Login Successful</title></head>
                    <body>
                        <script>
                            const authData = {{
                                token: '{token}',
                                user: {json.dumps(user_data)}
                            }};
                            
                            if (window.opener) {{
                                window.opener.postMessage({{
                                    type: 'github-login-success',
                                    data: authData
                                }}, '*');
                                window.close();
                            }} else {{
                                // In case opened directly, store in localStorage and redirect
                                localStorage.setItem('token', authData.token);
                                localStorage.setItem('user', JSON.stringify(authData.user));
                                window.location.href = '/';
                            }}
                        </script>
                        <h2>✅ Login Successful!</h2>
                        <p>Redirecting...</p>
                    </body>
                    </html>
                ''', status_code=200)
                
    except Exception as e:
        logger.error(f"GitHub login error: {e}")
        return HTMLResponse(content=_github_error_html(str(e)), status_code=500)


def _github_error_html(message: str) -> str:
    """Generate error HTML for GitHub OAuth failures"""
    return f'''
        <!DOCTYPE html>
        <html>
        <head><title>Login Failed</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h2 style="color: #ef4444;">❌ Login Failed</h2>
            <p style="color: #666;">{message}</p>
            <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #18181b; color: white; border: none; border-radius: 8px; cursor: pointer;">
                Close Window
            </button>
        </body>
        </html>
    '''


async def _ensure_github_columns(conn):
    """Ensure github_id, github_avatar and avatar_url columns exist in users table"""
    try:
        # Check if columns exist
        result = await conn.fetch('''
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name IN ('github_id', 'github_avatar', 'avatar_url')
        ''')
        existing_columns = {row['column_name'] for row in result}
        
        if 'github_id' not in existing_columns:
            await conn.execute('ALTER TABLE users ADD COLUMN github_id VARCHAR(255) UNIQUE')
            logger.info("Added github_id column to users table")

        if 'github_avatar' not in existing_columns:
            await conn.execute('ALTER TABLE users ADD COLUMN github_avatar TEXT')
            logger.info("Added github_avatar column to users table")
        
        if 'avatar_url' not in existing_columns:
            await conn.execute('ALTER TABLE users ADD COLUMN avatar_url TEXT')
            logger.info("Added avatar_url column to users table")
    except Exception as e:
        logger.warning(f"Could not ensure GitHub columns: {e}")


async def _ensure_oauth_columns(conn):
    """Ensure OAuth-related columns exist in users table (github_id, google_id, google_avatar, github_avatar, avatar_url)"""
    try:
        result = await conn.fetch('''
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name IN ('github_id', 'google_id', 'google_avatar', 'github_avatar', 'avatar_url')
        ''')
        existing_columns = {row['column_name'] for row in result}
        
        if 'github_id' not in existing_columns:
            await conn.execute('ALTER TABLE users ADD COLUMN github_id VARCHAR(255) UNIQUE')
            logger.info("Added github_id column to users table")
        
        if 'google_id' not in existing_columns:
            await conn.execute('ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE')
            logger.info("Added google_id column to users table")

        if 'google_avatar' not in existing_columns:
            await conn.execute('ALTER TABLE users ADD COLUMN google_avatar TEXT')
            logger.info("Added google_avatar column to users table")

        if 'github_avatar' not in existing_columns:
            await conn.execute('ALTER TABLE users ADD COLUMN github_avatar TEXT')
            logger.info("Added github_avatar column to users table")
        
        if 'avatar_url' not in existing_columns:
            await conn.execute('ALTER TABLE users ADD COLUMN avatar_url TEXT')
            logger.info("Added avatar_url column to users table")
    except Exception as e:
        logger.warning(f"Could not ensure OAuth columns: {e}")


# ===========================================
# GOOGLE OAUTH LOGIN
# ===========================================

@api_router.get("/auth/google/login")
async def google_oauth_login_start():
    """
    Initiate Google OAuth for USER LOGIN.
    Returns the Google authorization URL.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    import secrets
    state = secrets.token_urlsafe(32)
    
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
        f"&state={state}"
    )
    
    return {"url": google_auth_url, "state": state}


@api_router.get("/auth/google/callback")
async def google_oauth_callback(code: str, state: Optional[str] = None):
    """
    Handle Google OAuth callback for USER LOGIN.
    - If user exists with same email: link Google and login
    - If user exists with same google_id: login
    - If new user: create account and login
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return HTMLResponse(content=_google_error_html("Google OAuth not configured"), status_code=500)
    
    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for tokens
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15.0
            )
            
            if token_response.status_code != 200:
                logger.error(f"Google token exchange failed: {token_response.text}")
                return HTMLResponse(content=_google_error_html("Failed to authenticate with Google"), status_code=400)
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            if not access_token:
                return HTMLResponse(content=_google_error_html("No access token received"), status_code=400)
            
            # Fetch user info from Google
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0
            )
            
            if user_response.status_code != 200:
                return HTMLResponse(content=_google_error_html("Failed to fetch Google user info"), status_code=400)
            
            google_user = user_response.json()
            google_id = str(google_user.get("id"))
            google_email = google_user.get("email")
            google_name = google_user.get("name") or google_email.split("@")[0]
            google_avatar = google_user.get("picture", "")
            
            if not google_email:
                return HTMLResponse(content=_google_error_html("Could not retrieve email from Google"), status_code=400)
            
            # Process login/registration
            pool = await Database.get_pool()
            async with pool.acquire() as conn:
                # Ensure OAuth columns exist
                await _ensure_oauth_columns(conn)
                
                # 1. Check if user exists with this google_id
                existing_by_google = await conn.fetchrow(
                    'SELECT id, name, email, "ctfScore" as score, avatar_url, google_avatar FROM users WHERE google_id = $1',
                    google_id
                )
                
                if existing_by_google:
                    # User already linked to this Google - just login
                    user_id = existing_by_google['id']
                    
                    # Only update if something changed to avoid redundant writes
                    if existing_by_google['google_avatar'] != google_avatar or existing_by_google['avatar_url'] is None:
                        await conn.execute(
                            'UPDATE users SET avatar_url = COALESCE(avatar_url, $1), google_avatar = $1, "updatedAt" = NOW() WHERE id = $2',
                            google_avatar, user_id
                        )
                else:
                    # 2. Check if user exists with this email
                    existing_by_email = await conn.fetchrow(
                        'SELECT id, name, email, "ctfScore" as score FROM users WHERE LOWER(email) = LOWER($1)',
                        google_email
                    )
                    
                    if existing_by_email:
                        # Link Google to existing account
                        user_id = existing_by_email['id']
                        await conn.execute('''
                            UPDATE users SET 
                                google_id = $1, 
                                google_avatar = $2,
                                avatar_url = COALESCE(avatar_url, $2),
                                "updatedAt" = NOW()
                            WHERE id = $3
                        ''', google_id, google_avatar, user_id)
                        logger.info(f"Linked Google {google_email} to existing user")
                    else:
                        # 3. Create new user
                        role = await conn.fetchrow("SELECT id FROM \"Role\" WHERE type = 'CTF_USER'")
                        if not role:
                            role_id = generate_uuid()
                            await conn.execute('''
                                INSERT INTO "Role" (id, name, type, "createdAt", "updatedAt")
                                VALUES ($1, 'CTF User', 'CTF_USER', NOW(), NOW())
                            ''', role_id)
                        else:
                            role_id = role['id']
                        
                        import secrets
                        random_password = secrets.token_urlsafe(32)
                        user_id = generate_uuid()
                        
                        await conn.execute('''
                            INSERT INTO users (
                                id, name, email, password, "roleId",
                                "isActive", "isVerified", "ctfScore",
                                google_id, google_avatar, avatar_url,
                                "createdAt", "updatedAt", "passwordChangedAt"
                            ) VALUES ($1, $2, $3, $4, $5, true, true, 0, $6, $7, $7, NOW(), NOW(), NOW())
                        ''', user_id, google_name, google_email, 
                             hash_password(random_password), role_id, google_id, google_avatar)
                        
                        logger.info(f"Created new user from Google: {google_email}")
                
                # Fetch user for token creation
                user = await conn.fetchrow('''
                    SELECT u.id, u.name, u.email, u."ctfScore" as score, u.avatar_url,
                           u."createdAt" as created_at,
                           r.type as role_type
                    FROM users u
                    JOIN "Role" r ON u."roleId" = r.id
                    WHERE u.id = $1
                ''', user_id)
                
                role_map = {
                    'SUPERADMIN': 'superadmin', 
                    'ADMIN': 'admin', 
                    'INSTRUCTOR': 'admin',
                    'STUDENT': 'student',
                    'CTF_USER': 'user'
                }
                
                token = create_token(user_id)
                
                user_data = {
                    'id': user['id'],
                    'name': user['name'],
                    'username': user['name'],  # Alias for frontend compatibility
                    'email': user['email'],
                    'score': user['score'] or 0,
                    'role': role_map.get(user['role_type'], 'user'),
                    'avatar_url': user['avatar_url'],
                    'created_at': user['created_at'].isoformat() if user['created_at'] else None
                }
                
                return HTMLResponse(content=f'''
                    <!DOCTYPE html>
                    <html>
                    <head><title>Login Successful</title></head>
                    <body>
                        <script>
                            const authData = {{
                                token: '{token}',
                                user: {json.dumps(user_data)}
                            }};
                            
                            if (window.opener) {{
                                window.opener.postMessage({{
                                    type: 'google-login-success',
                                    data: authData
                                }}, '*');
                                window.close();
                            }} else {{
                                localStorage.setItem('token', authData.token);
                                localStorage.setItem('user', JSON.stringify(authData.user));
                                window.location.href = '/';
                            }}
                        </script>
                        <h2>✅ Login Successful!</h2>
                        <p>Redirecting...</p>
                    </body>
                    </html>
                ''', status_code=200)
                
    except Exception as e:
        logger.error(f"Google login error: {e}")
        return HTMLResponse(content=_google_error_html(str(e)), status_code=500)


def _google_error_html(message: str) -> str:
    """Generate error HTML for Google OAuth failures"""
    return f'''
        <!DOCTYPE html>
        <html>
        <head><title>Login Failed</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h2 style="color: #ef4444;">❌ Login Failed</h2>
            <p style="color: #666;">{message}</p>
            <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #18181b; color: white; border: none; border-radius: 8px; cursor: pointer;">
                Close Window
            </button>
        </body>
        </html>
    '''


# ===========================================
# PUBLIC CTF: CATEGORIES
# ===========================================

@api_router.get("/categories")
async def get_categories():
    """Get all public CTF categories"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        categories = await conn.fetch('''
            SELECT id, name, description, icon, color, "orderIndex"
            FROM ctf_categories
            WHERE "isActive" = true
            ORDER BY "orderIndex"
        ''')
        return [dict(c) for c in categories]


# ===========================================
# PUBLIC CTF: CHALLENGES
# ===========================================

@api_router.get("/challenges")
async def get_challenges(
    category_id: Optional[str] = None, 
    user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get all public CTF challenges with solve status in one query"""
    user_id = user['id'] if user else None
    pool = await Database.get_pool()
    
    query = '''
        SELECT 
            c.id, c."categoryId", c.title, c.description, c.difficulty, 
            c.points, c."dockerImage", c.hints, c.questions, c.solves, c."isPublished", c.tags,
            EXISTS(
                SELECT 1 FROM ctf_public_progress p 
                WHERE p."challengeId" = c.id AND p."userId" = $1 AND p.solved = true
            ) as is_solved
        FROM ctf_public_challenges c
        WHERE c."isPublished" = true
    '''
    
    async with pool.acquire() as conn:
        if category_id:
            query += ' AND c."categoryId" = $2 ORDER BY c.points'
            challenges = await conn.fetch(query, user_id, category_id)
        else:
            query += ' ORDER BY c.points'
            challenges = await conn.fetch(query, user_id)
        
        result = []
        for ch in challenges:
            # Parse hints (remove text, show only cost)
            hints = []
            if ch.get('hints'):
                hint_data = json.loads(ch['hints']) if isinstance(ch['hints'], str) else ch['hints']
                hints = [{'cost': h.get('cost', 0)} for h in hint_data]
            
            # Parse questions (remove flags from response)
            questions = []
            if ch.get('questions'):
                q_data = json.loads(ch['questions']) if isinstance(ch['questions'], str) else ch['questions']
                questions = [{'question': q.get('question'), 'points': q.get('points', 25)} for q in q_data]
            
            # Calculate total points (base + questions)
            question_points = sum(q.get('points', 25) for q in questions)
            total_points = (ch['points'] or 0) + question_points
            
            # Parse tags
            tags = []
            if ch.get('tags'):
                tags = json.loads(ch['tags']) if isinstance(ch['tags'], str) else ch['tags']
            
            result.append({
                'id': ch['id'],
                'category_id': ch['categoryId'],
                'title': ch['title'],
                'description': ch['description'],
                'difficulty': ch['difficulty'].lower() if ch['difficulty'] else 'medium',
                'points': ch['points'] or 0,
                'total_points': total_points,  # Base + questions
                'is_solved': ch['is_solved'],
                'docker_image': ch['dockerImage'],
                'hints': hints,
                'questions': questions,
                'tags': tags,
                'solves': ch['solves']
            })
        return result


@api_router.get("/challenges/{challenge_id}")
async def get_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Get challenge details with user progress"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        challenge = await conn.fetchrow('''
            SELECT id, "categoryId", title, description, difficulty,
                   points, "dockerImage", hints, questions, solves, flag, tags
            FROM ctf_public_challenges
            WHERE id = $1 AND "isPublished" = true
        ''', challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Get user progress
        progress = await conn.fetchrow('''
            SELECT solved, "hintsUsed", "solvedQuestions", "scoreEarned"
            FROM ctf_public_progress
            WHERE "userId" = $1 AND "challengeId" = $2
        ''', current_user['id'], challenge_id)
        
        # Parse hints
        hints_data = json.loads(challenge['hints']) if isinstance(challenge['hints'], str) else (challenge['hints'] or [])
        hints_used = list(progress['hintsUsed']) if progress else []
        hints = []
        for i, h in enumerate(hints_data):
            hint_info = {'index': i, 'cost': h.get('cost', 0), 'unlocked': i in hints_used}
            if i in hints_used:
                hint_info['text'] = h.get('text', '')
            hints.append(hint_info)
        
        # Parse questions
        questions_data = json.loads(challenge['questions']) if isinstance(challenge['questions'], str) else (challenge['questions'] or [])
        solved_questions = list(progress['solvedQuestions']) if progress else []
        questions = [
            {'question': q.get('question'), 'points': q.get('points', 25), 'solved': i in solved_questions}
            for i, q in enumerate(questions_data)
        ]
        
        # Check if challenge has a main flag (not empty/null)
        has_main_flag = bool(challenge['flag'] and challenge['flag'].strip())
        
        # Parse tags
        tags = []
        if challenge.get('tags'):
            tags = json.loads(challenge['tags']) if isinstance(challenge['tags'], str) else challenge['tags']
        
        return {
            'id': challenge['id'],
            'category_id': challenge['categoryId'],
            'title': challenge['title'],
            'description': challenge['description'],
            'difficulty': challenge['difficulty'].lower() if challenge['difficulty'] else 'medium',
            'points': challenge['points'],
            'docker_image': challenge['dockerImage'],
            'hints': hints,
            'questions': questions,
            'tags': tags,
            'solves': challenge['solves'],
            'has_main_flag': has_main_flag,
            'user_progress': {
                'solved': progress['solved'] if progress else False,
                'hints_used': hints_used,
                'solved_questions': solved_questions,
                'score_earned': progress['scoreEarned'] if progress else 0
            }
        }



# ===========================================
# PUBLIC CTF: FLAG SUBMISSION
# ===========================================

@api_router.post("/submit")
async def submit_flag(submission: FlagSubmit, current_user: dict = Depends(get_current_user)):
    """Submit a flag for a public CTF challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get challenge
        challenge = await conn.fetchrow(
            'SELECT id, flag, points, hints FROM ctf_public_challenges WHERE id = $1',
            submission.challenge_id
        )
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Get current progress
        progress = await conn.fetchrow('''
            SELECT id, solved, "hintsUsed", "scoreEarned"
            FROM ctf_public_progress
            WHERE "userId" = $1 AND "challengeId" = $2
        ''', current_user['id'], submission.challenge_id)
        
        # Already solved?
        if progress and progress['solved']:
            return {'correct': True, 'message': 'Already solved', 'points': 0}
        
        # Check flag
        if submission.flag.strip() != challenge['flag'].strip():
            return {'correct': False, 'message': 'Incorrect flag', 'points': 0}
        
        # Calculate points (deduct hint costs)
        hints = json.loads(challenge['hints']) if isinstance(challenge['hints'], str) else (challenge['hints'] or [])
        hints_used = list(progress['hintsUsed']) if progress else []
        hint_cost = sum(hints[i].get('cost', 0) for i in hints_used if i < len(hints))
        points_earned = max(challenge['points'] - hint_cost, 0)
        
        # Update or create progress
        if progress:
            await conn.execute('''
                UPDATE ctf_public_progress SET
                    solved = true, "scoreEarned" = $1, "solvedAt" = NOW(), "updatedAt" = NOW()
                WHERE id = $2
            ''', points_earned, progress['id'])
        else:
            await conn.execute('''
                INSERT INTO ctf_public_progress (
                    id, "userId", "challengeId", solved, "hintsUsed", 
                    "solvedQuestions", "scoreEarned", "solvedAt", "createdAt", "updatedAt"
                ) VALUES ($1, $2, $3, true, '{}', '{}', $4, NOW(), NOW(), NOW())
            ''', generate_uuid(), current_user['id'], submission.challenge_id, points_earned)
        
        # Update user score
        await conn.execute('''
            UPDATE users SET "ctfScore" = "ctfScore" + $1, "updatedAt" = NOW()
            WHERE id = $2
        ''', points_earned, current_user['id'])
        
        # Update solve count
        await conn.execute('''
            UPDATE ctf_public_challenges SET solves = solves + 1, "updatedAt" = NOW()
            WHERE id = $1
        ''', submission.challenge_id)
        
        return {'correct': True, 'message': 'Correct flag!', 'points': points_earned}


@api_router.post("/submit-question")
async def submit_question(submission: QuestionSubmit, current_user: dict = Depends(get_current_user)):
    """Submit a question answer for multi-question challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get challenge
        challenge = await conn.fetchrow(
            'SELECT id, questions FROM ctf_public_challenges WHERE id = $1',
            submission.challenge_id
        )
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        questions = json.loads(challenge['questions']) if isinstance(challenge['questions'], str) else (challenge['questions'] or [])
        if submission.question_index >= len(questions):
            raise HTTPException(status_code=400, detail="Invalid question index")
        
        question = questions[submission.question_index]
        
        # Get or create progress
        progress = await conn.fetchrow('''
            SELECT id, "solvedQuestions", "scoreEarned"
            FROM ctf_public_progress
            WHERE "userId" = $1 AND "challengeId" = $2
        ''', current_user['id'], submission.challenge_id)
        
        solved_questions = list(progress['solvedQuestions']) if progress else []
        
        # Already solved?
        if submission.question_index in solved_questions:
            return {'correct': True, 'message': 'Already solved', 'points': 0}
        
        # Check answer
        if submission.flag.strip() != question.get('flag', '').strip():
            return {'correct': False, 'message': 'Incorrect answer', 'points': 0}
        
        points_earned = question.get('points', 25)
        solved_questions.append(submission.question_index)
        total_earned = (progress['scoreEarned'] if progress else 0) + points_earned
        
        if progress:
            await conn.execute('''
                UPDATE ctf_public_progress SET
                    "solvedQuestions" = $1, "scoreEarned" = $2, "updatedAt" = NOW()
                WHERE id = $3
            ''', solved_questions, total_earned, progress['id'])
        else:
            await conn.execute('''
                INSERT INTO ctf_public_progress (
                    id, "userId", "challengeId", solved, "hintsUsed",
                    "solvedQuestions", "scoreEarned", "createdAt", "updatedAt"
                ) VALUES ($1, $2, $3, false, '{}', $4, $5, NOW(), NOW())
            ''', generate_uuid(), current_user['id'], submission.challenge_id, 
                 solved_questions, total_earned)
        
        # Update user score
        await conn.execute('''
            UPDATE users SET "ctfScore" = "ctfScore" + $1, "updatedAt" = NOW()
            WHERE id = $2
        ''', points_earned, current_user['id'])
        
        return {'correct': True, 'message': 'Correct!', 'points': points_earned}


# ===========================================
# PUBLIC CTF: HINTS
# ===========================================

@api_router.post("/hints")
async def unlock_hint(hint_request: HintRequest, current_user: dict = Depends(get_current_user)):
    """Unlock a hint for a public challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get challenge
        challenge = await conn.fetchrow(
            'SELECT hints FROM ctf_public_challenges WHERE id = $1',
            hint_request.challenge_id
        )
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        hints = json.loads(challenge['hints']) if isinstance(challenge['hints'], str) else (challenge['hints'] or [])
        if hint_request.hint_index >= len(hints):
            raise HTTPException(status_code=404, detail="Hint not found")
        
        hint = hints[hint_request.hint_index]
        
        # Get or create progress
        progress = await conn.fetchrow('''
            SELECT id, "hintsUsed" FROM ctf_public_progress
            WHERE "userId" = $1 AND "challengeId" = $2
        ''', current_user['id'], hint_request.challenge_id)
        
        hints_used = list(progress['hintsUsed']) if progress else []
        
        # Already unlocked?
        if hint_request.hint_index in hints_used:
            return {'hint': hint, 'already_unlocked': True, 'cost': 0}
        
        hints_used.append(hint_request.hint_index)
        
        if progress:
            await conn.execute('''
                UPDATE ctf_public_progress SET "hintsUsed" = $1, "updatedAt" = NOW()
                WHERE id = $2
            ''', hints_used, progress['id'])
        else:
            await conn.execute('''
                INSERT INTO ctf_public_progress (
                    id, "userId", "challengeId", solved, "hintsUsed",
                    "solvedQuestions", "scoreEarned", "createdAt", "updatedAt"
                ) VALUES ($1, $2, $3, false, $4, '{}', 0, NOW(), NOW())
            ''', generate_uuid(), current_user['id'], hint_request.challenge_id, hints_used)
        
        return {'hint': hint, 'already_unlocked': False, 'cost': hint.get('cost', 0)}


# ===========================================
# PUBLIC CTF: LEADERBOARD
# ===========================================

@api_router.get("/leaderboard")
async def get_leaderboard(limit: int = 100, period: str = "all"):
    """
    Get global CTF leaderboard.
    
    Args:
        limit: Maximum number of users to return
        period: Time period filter - "all" (default), "week", "month"
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        if period == "all":
            # All-time leaderboard from ctfScore
            users = await conn.fetch('''
                SELECT u.id, u.name, u.email, u."ctfScore" as score, u.avatar_url
                FROM users u
                WHERE u."ctfScore" > 0
                ORDER BY u."ctfScore" DESC
                LIMIT $1
            ''', limit)
        else:
            # Time-filtered leaderboard - calculate from submissions
            if period == "week":
                interval = "7 days"
            else:  # month
                interval = "30 days"
            
            users = await conn.fetch(f'''
                SELECT 
                    u.id, 
                    u.name, 
                    u.email, 
                    u.avatar_url,
                    COALESCE(SUM(cp.score_earned), 0) as score
                FROM users u
                LEFT JOIN ctf_public_progress cp ON u.id = cp.user_id 
                    AND cp.solved_at >= NOW() - INTERVAL '{interval}'
                    AND cp.is_solved = true
                GROUP BY u.id, u.name, u.email, u.avatar_url
                HAVING COALESCE(SUM(cp.score_earned), 0) > 0
                ORDER BY score DESC
                LIMIT $1
            ''', limit)
        
        return [
            {
                'rank': i + 1,
                'id': u['id'],
                'username': u['name'] or u['email'].split('@')[0],
                'score': int(u['score'] or 0),
                'avatar_url': u.get('avatar_url')
            }
            for i, u in enumerate(users)
        ]



# ===========================================
# PUBLIC CTF: USER STATS
# ===========================================

@api_router.get("/me/stats")
@api_router.get("/stats/me")  # Alias for frontend compatibility
async def get_my_stats(current_user: dict = Depends(get_current_user)):
    """Get current user's CTF statistics with optimized aggregation"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get general stats in one query
        basic_stats = await conn.fetchrow('''
            SELECT 
                (SELECT COUNT(*) FROM ctf_public_progress WHERE "userId" = $1 AND solved = true) as solved_count,
                (SELECT COALESCE(SUM("scoreEarned"), 0) FROM ctf_public_progress WHERE "userId" = $1) as total_points,
                (SELECT COUNT(*) + 1 FROM users WHERE "ctfScore" > (SELECT "ctfScore" FROM users WHERE id = $1)) as rank,
                (SELECT COUNT(*) FROM ctf_public_challenges WHERE "isPublished" = true) as total_challenges
        ''', current_user['id'])

        # Get category breakdown with totals in one query (Eliminates N+1)
        categories = await conn.fetch('''
            SELECT 
                c.name, 
                COUNT(p.id) as solved_count,
                (SELECT COUNT(*) FROM ctf_public_challenges WHERE "categoryId" = c.id AND "isPublished" = true) as total_count
            FROM ctf_categories c
            LEFT JOIN ctf_public_challenges ch ON c.id = ch."categoryId"
            LEFT JOIN ctf_public_progress p ON ch.id = p."challengeId" 
                AND p."userId" = $1 AND p.solved = true
            WHERE c."isActive" = true
            GROUP BY c.id, c.name
        ''', current_user['id'])
        
        category_stats = [
            {
                'category': cat['name'],
                'solved': cat['solved_count'],
                'total': cat['total_count']
            }
            for cat in categories
        ]
        
        # Get activity data for the past year (365 days)
        activity = await conn.fetch('''
            SELECT 
                DATE("solvedAt") as date,
                COUNT(*) as count
            FROM ctf_public_progress
            WHERE "userId" = $1 
                AND solved = true 
                AND "solvedAt" >= NOW() - INTERVAL '365 days'
            GROUP BY DATE("solvedAt")
            ORDER BY date
        ''', current_user['id'])
        
        # Format activity for calendar
        activity_data = {}
        for row in activity:
            if row['date']:
                activity_data[row['date'].strftime('%Y-%m-%d')] = row['count']
        
        return {
            'solved': basic_stats['solved_count'] or 0,
            'points': basic_stats['total_points'] or 0,
            'rank': basic_stats['rank'] or 0,
            'total_challenges': basic_stats['total_challenges'] or 0,
            'categories': category_stats,
            'challenges_solved': basic_stats['solved_count'] or 0,
            'total_points': basic_stats['total_points'] or 0,
            'total_score': basic_stats['total_points'] or 0,
            'category_stats': category_stats,
            'activity': activity_data  # Add activity calendar data
        }


# ===========================================
# PUBLIC USER PROFILE
# ===========================================

@api_router.get("/profile/{user_id}")
async def get_public_profile(user_id: str):
    """
    Get public profile of a user.
    Returns limited info: username, avatar, score, achievements, activity calendar.
    Does NOT return email or private data.
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get user basic info
        user = await conn.fetchrow('''
            SELECT id, name, "ctfScore" as score, avatar_url, bio, social_links, "createdAt" as created_at
            FROM users WHERE id = $1
        ''', user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get rank
        rank_result = await conn.fetchrow('''
            SELECT COUNT(*) + 1 as rank FROM users WHERE "ctfScore" > $1
        ''', user['score'] or 0)
        
        # Get challenge stats
        stats = await conn.fetchrow('''
            SELECT 
                COUNT(*) FILTER (WHERE solved = true) as challenges_solved,
                COALESCE(SUM("scoreEarned"), 0) as total_points
            FROM ctf_public_progress WHERE "userId" = $1
        ''', user_id)
        
        # Get category breakdown
        categories = await conn.fetch('''
            SELECT 
                c.name as category,
                COUNT(p.id) FILTER (WHERE p.solved = true) as solved,
                (SELECT COUNT(*) FROM ctf_public_challenges WHERE "categoryId" = c.id AND "isPublished" = true) as total
            FROM ctf_categories c
            LEFT JOIN ctf_public_challenges ch ON c.id = ch."categoryId"
            LEFT JOIN ctf_public_progress p ON ch.id = p."challengeId" AND p."userId" = $1
            WHERE c."isActive" = true
            GROUP BY c.id, c.name
        ''', user_id)
        
        # Get activity data for the past year (365 days)
        # Count challenges solved per day
        activity = await conn.fetch('''
            SELECT 
                DATE("solvedAt") as date,
                COUNT(*) as count
            FROM ctf_public_progress
            WHERE "userId" = $1 
                AND solved = true 
                AND "solvedAt" >= NOW() - INTERVAL '365 days'
            GROUP BY DATE("solvedAt")
            ORDER BY date
        ''', user_id)
        
        # Format activity for calendar
        activity_data = {}
        for row in activity:
            if row['date']:
                activity_data[row['date'].strftime('%Y-%m-%d')] = row['count']
        
        # Parse social links
        social_links = {}
        if user.get('social_links'):
            try:
                social_links = json.loads(user['social_links']) if isinstance(user['social_links'], str) else user['social_links']
            except:
                pass
        
        # Calculate achievements
        total_challenges = await conn.fetchval('SELECT COUNT(*) FROM ctf_public_challenges WHERE "isPublished" = true')
        challenges_solved = stats['challenges_solved'] or 0
        score = user['score'] or 0
        completion = (challenges_solved / total_challenges * 100) if total_challenges > 0 else 0
        
        achievements = []
        if challenges_solved > 0:
            achievements.append({'name': 'First Blood', 'description': 'Solved first challenge', 'earned': True})
        else:
            achievements.append({'name': 'First Blood', 'description': 'Solve your first challenge', 'earned': False})
            
        if score >= 100:
            achievements.append({'name': 'Getting Started', 'description': 'Earned 100 points', 'earned': True})
        else:
            achievements.append({'name': 'Getting Started', 'description': 'Earn 100 points', 'earned': False})
            
        if completion >= 50:
            achievements.append({'name': 'Halfway There', 'description': 'Completed 50% of challenges', 'earned': True})
        else:
            achievements.append({'name': 'Halfway There', 'description': 'Complete 50% of challenges', 'earned': False})
            
        if completion == 100:
            achievements.append({'name': 'Master Hacker', 'description': 'Completed all challenges', 'earned': True})
        else:
            achievements.append({'name': 'Master Hacker', 'description': 'Complete all challenges', 'earned': False})
        
        return {
            'id': user['id'],
            'username': user['name'] or 'Anonymous',
            'avatar_url': user.get('avatar_url'),
            'bio': user.get('bio') or '',
            'social_links': social_links,
            'score': score,
            'rank': rank_result['rank'],
            'member_since': user['created_at'].strftime('%B %Y') if user['created_at'] else None,
            'challenges_solved': challenges_solved,
            'completion_percentage': round(completion, 1),
            'category_stats': [
                {'category': cat['category'], 'solved': cat['solved'], 'total': cat['total']}
                for cat in categories
            ],
            'achievements': achievements,
            'activity': activity_data  # Date -> count mapping for calendar
        }


# ===========================================
# PUBLIC CTF: ADMIN - CATEGORIES
# ===========================================

@api_router.get("/admin/public-categories")
async def admin_get_categories(admin: dict = Depends(require_admin)):
    """Get all categories (admin)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        categories = await conn.fetch('SELECT * FROM ctf_categories ORDER BY "orderIndex"')
        return [dict(c) for c in categories]


@api_router.post("/admin/public-categories")
async def admin_create_category(data: CategoryCreate, admin: dict = Depends(require_admin)):
    """Create a new category"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        category_id = generate_uuid()
        await conn.execute('''
            INSERT INTO ctf_categories (id, name, description, icon, color, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ''', category_id, data.name, data.description, data.icon, data.color)
        return {'id': category_id}


@api_router.delete("/admin/public-categories/{category_id}")
async def admin_delete_category(category_id: str, admin: dict = Depends(require_admin)):
    """Delete a category"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM ctf_categories WHERE id = $1', category_id)
        return {'success': True}


# ===========================================
# PUBLIC CTF: ADMIN - CHALLENGES
# ===========================================

@api_router.get("/admin/public-challenges")
async def admin_get_public_challenges(category_id: Optional[str] = None, admin: dict = Depends(require_admin)):
    """Get all public challenges (admin, includes flags)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        if category_id:
            challenges = await conn.fetch(
                'SELECT * FROM ctf_public_challenges WHERE "categoryId" = $1 ORDER BY points',
                category_id
            )
        else:
            challenges = await conn.fetch('SELECT * FROM ctf_public_challenges ORDER BY points')
        return [dict(c) for c in challenges]


@api_router.post("/admin/public-challenges")
async def admin_create_public_challenge(data: PublicChallengeCreate, admin: dict = Depends(require_admin)):
    """Create a new public challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        challenge_id = generate_uuid()
        
        hints = [{'text': h.text, 'cost': h.cost} for h in data.hints]
        questions = [{'question': q.question, 'flag': q.flag, 'points': q.points} for q in data.questions]
        
        await conn.execute('''
            INSERT INTO ctf_public_challenges (
                id, "categoryId", title, description, difficulty, points,
                flag, "dockerImage", "dockerCommand", hints, questions,
                "isPublished", solves, "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, NOW(), NOW())
        ''', challenge_id, data.category_id, data.title, data.description,
             data.difficulty, data.points, data.flag,
             data.docker_image, None,  # dockerCommand is deprecated
             json.dumps(hints), json.dumps(questions), data.is_published)
        
        return {'id': challenge_id}


@api_router.delete("/admin/public-challenges/{challenge_id}")
async def admin_delete_public_challenge(challenge_id: str, admin: dict = Depends(require_admin)):
    """Delete a public challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM ctf_public_challenges WHERE id = $1', challenge_id)
        return {'success': True}


# ===========================================
# ADMIN: FETCH LMS COURSES (for linking)
# ===========================================

@api_router.get("/admin/lms-courses")
async def admin_get_lms_courses(admin: dict = Depends(require_admin)):
    """Get all LMS courses available for linking"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        courses = await conn.fetch('''
            SELECT c.id, c.title, c."courseCode", c.description, c.status,
                   CASE WHEN cc.id IS NOT NULL THEN true ELSE false END as has_ctf_course,
                   cc.id as ctf_course_id
            FROM courses c
            LEFT JOIN ctf_courses cc ON c.id = cc."lmsCourseId"
            ORDER BY c.title
        ''')
        return [dict(c) for c in courses]


@api_router.post("/admin/link-lms-course")
async def admin_link_lms_course(lms_course_id: str, color: str = "gray", admin: dict = Depends(require_admin)):
    """Create a CTF course linked to an LMS course"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Check if already linked
        existing = await conn.fetchrow(
            'SELECT id FROM ctf_courses WHERE "lmsCourseId" = $1',
            lms_course_id
        )
        if existing:
            raise HTTPException(status_code=400, detail="LMS course already linked")
        
        ctf_course_id = generate_uuid()
        await conn.execute('''
            INSERT INTO ctf_courses (id, "lmsCourseId", "isActive", color, "createdAt", "updatedAt")
            VALUES ($1, $2, true, $3, NOW(), NOW())
        ''', ctf_course_id, lms_course_id, color)
        
        return {'id': ctf_course_id, 'message': 'CTF course linked successfully'}


# ===========================================
# ADMIN: CATEGORIES (frontend uses /admin/categories)
# ===========================================

@api_router.get("/admin/categories")
async def admin_get_all_categories(admin: dict = Depends(require_admin)):
    """Get all categories (admin)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        categories = await conn.fetch('SELECT * FROM ctf_categories ORDER BY "orderIndex"')
        return [dict(c) for c in categories]


@api_router.post("/admin/categories")
async def admin_create_new_category(data: CategoryCreate, admin: dict = Depends(require_admin)):
    """Create a new category"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        category_id = generate_uuid()
        await conn.execute('''
            INSERT INTO ctf_categories (id, name, description, icon, color, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ''', category_id, data.name, data.description, data.icon, data.color)
        return {'id': category_id}


@api_router.put("/admin/categories/{category_id}")
async def admin_update_category(category_id: str, data: CategoryCreate, admin: dict = Depends(require_admin)):
    """Update a category"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('''
            UPDATE ctf_categories SET name = $1, description = $2, icon = $3, "updatedAt" = NOW()
            WHERE id = $4
        ''', data.name, data.description, data.icon, category_id)
        return {'success': True}


@api_router.delete("/admin/categories/{category_id}")
async def admin_remove_category(category_id: str, admin: dict = Depends(require_admin)):
    """Delete a category"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM ctf_categories WHERE id = $1', category_id)
        return {'success': True}


# ===========================================
# ADMIN: USERS
# ===========================================

@api_router.get("/admin/users")
async def admin_get_users(admin: dict = Depends(require_admin)):
    """Get all users (admin)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        users = await conn.fetch('''
            SELECT u.id, u.name, u.email, u."ctfScore" as score,
                   u."isLocked" as is_banned, u."createdAt" as created_at,
                   r.type as role_type
            FROM users u
            JOIN "Role" r ON u."roleId" = r.id
            ORDER BY u."ctfScore" DESC
        ''')
        
        role_map = {'SUPERADMIN': 'superadmin', 'ADMIN': 'admin', 'INSTRUCTOR': 'admin'}
        return [
            {
                'id': u['id'],
                'username': u['name'] or u['email'].split('@')[0],
                'email': u['email'],
                'score': u['score'] or 0,
                'is_banned': u['is_banned'] or False,
                'role': role_map.get(u['role_type'], 'user'),
                'created_at': u['created_at'].isoformat() if u['created_at'] else None
            }
            for u in users
        ]


@api_router.get("/admin/users/search")
async def admin_search_users(q: str = "", admin: dict = Depends(require_admin)):
    """Search users by username or email for notifications"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Search with ILIKE for case-insensitive matching
        search_query = f"%{q}%"
        users = await conn.fetch('''
            SELECT u.id, u.name, u.email, u."ctfScore" as score,
                   r.type as role_type
            FROM users u
            JOIN "Role" r ON u."roleId" = r.id
            WHERE u.name ILIKE $1 OR u.email ILIKE $1
            ORDER BY u.name
            LIMIT 20
        ''', search_query)
        
        return [
            {
                'id': u['id'],
                'username': u['name'] or u['email'].split('@')[0],
                'email': u['email'],
                'score': u['score'] or 0
            }
            for u in users
        ]


@api_router.get("/admin/users/{user_id}")
async def admin_get_user_detail(user_id: str, admin: dict = Depends(require_admin)):
    """Get detailed user info (admin)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow('''
            SELECT u.id, u.name, u.email, u."ctfScore" as score,
                   u."isLocked" as is_banned, u."createdAt" as created_at,
                   r.type as role_type
            FROM users u
            JOIN "Role" r ON u."roleId" = r.id
            WHERE u.id = $1
        ''', user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get solved challenges
        solved = await conn.fetch('''
            SELECT p.id, p."scoreEarned" as score_earned, p."solvedAt" as solved_at,
                   c.title as challenge_title
            FROM ctf_public_progress p
            JOIN ctf_public_challenges c ON p."challengeId" = c.id
            WHERE p."userId" = $1 AND p.solved = true
            ORDER BY p."solvedAt" DESC
        ''', user_id)
        
        role_map = {'SUPERADMIN': 'superadmin', 'ADMIN': 'admin', 'INSTRUCTOR': 'admin'}
        return {
            'id': user['id'],
            'username': user['name'] or user['email'].split('@')[0],
            'email': user['email'],
            'score': user['score'] or 0,
            'is_banned': user['is_banned'] or False,
            'role': role_map.get(user['role_type'], 'user'),
            'created_at': user['created_at'].isoformat() if user['created_at'] else None,
            'solved_challenges': [
                {
                    'challenge_title': s['challenge_title'],
                    'score_earned': s['score_earned'],
                    'solved_at': s['solved_at'].isoformat() if s['solved_at'] else None
                }
                for s in solved
            ]
        }


@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, data: UserUpdate, admin: dict = Depends(require_admin)):
    """Update user (ban/unban, change role)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        if data.is_banned is not None:
            # Update BOTH isLocked (CTF uses this) AND isActive (LMS uses this)
            # is_banned=True means: isLocked=True, isActive=False
            await conn.execute('''
                UPDATE users SET "isLocked" = $1, "isActive" = $2, "updatedAt" = NOW() WHERE id = $3
            ''', data.is_banned, not data.is_banned, user_id)
        
        if data.role is not None:
            # Only superadmin can change roles
            if admin.get('role') != 'superadmin':
                raise HTTPException(status_code=403, detail="Only superadmin can change roles")
            
            role_type_map = {'superadmin': 'SUPERADMIN', 'admin': 'ADMIN', 'user': 'STUDENT'}
            role_type = role_type_map.get(data.role, 'STUDENT')
            
            # Get role id
            role_row = await conn.fetchrow('SELECT id FROM "Role" WHERE type = $1', role_type)
            if role_row:
                await conn.execute('''
                    UPDATE users SET "roleId" = $1, "updatedAt" = NOW() WHERE id = $2
                ''', role_row['id'], user_id)
        
        return {'success': True}


@api_router.post("/admin/users/{user_id}/reset-progress")
async def admin_reset_user_progress(user_id: str, admin: dict = Depends(require_admin)):
    """Reset user's CTF progress"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Delete public progress
        await conn.execute('DELETE FROM ctf_public_progress WHERE "userId" = $1', user_id)
        
        # Reset score
        await conn.execute('''
            UPDATE users SET "ctfScore" = 0, "updatedAt" = NOW() WHERE id = $1
        ''', user_id)
        
        return {'success': True}


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    """Delete a user account"""
    # Prevent deleting self
    if user_id == admin['id']:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Check target user role
        target_user = await conn.fetchrow('''
            SELECT u.id, r.type as role_type
            FROM users u
            JOIN "Role" r ON u."roleId" = r.id
            WHERE u.id = $1
        ''', user_id)
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Prevent deleting superadmin unless you are one (or maybe not even then? let's allow superadmin to delete other admins/users)
        # Actually safer: Only Superadmin can delete other Admins. Admins can only delete Users.
        # And NOBODY can delete a Superadmin via this API (manual DB intervention required for safety).
        
        target_role = target_user['role_type']
        admin_role = admin['role']
        
        if target_role == 'SUPERADMIN':
            raise HTTPException(status_code=403, detail="Cannot delete a Superadmin account")
            
        if target_role in ['ADMIN', 'INSTRUCTOR'] and admin_role != 'superadmin':
             raise HTTPException(status_code=403, detail="Only Superadmin can delete other Admins")

        # Proceed with delete
        # Note: Foreign key cascades should handle related data (progress, submissions, etc.)
        # but let's be explicit about crucial data if needed. 
        # Assuming standard CASCADE setup in DB schema.
        await conn.execute('DELETE FROM users WHERE id = $1', user_id)
        
        return {'success': True}


# ===========================================
# ADMIN: SUBMISSIONS
# ===========================================

@api_router.get("/admin/submissions")
async def admin_get_submissions(limit: int = 200, solved_only: bool = False, admin: dict = Depends(require_admin)):
    """Get all user submissions/progress (admin)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        query = '''
            SELECT p.id, p.solved, p."hintsUsed" as hints_used, 
                   p."scoreEarned" as score_earned, p."solvedAt" as solved_at,
                   u.name as username, c.title as challenge_title
            FROM ctf_public_progress p
            JOIN users u ON p."userId" = u.id
            JOIN ctf_public_challenges c ON p."challengeId" = c.id
        '''
        
        if solved_only:
            query += ' WHERE p.solved = true'
        
        query += ' ORDER BY p."solvedAt" DESC NULLS LAST LIMIT $1'
        
        submissions = await conn.fetch(query, limit)
        
        return [
            {
                'id': s['id'],
                'username': s['username'] or 'Unknown',
                'challenge_title': s['challenge_title'],
                'solved': s['solved'],
                'hints_used': list(s['hints_used']) if s['hints_used'] else [],
                'score_earned': s['score_earned'] or 0,
                'solved_at': s['solved_at'].isoformat() if s['solved_at'] else None
            }
            for s in submissions
        ]


# ===========================================
# ADMIN: CHALLENGES (frontend uses /admin/challenges)
# ===========================================

@api_router.get("/admin/challenges")
async def admin_get_all_challenges(admin: dict = Depends(require_admin)):
    """Get all challenges (admin view with FLAGS)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        challenges = await conn.fetch('''
            SELECT * FROM ctf_public_challenges ORDER BY points
        ''')
        
        result = []
        for c in challenges:
            # Convert camelCase DB fields to snake_case for frontend
            hints = c['hints']
            if isinstance(hints, str):
                hints = json.loads(hints)
            questions = c['questions']
            if isinstance(questions, str):
                questions = json.loads(questions)
            tags = c.get('tags') or []
            if isinstance(tags, str):
                tags = json.loads(tags)
            
            result.append({
                'id': c['id'],
                'category_id': c['categoryId'],
                'title': c['title'],
                'description': c['description'],
                'difficulty': c['difficulty'].lower() if c['difficulty'] else 'medium',
                'points': c['points'],
                'flag': c['flag'],
                'docker_image': c['dockerImage'],
                'hints': hints or [],
                'questions': questions or [],
                'tags': tags or [],
                'is_published': c['isPublished'],
                'solves': c['solves']
            })

        
        return result


@api_router.post("/admin/challenges")
async def admin_create_challenge(data: PublicChallengeCreate, admin: dict = Depends(require_admin)):
    """Create a new challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        challenge_id = generate_uuid()
        
        hints = [{'text': h.text, 'cost': h.cost} for h in data.hints]
        questions = [{'question': q.question, 'flag': q.flag, 'points': q.points} for q in data.questions]
        tags = data.tags if data.tags else []
        
        await conn.execute('''
            INSERT INTO ctf_public_challenges (
                id, "categoryId", title, description, difficulty, points,
                flag, "dockerImage", "dockerCommand", hints, questions,
                tags, "isPublished", solves, "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5::"CtfDifficulty", $6, $7, $8, $9, $10, $11, $12, $13, 0, NOW(), NOW())
        ''', challenge_id, data.category_id, data.title, data.description,
             data.difficulty.upper(), data.points, data.flag,
             data.docker_image, None,  # dockerCommand deprecated
             json.dumps(hints), json.dumps(questions), json.dumps(tags), data.is_published)
        
        return {'id': challenge_id}


@api_router.put("/admin/challenges/{challenge_id}")
async def admin_update_challenge(challenge_id: str, data: PublicChallengeCreate, admin: dict = Depends(require_admin)):
    """Update a challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        hints = [{'text': h.text, 'cost': h.cost} for h in data.hints]
        questions = [{'question': q.question, 'flag': q.flag, 'points': q.points} for q in data.questions]
        tags = data.tags if data.tags else []
        
        await conn.execute('''
            UPDATE ctf_public_challenges SET
                "categoryId" = $1, title = $2, description = $3, difficulty = $4::"CtfDifficulty",
                points = $5, flag = $6, "dockerImage" = $7, "dockerCommand" = $8,
                hints = $9, questions = $10, tags = $11, "isPublished" = $12, "updatedAt" = NOW()
            WHERE id = $13
        ''', data.category_id, data.title, data.description, data.difficulty.upper(),
             data.points, data.flag, data.docker_image, None,  # dockerCommand deprecated
             json.dumps(hints), json.dumps(questions), json.dumps(tags), data.is_published, challenge_id)
        
        return {'success': True}


@api_router.delete("/admin/challenges/{challenge_id}")
async def admin_delete_challenge(challenge_id: str, admin: dict = Depends(require_admin)):
    """Delete a challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM ctf_public_challenges WHERE id = $1', challenge_id)
        return {'success': True}


# ===========================================
# CHALLENGE ARTIFACTS API
# ===========================================

@api_router.get("/challenges/{challenge_id}/artifacts")
async def get_challenge_artifacts(challenge_id: str):
    """List all artifacts for a challenge"""
    # Wait, did I already add the table creation? Yes, in the first multi_replace that succeeded partially.
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('''
            SELECT id, filename, file_size, mime_type, created_at 
            FROM ctf_challenge_artifacts 
            WHERE challenge_id = $1
            ORDER BY created_at DESC
        ''', challenge_id)
        
        return [dict(r) for r in rows]

@api_router.post("/admin/challenges/{challenge_id}/artifacts")
async def upload_challenge_artifact(
    challenge_id: str, 
    file: UploadFile = File(...), 
    admin: dict = Depends(require_admin)
):
    """Upload an artifact for a challenge"""
    import mimetypes
    import time
    
    # 300MB Limit: 300 * 1024 * 1024 bytes
    MAX_SIZE = 300 * 1024 * 1024
    
    # Pre-check size if possible (some clients don't send content-length)
    # So we'll check during read
    
    # Security: Sanitize filename and use UUID for storage
    original_filename = file.filename
    clean_filename = "".join(c for c in original_filename if c.isalnum() or c in "._- ").strip()
    if not clean_filename:
        clean_filename = "artifact_" + str(uuid.uuid4())[:8]
        
    artifact_id = uuid.uuid4()
    # Store with UUID as filename to prevent traversal/overwrite
    storage_name = f"{artifact_id}_{clean_filename}"
    file_path = ROOT_DIR / "uploads" / "artifacts" / storage_name
    
    try:
        # Check size by reading chunk by chunk or fully
        content = await file.read()
        file_size = len(content)
        
        if file_size > MAX_SIZE:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 300MB.")
        
        with open(file_path, "wb") as f:
            f.write(content)
            
        mime_type, _ = mimetypes.guess_type(clean_filename)
        
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO ctf_challenge_artifacts (id, challenge_id, filename, file_path, file_size, mime_type)
                VALUES ($1, $2, $3, $4, $5, $6)
            ''', artifact_id, challenge_id, clean_filename, str(file_path), file_size, mime_type)
            
        return {
            "id": str(artifact_id),
            "filename": clean_filename,
            "size": file_size
        }
    except Exception as e:
        logger.error(f"Artifact upload failed: {e}")
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.delete("/admin/artifacts/{artifact_id}")
async def delete_challenge_artifact(artifact_id: str, admin: dict = Depends(require_admin)):
    """Delete an artifact"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow('SELECT file_path FROM ctf_challenge_artifacts WHERE id = $1', uuid.UUID(artifact_id))
        if not row:
            raise HTTPException(status_code=404, detail="Artifact not found")
        
        file_path = Path(row['file_path'])
        if file_path.exists():
            file_path.unlink()
            
        await conn.execute('DELETE FROM ctf_challenge_artifacts WHERE id = $1', uuid.UUID(artifact_id))
        return {"success": True}

@api_router.get("/artifacts/download/{artifact_id}")
async def download_artifact(artifact_id: str):
    """Download an artifact"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow('SELECT file_path, filename, mime_type FROM ctf_challenge_artifacts WHERE id = $1', uuid.UUID(artifact_id))
        if not row:
            raise HTTPException(status_code=404, detail="Artifact not found")
            
        file_path = Path(row['file_path'])
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File missing on server")
            
        return FileResponse(
            path=file_path,
            filename=row['filename'],
            media_type=row['mime_type'] or 'application/octet-stream'
        )

@api_router.post("/admin/zip-info")
async def get_zip_info(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    """Extract file list from a ZIP for preview"""
    import zipfile
    import io
    
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are supported for preview")
    
    try:
        content = await file.read()
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            # Get list of files, ignore hidden/mac files
            files = [info.filename for info in z.infolist() if not info.filename.startswith('__MACOSX') and not info.filename.split('/')[-1].startswith('.')]
            return {"files": files, "count": len(files)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid ZIP file: {str(e)}")


# ===========================================
# ADMIN: DOCKER CHALLENGE UPLOAD
# ===========================================

DOCKER_BUILDS_DIR = Path("/tmp/nexus-docker-builds")
DOCKER_BUILDS_DIR.mkdir(exist_ok=True)


@api_router.get("/admin/docker-images")
async def list_docker_images(admin: dict = Depends(require_admin)):
    """
    List available Docker images from GHCR and challenge database.
    Returns images that can be used for challenges.
    """
    images = []
    
    # 1. Get images from existing challenges (already built/uploaded)
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT DISTINCT "dockerImage" as image, title, "createdAt"
                FROM ctf_public_challenges 
                WHERE "dockerImage" IS NOT NULL 
                AND "dockerImage" != ''
                AND "dockerImage" NOT LIKE 'pending-%'
                AND "dockerImage" NOT LIKE 'local-only:%'
                ORDER BY "createdAt" DESC
                LIMIT 50
            ''')
            for row in rows:
                images.append({
                    'image': row['image'],
                    'source': 'database',
                    'label': f"Used in: {row['title'][:30]}...",
                    'created_at': row['createdAt'].isoformat() if row['createdAt'] else None
                })
    except Exception as e:
        logger.error(f"Failed to fetch images from DB: {e}")
    
    # 2. Try to fetch from GHCR API (if token available)
    ghcr_username = os.environ.get('GHCR_USERNAME', '')
    ghcr_token = os.environ.get('GHCR_TOKEN', '')
    
    # Also try to get from database if not in env
    if not ghcr_username or not ghcr_token:
        try:
            pool = await Database.get_pool()
            async with pool.acquire() as conn:
                username_row = await conn.fetchrow(
                    "SELECT value FROM admin_settings WHERE key = 'ghcr_username'"
                )
                token_row = await conn.fetchrow(
                    "SELECT value FROM admin_settings WHERE key = 'ghcr_token'"
                )
                if username_row:
                    ghcr_username = username_row['value']
                if token_row:
                    ghcr_token = token_row['value']
        except Exception as e:
            logger.warning(f"Could not fetch GHCR settings from DB: {e}")

    if ghcr_token and ghcr_username:
        logger.info(f"Fetching GHCR images for user: {ghcr_username}")
        try:
            async with httpx.AsyncClient() as client:
                # First try authenticated user's packages (works with PAT tokens)
                resp = await client.get(
                    "https://api.github.com/user/packages?package_type=container",
                    headers={
                        "Authorization": f"Bearer {ghcr_token}",
                        "Accept": "application/vnd.github+json"
                    },
                    timeout=10.0
                )
                
                logger.info(f"GHCR API response status: {resp.status_code}")
                
                if resp.status_code == 200:
                    packages = resp.json()
                    logger.info(f"Found {len(packages)} GHCR packages")
                    
                    for pkg in packages:
                        owner = pkg.get('owner', {}).get('login', ghcr_username)
                        image_url = f"ghcr.io/{owner.lower()}/{pkg['name'].lower()}:latest"
                        
                        # Add if not duplicate
                        if not any(img['image'].lower() == image_url.lower() for img in images):
                            images.append({
                                'image': image_url,
                                'source': 'ghcr',
                                'label': pkg['name'],
                                'created_at': pkg.get('created_at')
                            })
                else:
                    logger.warning(f"GHCR API returned: {resp.status_code} - {resp.text[:200]}")
        except Exception as e:
            logger.error(f"Failed to fetch from GHCR API: {e}")
    else:
        logger.info(f"GHCR not configured - token: {bool(ghcr_token)}, username: {bool(ghcr_username)}")
    
    logger.info(f"Returning {len(images)} total images")
    return {
        'images': images,
        'ghcr_connected': bool(ghcr_token),
        'ghcr_username': ghcr_username
    }


# =============================================================================
# GHCR Settings API
# =============================================================================

@api_router.get("/admin/settings/ghcr")
async def get_ghcr_settings(admin: dict = Depends(require_admin)):
    """Get GHCR configuration"""
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            # Try to get settings from database
            username_row = await conn.fetchrow(
                "SELECT value FROM admin_settings WHERE key = 'ghcr_username'"
            )
            token_row = await conn.fetchrow(
                "SELECT value FROM admin_settings WHERE key = 'ghcr_token'"  
            )
            
            username = username_row['value'] if username_row else os.environ.get('GHCR_USERNAME', '')
            has_token = bool(token_row) or bool(os.environ.get('GHCR_TOKEN'))
            
            return {
                'username': username,
                'token': '***' if has_token else '',  # Don't expose token
                'connected': has_token
            }
    except Exception as e:
        # Table might not exist yet, fall back to env vars
        return {
            'username': os.environ.get('GHCR_USERNAME', ''),
            'token': '***' if os.environ.get('GHCR_TOKEN') else '',
            'connected': bool(os.environ.get('GHCR_TOKEN'))
        }


class GHCRConfig(BaseModel):
    username: str
    token: str


@api_router.post("/admin/settings/ghcr")
async def save_ghcr_settings(config: GHCRConfig, admin: dict = Depends(require_admin)):
    """Save GHCR configuration to database"""
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            # Ensure admin_settings table exists
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS admin_settings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    key TEXT UNIQUE NOT NULL,
                    value TEXT NOT NULL,
                    encrypted BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            ''')
            
            # Upsert username
            await conn.execute('''
                INSERT INTO admin_settings (key, value, updated_at)
                VALUES ('ghcr_username', $1, NOW())
                ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
            ''', config.username)
            
            # Upsert token (only if not masked)
            if config.token and config.token != '***':
                await conn.execute('''
                    INSERT INTO admin_settings (key, value, encrypted, updated_at)
                    VALUES ('ghcr_token', $1, true, NOW())
                    ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
                ''', config.token)
            
            # Also update environment for current process
            os.environ['GHCR_USERNAME'] = config.username
            if config.token and config.token != '***':
                os.environ['GHCR_TOKEN'] = config.token
            
            return {'success': True, 'message': 'GHCR settings saved'}
    except Exception as e:
        logger.error(f"Failed to save GHCR settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/settings/ghcr/test")
async def test_ghcr_connection(config: GHCRConfig, admin: dict = Depends(require_admin)):
    """Test GHCR connection with provided credentials"""
    try:
        async with httpx.AsyncClient() as client:
            # Test by listing packages
            resp = await client.get(
                f"https://api.github.com/users/{config.username}/packages?package_type=container",
                headers={
                    "Authorization": f"Bearer {config.token}",
                    "Accept": "application/vnd.github+json"
                },
                timeout=10.0
            )
            
            if resp.status_code == 200:
                packages = resp.json()
                return {
                    'success': True,
                    'message': f'Connection successful! Found {len(packages)} packages.'
                }
            elif resp.status_code == 401:
                return {'success': False, 'error': 'Invalid token - authentication failed'}
            elif resp.status_code == 404:
                return {'success': False, 'error': 'User not found'}
            else:
                return {'success': False, 'error': f'API error: {resp.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


# =============================================================================
# Image Build API - Build and push Docker images
# =============================================================================

def cleanup_old_builds():
    """Remove build directories older than 1 hour"""
    builds_dir = Path("/tmp/image-builds")
    if not builds_dir.exists():
        return
    
    import time
    one_hour_ago = time.time() - 3600
    
    for build_dir in builds_dir.iterdir():
        if build_dir.is_dir():
            try:
                # Check modification time
                if build_dir.stat().st_mtime < one_hour_ago:
                    shutil.rmtree(build_dir, ignore_errors=True)
                    logger.info(f"Cleaned up old build: {build_dir}")
            except Exception as e:
                logger.warning(f"Failed to clean up {build_dir}: {e}")


@api_router.post("/admin/images/build")
async def build_docker_image(
    file: UploadFile = File(...),
    image_name: str = Form(...),
    admin: dict = Depends(require_admin)
):
    """Build a Docker image from uploaded ZIP and push to GHCR"""
    
    # Clean up old builds first
    cleanup_old_builds()
    
    # Get GHCR credentials
    ghcr_username = os.environ.get('GHCR_USERNAME')
    ghcr_token = os.environ.get('GHCR_TOKEN')
    
    # Try to get from database if not in env
    if not ghcr_username or not ghcr_token:
        try:
            pool = await Database.get_pool()
            async with pool.acquire() as conn:
                username_row = await conn.fetchrow(
                    "SELECT value FROM admin_settings WHERE key = 'ghcr_username'"
                )
                token_row = await conn.fetchrow(
                    "SELECT value FROM admin_settings WHERE key = 'ghcr_token'"
                )
                if username_row:
                    ghcr_username = username_row['value']
                if token_row:
                    ghcr_token = token_row['value']
        except Exception as e:
            logger.warning(f"Could not fetch GHCR settings from DB: {e}")
    
    if not ghcr_username or not ghcr_token:
        raise HTTPException(status_code=400, detail="GHCR not configured. Go to Image Registry settings.")
    
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
    
    # Clean image name
    clean_name = image_name.lower().replace(' ', '-').replace('_', '-')
    clean_name = ''.join(c for c in clean_name if c.isalnum() or c == '-')
    
    # Create temp directory
    build_dir = Path(f"/tmp/image-builds/{clean_name}-{uuid.uuid4().hex[:8]}")
    build_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Save uploaded file
        zip_path = build_dir / "upload.zip"
        with open(zip_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Extract ZIP
        import zipfile
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(build_dir / "extracted")
        
        # Find Dockerfile
        extracted_dir = build_dir / "extracted"
        dockerfile_path = None
        
        # Check root level first
        if (extracted_dir / "Dockerfile").exists():
            dockerfile_path = extracted_dir / "Dockerfile"
        else:
            # Check one level deep (common when zipping a folder)
            for subdir in extracted_dir.iterdir():
                if subdir.is_dir() and (subdir / "Dockerfile").exists():
                    dockerfile_path = subdir / "Dockerfile"
                    extracted_dir = subdir  # Use this as build context
                    break
        
        if not dockerfile_path:
            raise HTTPException(status_code=400, detail="Dockerfile not found in ZIP. Place it at the root.")
        
        # Build the image - Docker requires lowercase for image names!
        full_image_name = f"ghcr.io/{ghcr_username.lower()}/{clean_name}:latest"
        
        if not docker_client:
            raise HTTPException(status_code=500, detail="Docker not available on server")
        
        logger.info(f"Building image: {full_image_name}")
        
        try:
            # Build image
            image, build_logs = docker_client.images.build(
                path=str(extracted_dir),
                tag=full_image_name,
                rm=True
            )
            logger.info(f"Image built successfully: {full_image_name}")
            
            # Login to GHCR
            docker_client.login(
                username=ghcr_username,
                password=ghcr_token,
                registry="ghcr.io"
            )
            logger.info("Logged in to GHCR")
            
            # Push to GHCR
            logger.info(f"Pushing image to GHCR: {full_image_name}")
            push_result = docker_client.images.push(full_image_name)
            logger.info(f"Push result: {push_result}")
            
            # Clean up
            shutil.rmtree(build_dir, ignore_errors=True)
            
            return {
                'status': 'success',
                'image': full_image_name,
                'message': f'Image {clean_name} built and pushed to GHCR!'
            }
            
        except Exception as build_error:
            logger.error(f"Docker build/push failed: {build_error}")
            shutil.rmtree(build_dir, ignore_errors=True)
            raise HTTPException(status_code=500, detail=f"Build failed: {str(build_error)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image build error: {e}")
        shutil.rmtree(build_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/admin/images/{image_name:path}")
async def delete_docker_image(image_name: str, admin: dict = Depends(require_admin)):
    """Delete a Docker image from GHCR (requires manual deletion via GitHub)"""
    # Note: GHCR doesn't have a simple delete API
    # Images need to be deleted manually from GitHub Packages page
    return {
        'success': False,
        'message': 'Images must be deleted from GitHub Packages page: https://github.com/settings/packages'
    }



@api_router.post("/admin/challenges/upload")
async def admin_create_challenge_with_docker(
    file: UploadFile = File(...),
    challenge_data: str = Form(...),
    admin: dict = Depends(require_admin)
):
    """
    Create a new challenge with Docker files (ZIP upload).
    The ZIP must contain a Dockerfile at the root.
    """
    # Parse challenge data from JSON string
    try:
        data = json.loads(challenge_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid challenge data JSON")
    
    # Validate file type
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
    
    challenge_id = generate_uuid()
    build_dir = DOCKER_BUILDS_DIR / challenge_id
    
    try:
        # Save and extract ZIP
        build_dir.mkdir(parents=True, exist_ok=True)
        zip_path = build_dir / "challenge.zip"
        
        with open(zip_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Extract ZIP
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(build_dir / "src")
        
        # Check for Dockerfile at root
        dockerfile_path = build_dir / "src" / "Dockerfile"
        if not dockerfile_path.exists():
            # Check if it's in a subdirectory (single folder in zip)
            src_contents = list((build_dir / "src").iterdir())
            if len(src_contents) == 1 and src_contents[0].is_dir():
                dockerfile_path = src_contents[0] / "Dockerfile"
        
        if not dockerfile_path.exists():
            shutil.rmtree(build_dir)
            raise HTTPException(status_code=400, detail="Dockerfile not found at root of ZIP")
        
        # Build Docker image if docker client is available
        docker_image = None
        if docker_client:
            try:
                # Use GitHub Container Registry (GHCR) for image storage
                # Images are stored at: ghcr.io/Abhizzz123/ctf-challenges/{short-id}
                ghcr_username = os.environ.get('GHCR_USERNAME', 'Abhizzz123')
                ghcr_token = os.environ.get('GHCR_TOKEN')  # GitHub PAT with packages:write
                
                short_id = challenge_id[:8].lower()
                image_name = f"ghcr.io/{ghcr_username}/ctf-challenges/{short_id}:latest"
                
                logger.info(f"Building Docker image: {image_name}")
                
                # Build from dockerfile directory
                dockerfile_dir = dockerfile_path.parent
                image, build_logs = docker_client.images.build(
                    path=str(dockerfile_dir),
                    tag=image_name,
                    rm=True
                )
                logger.info(f"Docker image built successfully: {image_name}")
                
                # Push to GHCR if token is available
                if ghcr_token:
                    try:
                        # Login to GHCR
                        docker_client.login(
                            username=ghcr_username,
                            password=ghcr_token,
                            registry="ghcr.io"
                        )
                        # Push the image
                        logger.info(f"Pushing image to GHCR: {image_name}")
                        push_logs = docker_client.images.push(image_name)
                        logger.info(f"Image pushed successfully to GHCR")
                        docker_image = image_name
                    except Exception as push_error:
                        logger.error(f"Failed to push to GHCR: {push_error}")
                        docker_image = f"local-only:{image_name}"  # Built but not pushed
                else:
                    logger.warning("GHCR_TOKEN not set - image built but not pushed")
                    docker_image = f"local-only:{image_name}"
                    
            except Exception as e:
                logger.error(f"Docker build failed: {e}")
                # Store path for manual build later
                docker_image = f"pending-build:{challenge_id}"
        else:
            # Docker not available, store for later build
            docker_image = f"pending-build:{challenge_id}"
            logger.warning("Docker not available, challenge stored for manual build")
        
        # Save challenge to database
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            hints = data.get('hints', [])
            questions = data.get('questions', [])
            
            await conn.execute('''
                INSERT INTO ctf_public_challenges (
                    id, "categoryId", title, description, difficulty, points,
                    flag, "dockerImage", "dockerCommand", hints, questions,
                    "isPublished", solves, "createdAt", "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5::"CtfDifficulty", $6, $7, $8, $9, $10, $11, $12, 0, NOW(), NOW())
            ''', challenge_id, data.get('category_id'), data.get('title'), data.get('description'),
                 data.get('difficulty', 'medium').upper(), data.get('points', 100), data.get('flag', ''),
                 docker_image, None,  # dockerCommand deprecated
                 json.dumps(hints), json.dumps(questions), data.get('is_published', True))
        
        return {
            'id': challenge_id,
            'docker_image': docker_image,
            'build_status': 'success' if docker_image and not docker_image.startswith('pending') else 'pending'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Challenge upload failed: {e}")
        if build_dir.exists():
            shutil.rmtree(build_dir)
        raise HTTPException(status_code=500, detail=f"Failed to process upload: {str(e)}")


@api_router.put("/admin/challenges/{challenge_id}/upload")
async def admin_update_challenge_with_docker(
    challenge_id: str,
    file: UploadFile = File(...),
    challenge_data: str = Form(...),
    admin: dict = Depends(require_admin)
):
    """
    Update an existing challenge with new Docker files (ZIP upload).
    """
    # Parse challenge data from JSON string
    try:
        data = json.loads(challenge_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid challenge data JSON")
    
    # Validate file type
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
    
    build_dir = DOCKER_BUILDS_DIR / challenge_id
    
    try:
        # Clean up old build dir
        if build_dir.exists():
            shutil.rmtree(build_dir)
        
        # Save and extract ZIP
        build_dir.mkdir(parents=True, exist_ok=True)
        zip_path = build_dir / "challenge.zip"
        
        with open(zip_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Extract ZIP
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(build_dir / "src")
        
        # Check for Dockerfile
        dockerfile_path = build_dir / "src" / "Dockerfile"
        if not dockerfile_path.exists():
            src_contents = list((build_dir / "src").iterdir())
            if len(src_contents) == 1 and src_contents[0].is_dir():
                dockerfile_path = src_contents[0] / "Dockerfile"
        
        if not dockerfile_path.exists():
            shutil.rmtree(build_dir)
            raise HTTPException(status_code=400, detail="Dockerfile not found at root of ZIP")
        
        # Build Docker image
        docker_image = None
        if docker_client:
            try:
                # Use GitHub Container Registry (GHCR)
                ghcr_username = os.environ.get('GHCR_USERNAME', 'Abhizzz123')
                ghcr_token = os.environ.get('GHCR_TOKEN')
                
                short_id = challenge_id[:8].lower()
                image_name = f"ghcr.io/{ghcr_username}/ctf-challenges/{short_id}:latest"
                
                dockerfile_dir = dockerfile_path.parent
                image, _ = docker_client.images.build(
                    path=str(dockerfile_dir),
                    tag=image_name,
                    rm=True
                )
                logger.info(f"Docker image built: {image_name}")
                
                # Push to GHCR
                if ghcr_token:
                    try:
                        docker_client.login(username=ghcr_username, password=ghcr_token, registry="ghcr.io")
                        docker_client.images.push(image_name)
                        docker_image = image_name
                        logger.info(f"Image pushed to GHCR: {image_name}")
                    except Exception as push_error:
                        logger.error(f"GHCR push failed: {push_error}")
                        docker_image = f"local-only:{image_name}"
                else:
                    docker_image = f"local-only:{image_name}"
            except Exception as e:
                logger.error(f"Docker build failed: {e}")
                docker_image = f"pending-build:{challenge_id}"
        else:
            docker_image = f"pending-build:{challenge_id}"
        
        # Update challenge in database
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            hints = data.get('hints', [])
            questions = data.get('questions', [])
            
            await conn.execute('''
                UPDATE ctf_public_challenges SET
                    "categoryId" = $1, title = $2, description = $3, difficulty = $4::"CtfDifficulty",
                    points = $5, flag = $6, "dockerImage" = $7, "dockerCommand" = $8,
                    hints = $9, questions = $10, "isPublished" = $11, "updatedAt" = NOW()
                WHERE id = $12
            ''', data.get('category_id'), data.get('title'), data.get('description'),
                 data.get('difficulty', 'medium').upper(), data.get('points', 100), data.get('flag', ''),
                 docker_image, None,  # dockerCommand deprecated
                 json.dumps(hints), json.dumps(questions), data.get('is_published', True), challenge_id)
        
        return {
            'id': challenge_id,
            'docker_image': docker_image,
            'build_status': 'success' if docker_image and not docker_image.startswith('pending') else 'pending'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Challenge update failed: {e}")
        if build_dir.exists():
            shutil.rmtree(build_dir)
        raise HTTPException(status_code=500, detail=f"Failed to process upload: {str(e)}")


# ===========================================
# STUDENT: ENROLLMENT & COURSES
# ===========================================


@api_router.get("/student/stats")
async def get_student_stats(current_user: dict = Depends(get_current_user)):
    """Get student dashboard statistics"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get enrollments count
        enrollments = await conn.fetchval('''
            SELECT COUNT(*) FROM ctf_enrollments WHERE "userId" = $1
        ''', current_user['id'])
        
        # Get completed challenges
        completed = await conn.fetchval('''
            SELECT COUNT(*) FROM ctf_progress 
            WHERE "userId" = $1 AND "isCompleted" = true
        ''', current_user['id'])
        
        # Get total points
        total_points = await conn.fetchval('''
            SELECT COALESCE(SUM("pointsEarned"), 0) FROM ctf_progress 
            WHERE "userId" = $1
        ''', current_user['id'])
        
        return {
            'enrollments': enrollments,
            'completed_challenges': completed,
            'total_points': total_points,
            'score': current_user.get('score', 0)
        }


@api_router.get("/student/enrollments")
async def get_student_enrollments(current_user: dict = Depends(get_current_user)):
    """Get student's enrolled courses with progress.
    
    This endpoint automatically syncs LMS enrollments to CTF:
    - Checks if user is a STUDENT in LMS
    - For each LMS course enrollment, if there's a linked CTF course,
      automatically creates a CTF enrollment if not exists
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        user_id = current_user['id']
        
        # ============================================
        # STEP 1: Auto-sync LMS enrollments to CTF
        # ============================================
        # Find LMS enrollments where:
        # 1. User is enrolled in LMS course
        # 2. LMS course has a linked CTF course
        # 3. User is NOT already enrolled in the CTF course
        
        lms_enrollments = await conn.fetch('''
            SELECT 
                e."courseId" as lms_course_id,
                cc.id as ctf_course_id,
                c.title as course_name
            FROM enrollments e
            JOIN courses c ON e."courseId" = c.id
            JOIN ctf_courses cc ON cc."lmsCourseId" = c.id
            WHERE e."userId" = $1
              AND e.status = 'ACTIVE'
              AND NOT EXISTS (
                  SELECT 1 FROM ctf_enrollments ce
                  WHERE ce."userId" = $1 AND ce."ctfCourseId" = cc.id
              )
        ''', user_id)
        
        # Auto-create CTF enrollments for LMS enrollments
        for lms in lms_enrollments:
            enrollment_id = generate_uuid()
            await conn.execute('''
                INSERT INTO ctf_enrollments (id, "userId", "ctfCourseId", "enrolledAt", progress, "totalPoints")
                VALUES ($1, $2, $3, NOW(), 0, 0)
            ''', enrollment_id, user_id, lms['ctf_course_id'])
            logger.info(f"Auto-enrolled user {user_id} in CTF course {lms['course_name']} (synced from LMS)")
        
        # ============================================
        # STEP 2: Get all CTF enrollments (including newly synced)
        # ============================================
        enrollments = await conn.fetch('''
            SELECT ce.id, ce."ctfCourseId", ce.progress, ce."totalPoints",
                   ce."enrolledAt", cc.color,
                   c.title as course_name, c."courseCode" as code, c.description
            FROM ctf_enrollments ce
            JOIN ctf_courses cc ON ce."ctfCourseId" = cc.id
            JOIN courses c ON cc."lmsCourseId" = c.id
            WHERE ce."userId" = $1
            ORDER BY ce."enrolledAt" DESC
        ''', user_id)
        
        result = []
        for e in enrollments:
            # Get module count
            modules = await conn.fetchval('''
                SELECT COUNT(*) FROM ctf_modules 
                WHERE "ctfCourseId" = $1 AND "isPublished" = true
            ''', e['ctfCourseId'])
            
            # Get challenge count
            challenges = await conn.fetchval('''
                SELECT COUNT(*) FROM ctf_challenges ch
                JOIN ctf_modules m ON ch."ctfModuleId" = m.id
                WHERE m."ctfCourseId" = $1 AND ch."isPublished" = true
            ''', e['ctfCourseId'])
            
            result.append({
                'id': e['id'],
                'course_id': e['ctfCourseId'],
                'name': e['course_name'],
                'code': e['code'],
                'description': e['description'],
                'color': e['color'],
                'progress': e['progress'],
                'total_points': e['totalPoints'],
                'enrolled_at': e['enrolledAt'].isoformat() if e['enrolledAt'] else None,
                'modules_count': modules,
                'challenges_count': challenges
            })
        
        return result


@api_router.post("/student/join-course")
async def join_course(data: JoinCourseRequest, current_user: dict = Depends(get_current_user)):
    """Join a course using enrollment code"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Find the enrollment code
        code = await conn.fetchrow('''
            SELECT ec.id, ec."ctfCourseId", ec."isUsed", ec."expiresAt",
                   cc.id as ctf_course_id, c.title as course_name
            FROM ctf_enrollment_codes ec
            JOIN ctf_courses cc ON ec."ctfCourseId" = cc.id
            JOIN courses c ON cc."lmsCourseId" = c.id
            WHERE ec.code = $1
        ''', data.enrollment_code.upper())
        
        if not code:
            raise HTTPException(status_code=404, detail="Invalid enrollment code")
        
        if code['isUsed']:
            raise HTTPException(status_code=400, detail="Code already used")
        
        if code['expiresAt'] and code['expiresAt'] < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Code expired")
        
        # Check if already enrolled
        existing = await conn.fetchrow('''
            SELECT id FROM ctf_enrollments 
            WHERE "userId" = $1 AND "ctfCourseId" = $2
        ''', current_user['id'], code['ctfCourseId'])
        
        if existing:
            raise HTTPException(status_code=400, detail="Already enrolled in this course")
        
        # Create enrollment
        enrollment_id = generate_uuid()
        await conn.execute('''
            INSERT INTO ctf_enrollments (id, "userId", "ctfCourseId", "enrolledAt")
            VALUES ($1, $2, $3, NOW())
        ''', enrollment_id, current_user['id'], code['ctfCourseId'])
        
        # Mark code as used
        await conn.execute('''
            UPDATE ctf_enrollment_codes SET "isUsed" = true, "usedAt" = NOW()
            WHERE id = $1
        ''', code['id'])
        
        return {
            'success': True,
            'message': f"Successfully enrolled in {code['course_name']}",
            'enrollment_id': enrollment_id
        }


@api_router.get("/student/courses/{course_id}")
async def get_student_course(course_id: str, current_user: dict = Depends(get_current_user)):
    """Get course details with modules"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Verify enrollment
        enrollment = await conn.fetchrow('''
            SELECT id FROM ctf_enrollments 
            WHERE "userId" = $1 AND "ctfCourseId" = $2
        ''', current_user['id'], course_id)
        
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")
        
        # Get course
        course = await conn.fetchrow('''
            SELECT cc.id, cc.color, c.title as name, c."courseCode" as code, c.description
            FROM ctf_courses cc
            JOIN courses c ON cc."lmsCourseId" = c.id
            WHERE cc.id = $1
        ''', course_id)
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Get modules with challenge counts
        modules = await conn.fetch('''
            SELECT m.id, m.name, m.description, m."orderIndex", m."hasCapstone",
                   (SELECT COUNT(*) FROM ctf_challenges ch 
                    WHERE ch."ctfModuleId" = m.id AND ch."isPublished" = true) as challenge_count
            FROM ctf_modules m
            WHERE m."ctfCourseId" = $1 AND m."isPublished" = true
            ORDER BY m."orderIndex"
        ''', course_id)
        
        return {
            **dict(course),
            'modules': [dict(m) for m in modules]
        }


@api_router.get("/student/modules/{module_id}")
async def get_student_module(module_id: str, current_user: dict = Depends(get_current_user)):
    """Get module with challenges"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get module
        module = await conn.fetchrow('''
            SELECT m.id, m.name, m.description, m."ctfCourseId", m."orderIndex", m."hasCapstone"
            FROM ctf_modules m
            WHERE m.id = $1 AND m."isPublished" = true
        ''', module_id)
        
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        # Verify enrollment
        enrollment = await conn.fetchrow('''
            SELECT id FROM ctf_enrollments 
            WHERE "userId" = $1 AND "ctfCourseId" = $2
        ''', current_user['id'], module['ctfCourseId'])
        
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")
        
        # Get challenges with user progress
        challenges = await conn.fetch('''
            SELECT ch.id, ch.title, ch."shortDescription", ch."topicNumber", ch."topicName",
                   ch."isCapstone", ch.difficulty, ch.points, ch."orderIndex",
                   ch.hints, ch."solveCount",
                   p."isCompleted" as completed, p."pointsEarned", p."flagsSolved"
            FROM ctf_challenges ch
            LEFT JOIN ctf_progress p ON ch.id = p."challengeId" AND p."userId" = $1
            WHERE ch."ctfModuleId" = $2 AND ch."isPublished" = true
            ORDER BY ch."orderIndex", ch."topicNumber"
        ''', current_user['id'], module_id)
        
        result_challenges = []
        for ch in challenges:
            ch_dict = dict(ch)
            # Parse hints (remove flag text, keep cost only)
            hints = ch_dict.get('hints')
            if hints:
                if isinstance(hints, str):
                    hints = json.loads(hints)
                ch_dict['hints'] = [{'cost': h.get('cost', 0)} for h in hints]
            result_challenges.append(ch_dict)
        
        return {
            **dict(module),
            'challenges': result_challenges
        }


@api_router.get("/student/challenges/{challenge_id}")
async def get_student_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Get challenge details for solving"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get challenge
        challenge = await conn.fetchrow('''
            SELECT ch.id, ch.title, ch."shortDescription", ch.context, 
                   ch."topicNumber", ch."topicName", ch."isCapstone",
                   ch.difficulty, ch.points, ch.flags, ch.hints,
                   ch."dockerImage", ch."dockerCompose", ch."solveCount",
                   m."ctfCourseId"
            FROM ctf_challenges ch
            JOIN ctf_modules m ON ch."ctfModuleId" = m.id
            WHERE ch.id = $1
        ''', challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Verify enrollment
        enrollment = await conn.fetchrow('''
            SELECT id FROM ctf_enrollments 
            WHERE "userId" = $1 AND "ctfCourseId" = $2
        ''', current_user['id'], challenge['ctfCourseId'])
        
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled")
        
        # Get user progress
        progress = await conn.fetchrow('''
            SELECT "flagsSolved", "hintsUsed", "pointsEarned", "isCompleted"
            FROM ctf_progress
            WHERE "userId" = $1 AND "challengeId" = $2
        ''', current_user['id'], challenge_id)
        
        # Parse flags (hide actual flag values, show count and points)
        flags = challenge['flags']
        if isinstance(flags, str):
            flags = json.loads(flags)
        
        flags_info = []
        flags_solved = progress['flagsSolved'] if progress else []
        for i, f in enumerate(flags):
            flags_info.append({
                'index': i,
                'points': f.get('points', 50),
                'description': f.get('description', ''),
                'solved': i in flags_solved
            })
        
        # Parse hints (show text only if unlocked)
        hints = challenge['hints']
        if isinstance(hints, str):
            hints = json.loads(hints)
        
        hints_used = progress['hintsUsed'] if progress else []
        hints_info = []
        for i, h in enumerate(hints):
            hint_data = {'index': i, 'cost': h.get('cost', 0), 'unlocked': i in hints_used}
            if i in hints_used:
                hint_data['text'] = h.get('text', '')
            hints_info.append(hint_data)
        
        return {
            'id': challenge['id'],
            'title': challenge['title'],
            'short_description': challenge['shortDescription'],
            'context': challenge['context'],
            'topic_number': challenge['topicNumber'],
            'topic_name': challenge['topicName'],
            'is_capstone': challenge['isCapstone'],
            'difficulty': challenge['difficulty'],
            'points': challenge['points'],
            'docker_image': challenge['dockerImage'],
            'docker_compose': challenge['dockerCompose'],
            'solve_count': challenge['solveCount'],
            'flags': flags_info,
            'hints': hints_info,
            'progress': {
                'flags_solved': list(flags_solved),
                'hints_used': list(hints_used),
                'points_earned': progress['pointsEarned'] if progress else 0,
                'is_completed': progress['isCompleted'] if progress else False
            } if progress else None
        }


@api_router.post("/student/submit-flag")
async def submit_student_flag(submission: StudentFlagSubmit, current_user: dict = Depends(get_current_user)):
    """Submit a flag for a student challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get challenge with flags
        challenge = await conn.fetchrow('''
            SELECT ch.id, ch.flags, ch."ctfModuleId",
                   m."ctfCourseId"
            FROM ctf_challenges ch
            JOIN ctf_modules m ON ch."ctfModuleId" = m.id
            WHERE ch.id = $1
        ''', submission.challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Get enrollment
        enrollment = await conn.fetchrow('''
            SELECT id FROM ctf_enrollments 
            WHERE "userId" = $1 AND "ctfCourseId" = $2
        ''', current_user['id'], challenge['ctfCourseId'])
        
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled")
        
        # Parse flags
        flags = challenge['flags']
        if isinstance(flags, str):
            flags = json.loads(flags)
        
        if submission.flag_index >= len(flags):
            raise HTTPException(status_code=400, detail="Invalid flag index")
        
        target_flag = flags[submission.flag_index]
        
        # Get current progress
        progress = await conn.fetchrow('''
            SELECT id, "flagsSolved", "hintsUsed", "pointsEarned"
            FROM ctf_progress
            WHERE "userId" = $1 AND "challengeId" = $2
        ''', current_user['id'], submission.challenge_id)
        
        flags_solved = list(progress['flagsSolved']) if progress else []
        
        # Check if already solved
        if submission.flag_index in flags_solved:
            return {'correct': True, 'message': 'Already solved', 'points': 0}
        
        # Check flag
        if submission.flag.strip() != target_flag.get('flag', '').strip():
            return {'correct': False, 'message': 'Incorrect flag', 'points': 0}
        
        # Correct! Update progress
        flag_points = target_flag.get('points', 50)
        flags_solved.append(submission.flag_index)
        
        hints_used = list(progress['hintsUsed']) if progress else []
        total_points = (progress['pointsEarned'] if progress else 0) + flag_points
        is_complete = len(flags_solved) >= len(flags)
        
        if progress:
            await conn.execute('''
                UPDATE ctf_progress SET
                    "flagsSolved" = $1, "pointsEarned" = $2, "isCompleted" = $3,
                    "completedAt" = CASE WHEN $3 THEN NOW() ELSE "completedAt" END,
                    "updatedAt" = NOW()
                WHERE id = $4
            ''', flags_solved, total_points, is_complete, progress['id'])
        else:
            await conn.execute('''
                INSERT INTO ctf_progress (
                    id, "userId", "challengeId", "enrollmentId",
                    "flagsSolved", "hintsUsed", "pointsEarned", "isCompleted",
                    "startedAt", "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            ''', generate_uuid(), current_user['id'], submission.challenge_id,
                 enrollment['id'], flags_solved, hints_used, total_points, is_complete)
        
        # Update user score
        await conn.execute('''
            UPDATE users SET "ctfScore" = "ctfScore" + $1, "updatedAt" = NOW()
            WHERE id = $2
        ''', flag_points, current_user['id'])
        
        # Update solve count if first flag
        if len(flags_solved) == 1:
            await conn.execute('''
                UPDATE ctf_challenges SET "solveCount" = "solveCount" + 1
                WHERE id = $1
            ''', submission.challenge_id)
        
        return {
            'correct': True,
            'message': 'Correct flag!',
            'points': flag_points,
            'challenge_complete': is_complete
        }


@api_router.post("/student/unlock-hint")
async def unlock_student_hint(challenge_id: str, hint_index: int, current_user: dict = Depends(get_current_user)):
    """Unlock a hint for a challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get challenge
        challenge = await conn.fetchrow('''
            SELECT ch.id, ch.hints, m."ctfCourseId"
            FROM ctf_challenges ch
            JOIN ctf_modules m ON ch."ctfModuleId" = m.id
            WHERE ch.id = $1
        ''', challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        hints = challenge['hints']
        if isinstance(hints, str):
            hints = json.loads(hints)
        
        if hint_index >= len(hints):
            raise HTTPException(status_code=400, detail="Invalid hint index")
        
        hint = hints[hint_index]
        
        # Get enrollment
        enrollment = await conn.fetchrow('''
            SELECT id FROM ctf_enrollments 
            WHERE "userId" = $1 AND "ctfCourseId" = $2
        ''', current_user['id'], challenge['ctfCourseId'])
        
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled")
        
        # Get or create progress
        progress = await conn.fetchrow('''
            SELECT id, "hintsUsed", "flagsSolved", "pointsEarned"
            FROM ctf_progress
            WHERE "userId" = $1 AND "challengeId" = $2
        ''', current_user['id'], challenge_id)
        
        hints_used = list(progress['hintsUsed']) if progress else []
        
        if hint_index in hints_used:
            return {'hint': hint, 'already_unlocked': True, 'cost': 0}
        
        hints_used.append(hint_index)
        
        if progress:
            await conn.execute('''
                UPDATE ctf_progress SET "hintsUsed" = $1, "updatedAt" = NOW()
                WHERE id = $2
            ''', hints_used, progress['id'])
        else:
            await conn.execute('''
                INSERT INTO ctf_progress (
                    id, "userId", "challengeId", "enrollmentId",
                    "flagsSolved", "hintsUsed", "pointsEarned",
                    "startedAt", "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), NOW())
            ''', generate_uuid(), current_user['id'], challenge_id,
                 enrollment['id'], [], hints_used)
        
        # Hints are now free - no point deduction
        return {'hint': hint, 'already_unlocked': False, 'cost': 0}


# ===========================================
# ADMIN: DASHBOARD
# ===========================================

@api_router.get("/admin/dashboard")
async def admin_dashboard(admin: dict = Depends(require_admin)):
    """Get admin dashboard statistics"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        stats = {}
        
        stats['total_users'] = await conn.fetchval('SELECT COUNT(*) FROM users')
        stats['total_courses'] = await conn.fetchval('SELECT COUNT(*) FROM ctf_courses')
        stats['total_modules'] = await conn.fetchval('SELECT COUNT(*) FROM ctf_modules')
        stats['total_challenges'] = await conn.fetchval('SELECT COUNT(*) FROM ctf_challenges')
        stats['total_enrollments'] = await conn.fetchval('SELECT COUNT(*) FROM ctf_enrollments')
        stats['completed_challenges'] = await conn.fetchval(
            'SELECT COUNT(*) FROM ctf_progress WHERE "isCompleted" = true'
        )
        
        # Recent enrollments
        recent_enrollments = await conn.fetch('''
            SELECT e."enrolledAt", u.name, u.email, c.title as course
            FROM ctf_enrollments e
            JOIN users u ON e."userId" = u.id
            JOIN ctf_courses cc ON e."ctfCourseId" = cc.id
            JOIN courses c ON cc."lmsCourseId" = c.id
            ORDER BY e."enrolledAt" DESC
            LIMIT 5
        ''')
        stats['recent_enrollments'] = [dict(r) for r in recent_enrollments]
        
        return stats


# ===========================================
# ADMIN: COURSE MANAGEMENT
# ===========================================

@api_router.get("/admin/courses")
async def admin_get_courses(admin: dict = Depends(require_admin)):
    """Get all CTF courses"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        courses = await conn.fetch('''
            SELECT cc.id, cc."lmsCourseId", cc."isActive", cc.color, cc."createdAt",
                   c.title as name, c."courseCode" as code, c.description
            FROM ctf_courses cc
            JOIN courses c ON cc."lmsCourseId" = c.id
            ORDER BY c.title
        ''')
        return [dict(c) for c in courses]


@api_router.post("/admin/courses")
async def admin_create_course(data: CourseCreate, admin: dict = Depends(require_admin)):
    """Create a new CTF course, optionally linking to existing LMS course"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # If lms_course_id is provided, link to existing LMS course
        if data.lms_course_id:
            # Verify LMS course exists and isn't already linked
            lms_course = await conn.fetchrow(
                'SELECT id, title FROM courses WHERE id = $1', data.lms_course_id
            )
            if not lms_course:
                raise HTTPException(status_code=404, detail="LMS course not found")
            
            # Check if already linked
            existing = await conn.fetchrow(
                'SELECT id FROM ctf_courses WHERE "lmsCourseId" = $1', data.lms_course_id
            )
            if existing:
                raise HTTPException(status_code=400, detail="This LMS course already has a linked CTF course")
            
            lms_course_id = data.lms_course_id
        else:
            # Create new LMS course
            lms_course_id = generate_uuid()
            instructor_id = admin['id']
            
            await conn.execute('''
                INSERT INTO courses (
                    id, title, slug, "courseCode", description,
                    "instructorId", level, status, "isPublic",
                    "createdAt", "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, 'INTERMEDIATE', 'PUBLISHED', true, NOW(), NOW())
            ''', lms_course_id, data.name, data.code.lower(), data.code, data.description, instructor_id)
        
        # Create CTF course linked to LMS course
        ctf_course_id = generate_uuid()
        await conn.execute('''
            INSERT INTO ctf_courses (id, "lmsCourseId", "isActive", color, "createdAt", "updatedAt")
            VALUES ($1, $2, true, $3, NOW(), NOW())
        ''', ctf_course_id, lms_course_id, data.color)
        
        return {'id': ctf_course_id, 'lms_course_id': lms_course_id}


@api_router.put("/admin/courses/{course_id}")
async def admin_update_course(course_id: str, data: CourseUpdate, admin: dict = Depends(require_admin)):
    """Update a CTF course"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get LMS course ID
        ctf_course = await conn.fetchrow(
            'SELECT "lmsCourseId" FROM ctf_courses WHERE id = $1', course_id
        )
        if not ctf_course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Update LMS course
        if data.name:
            await conn.execute(
                'UPDATE courses SET title = $1, "updatedAt" = NOW() WHERE id = $2',
                data.name, ctf_course['lmsCourseId']
            )
        if data.code:
            await conn.execute(
                'UPDATE courses SET "courseCode" = $1, slug = $2, "updatedAt" = NOW() WHERE id = $3',
                data.code, data.code.lower(), ctf_course['lmsCourseId']
            )
        if data.description:
            await conn.execute(
                'UPDATE courses SET description = $1, "updatedAt" = NOW() WHERE id = $2',
                data.description, ctf_course['lmsCourseId']
            )
        
        # Update CTF course color
        if data.color:
            await conn.execute(
                'UPDATE ctf_courses SET color = $1, "updatedAt" = NOW() WHERE id = $2',
                data.color, course_id
            )
        
        return {'success': True}


@api_router.delete("/admin/courses/{course_id}")
async def admin_delete_course(course_id: str, admin: dict = Depends(require_admin)):
    """Delete a CTF course"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get LMS course ID
        ctf_course = await conn.fetchrow(
            'SELECT "lmsCourseId" FROM ctf_courses WHERE id = $1', course_id
        )
        if not ctf_course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Delete CTF course (cascades to modules, challenges, etc.)
        await conn.execute('DELETE FROM ctf_courses WHERE id = $1', course_id)
        
        # Optionally delete LMS course too
        await conn.execute('DELETE FROM courses WHERE id = $1', ctf_course['lmsCourseId'])
        
        return {'success': True}


# ===========================================
# ADMIN: MODULE MANAGEMENT
# ===========================================

@api_router.get("/admin/modules")
async def admin_get_modules(course_id: Optional[str] = None, admin: dict = Depends(require_admin)):
    """Get all modules"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        if course_id:
            modules = await conn.fetch('''
                SELECT id, "ctfCourseId", name, description, "orderIndex", "hasCapstone", "isPublished"
                FROM ctf_modules WHERE "ctfCourseId" = $1
                ORDER BY "orderIndex"
            ''', course_id)
        else:
            modules = await conn.fetch('''
                SELECT id, "ctfCourseId", name, description, "orderIndex", "hasCapstone", "isPublished"
                FROM ctf_modules ORDER BY "ctfCourseId", "orderIndex"
            ''')
        return [dict(m) for m in modules]


@api_router.post("/admin/modules")
async def admin_create_module(data: ModuleCreate, admin: dict = Depends(require_admin)):
    """Create a new module"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        module_id = generate_uuid()
        await conn.execute('''
            INSERT INTO ctf_modules (
                id, "ctfCourseId", name, description, "orderIndex", 
                "hasCapstone", "isPublished", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        ''', module_id, data.course_id, data.name, data.description, data.order, data.has_capstone)
        return {'id': module_id}


@api_router.delete("/admin/modules/{module_id}")
async def admin_delete_module(module_id: str, admin: dict = Depends(require_admin)):
    """Delete a module"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM ctf_modules WHERE id = $1', module_id)
        return {'success': True}


# ===========================================
# ADMIN: CHALLENGE MANAGEMENT
# ===========================================

@api_router.get("/admin/challenges")
async def admin_get_challenges(module_id: Optional[str] = None, admin: dict = Depends(require_admin)):
    """Get all challenges (with flags for admin)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        if module_id:
            challenges = await conn.fetch('''
                SELECT * FROM ctf_challenges WHERE "ctfModuleId" = $1
                ORDER BY "orderIndex", "topicNumber"
            ''', module_id)
        else:
            challenges = await conn.fetch('''
                SELECT * FROM ctf_challenges ORDER BY "ctfModuleId", "orderIndex"
            ''')
        return [dict(c) for c in challenges]


@api_router.post("/admin/challenges")
async def admin_create_challenge(data: StudentChallengeCreate, admin: dict = Depends(require_admin)):
    """Create a new challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        challenge_id = generate_uuid()
        
        # Prepare flags and hints as JSON
        flags = [{'flag': f.flag, 'points': f.points, 'description': f.description} for f in data.flags]
        
        await conn.execute('''
            INSERT INTO ctf_challenges (
                id, "ctfModuleId", title, "shortDescription", context,
                "topicNumber", "topicName", "isCapstone", difficulty,
                "dockerImage", "dockerCompose", flags, hints, points,
                "orderIndex", "isPublished", "solveCount", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'MEDIUM', $9, $10, $11, $12, $13, $14, true, 0, NOW(), NOW())
        ''', challenge_id, data.module_id, data.title, data.short_description, data.context,
             data.topic_number, data.topic_name, data.is_capstone,
             data.docker_image, data.docker_compose,
             json.dumps(flags), json.dumps(data.hints), data.points, data.order)
        
        return {'id': challenge_id}


@api_router.put("/admin/challenges/{challenge_id}")
async def admin_update_challenge(challenge_id: str, data: dict, admin: dict = Depends(require_admin)):
    """Update a challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Build update query dynamically
        updates = []
        values = []
        
        field_mapping = {
            'title': 'title',
            'short_description': '"shortDescription"',
            'context': 'context',
            'topic_number': '"topicNumber"',
            'topic_name': '"topicName"',
            'is_capstone': '"isCapstone"',
            'docker_image': '"dockerImage"',
            'docker_compose': '"dockerCompose"',
            'points': 'points',
            'order': '"orderIndex"',
        }
        
        idx = 1
        for key, column in field_mapping.items():
            if key in data:
                updates.append(f'{column} = ${idx}')
                values.append(data[key])
                idx += 1
        
        if 'flags' in data:
            updates.append(f'flags = ${idx}')
            values.append(json.dumps(data['flags']))
            idx += 1
        
        if 'hints' in data:
            updates.append(f'hints = ${idx}')
            values.append(json.dumps(data['hints']))
            idx += 1
        
        if updates:
            updates.append('"updatedAt" = NOW()')
            values.append(challenge_id)
            
            await conn.execute(
                f'UPDATE ctf_challenges SET {", ".join(updates)} WHERE id = ${idx}',
                *values
            )
        
        return {'success': True}


@api_router.delete("/admin/challenges/{challenge_id}")
async def admin_delete_challenge(challenge_id: str, admin: dict = Depends(require_admin)):
    """Delete a challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM ctf_challenges WHERE id = $1', challenge_id)
        return {'success': True}


# ===========================================
# ADMIN: ENROLLMENT MANAGEMENT
# ===========================================

@api_router.get("/admin/enrollments")
async def admin_get_enrollments(course_id: Optional[str] = None, admin: dict = Depends(require_admin)):
    """Get all enrollments"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        if course_id:
            enrollments = await conn.fetch('''
                SELECT e.id, e."enrolledAt", e.progress, e."totalPoints",
                       u.id as user_id, u.name, u.email,
                       c.title as course_name, c."courseCode" as course_code
                FROM ctf_enrollments e
                JOIN users u ON e."userId" = u.id
                JOIN ctf_courses cc ON e."ctfCourseId" = cc.id
                JOIN courses c ON cc."lmsCourseId" = c.id
                WHERE e."ctfCourseId" = $1
                ORDER BY e."enrolledAt" DESC
            ''', course_id)
        else:
            enrollments = await conn.fetch('''
                SELECT e.id, e."enrolledAt", e.progress, e."totalPoints",
                       u.id as user_id, u.name, u.email,
                       c.title as course_name, c."courseCode" as course_code
                FROM ctf_enrollments e
                JOIN users u ON e."userId" = u.id
                JOIN ctf_courses cc ON e."ctfCourseId" = cc.id
                JOIN courses c ON cc."lmsCourseId" = c.id
                ORDER BY e."enrolledAt" DESC
            ''')
        return [dict(e) for e in enrollments]


@api_router.post("/admin/enrollment-codes")
async def admin_create_enrollment_code(data: EnrollmentCodeCreate, admin: dict = Depends(require_admin)):
    """Create an enrollment code"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        code_id = generate_uuid()
        code = generate_code(8)
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_days)
        
        await conn.execute('''
            INSERT INTO ctf_enrollment_codes (
                id, "ctfCourseId", code, "expiresAt", "createdBy", 
                "isUsed", "createdAt"
            ) VALUES ($1, $2, $3, $4, $5, false, NOW())
        ''', code_id, data.course_id, code, expires_at, admin['id'])
        
        return {'id': code_id, 'code': code, 'expires_at': expires_at.isoformat()}


@api_router.get("/admin/enrollment-codes")
async def admin_get_enrollment_codes(admin: dict = Depends(require_admin)):
    """Get all enrollment codes"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        codes = await conn.fetch('''
            SELECT ec.id, ec.code, ec."isUsed", ec."expiresAt", ec."createdAt",
                   c.title as course_name, c."courseCode" as course_code
            FROM ctf_enrollment_codes ec
            JOIN ctf_courses cc ON ec."ctfCourseId" = cc.id
            JOIN courses c ON cc."lmsCourseId" = c.id
            ORDER BY ec."createdAt" DESC
        ''')
        return [dict(c) for c in codes]


@api_router.delete("/admin/enrollment-codes/{code_id}")
async def admin_delete_enrollment_code(code_id: str, admin: dict = Depends(require_admin)):
    """Delete an enrollment code"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM ctf_enrollment_codes WHERE id = $1', code_id)
        return {'success': True}


@api_router.post("/admin/enroll-user")
async def admin_enroll_user(data: EnrollUserRequest, admin: dict = Depends(require_admin)):
    """Directly enroll a user in a course"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Check if already enrolled
        existing = await conn.fetchrow('''
            SELECT id FROM ctf_enrollments 
            WHERE "userId" = $1 AND "ctfCourseId" = $2
        ''', data.user_id, data.course_id)
        
        if existing:
            raise HTTPException(status_code=400, detail="User already enrolled")
        
        enrollment_id = generate_uuid()
        await conn.execute('''
            INSERT INTO ctf_enrollments (id, "userId", "ctfCourseId", "enrolledAt")
            VALUES ($1, $2, $3, NOW())
        ''', enrollment_id, data.user_id, data.course_id)
        
        return {'success': True, 'enrollment_id': enrollment_id}


@api_router.post("/admin/unenroll-user")
async def admin_unenroll_user(data: UnenrollUserRequest, admin: dict = Depends(require_admin)):
    """Unenroll a user from a course"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('''
            DELETE FROM ctf_enrollments 
            WHERE "userId" = $1 AND "ctfCourseId" = $2
        ''', data.user_id, data.course_id)
        return {'success': True}


@api_router.get("/admin/users")
async def admin_get_users(admin: dict = Depends(require_admin)):
    """Get all users"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        users = await conn.fetch('''
            SELECT u.id, u.name, u.email, u."ctfScore" as score,
                   u."isActive", u."isLocked", r.type as role
            FROM users u
            JOIN "Role" r ON u."roleId" = r.id
            ORDER BY u.name
        ''')
        return [dict(u) for u in users]


# ===========================================
# NOTIFICATION SYSTEM
# ===========================================

@api_router.post("/admin/notifications")
async def admin_send_notification(data: NotificationCreate, admin: dict = Depends(require_admin)):
    """Send notification to users"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        notification_id = generate_uuid()
        
        if data.target_type == 'all':
            # Get all user IDs
            users = await conn.fetch('SELECT id FROM users WHERE "isActive" = true')
            target_ids = [u['id'] for u in users]
        else:
            target_ids = data.target_user_ids or []
        
        # Create notification record
        await conn.execute('''
            INSERT INTO ctf_notifications (
                id, title, message, type, "senderId", "targetType", "createdAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ''', notification_id, data.title, data.message, data.type, admin['id'], data.target_type)
        
        # Create user notifications
        for user_id in target_ids:
            await conn.execute('''
                INSERT INTO ctf_user_notifications (
                    id, "userId", "notificationId", read, "createdAt"
                ) VALUES ($1, $2, $3, false, NOW())
            ''', generate_uuid(), user_id, notification_id)
        
        return {'success': True, 'notification_id': notification_id, 'sent_to': len(target_ids)}


@api_router.get("/admin/notifications")
async def admin_get_notifications(admin: dict = Depends(require_admin)):
    """Get all sent notifications"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        notifications = await conn.fetch('''
            SELECT n.id, n.title, n.message, n.type, n."targetType", n."createdAt",
                   u.name as sender_name,
                   (SELECT COUNT(*) FROM ctf_user_notifications WHERE "notificationId" = n.id) as recipients_count
            FROM ctf_notifications n
            JOIN users u ON n."senderId" = u.id
            ORDER BY n."createdAt" DESC
        ''')
        return [dict(n) for n in notifications]


@api_router.get("/notifications")
async def get_my_notifications(current_user: dict = Depends(get_current_user)):
    """Get current user's notifications"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        notifications = await conn.fetch('''
            SELECT un.id, un.read, un."createdAt",
                   n.title, n.message, n.type,
                   u.name as sender_name
            FROM ctf_user_notifications un
            JOIN ctf_notifications n ON un."notificationId" = n.id
            JOIN users u ON n."senderId" = u.id
            WHERE un."userId" = $1
            ORDER BY un."createdAt" DESC
            LIMIT 50
        ''', current_user['id'])
        
        result = []
        unread_count = 0
        for n in notifications:
            if not n['read']:
                unread_count += 1
            result.append({
                'id': n['id'],
                'title': n['title'],
                'message': n['message'],
                'type': n['type'],
                'sender_name': n['sender_name'],
                'read': n['read'],
                'created_at': n['createdAt'].isoformat() if n['createdAt'] else None,
                'time_ago': time_ago(n['createdAt'])
            })
        
        # Return format expected by frontend
        return {
            'notifications': result,
            'unread_count': unread_count
        }


@api_router.post("/notifications/mark-all-read")
@api_router.post("/notifications/read-all")  # Alias for frontend compatibility
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('''
            UPDATE ctf_user_notifications SET read = true
            WHERE "userId" = $1 AND read = false
        ''', current_user['id'])
        return {'success': True}


@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('''
            UPDATE ctf_user_notifications SET read = true
            WHERE id = $1 AND "userId" = $2
        ''', notification_id, current_user['id'])
        return {'success': True}


# ===========================================
# NEXUS ENGINE INTEGRATION
# (Container orchestration for CTF challenges)
# ===========================================

NEXUS_ENGINE_URL = os.environ.get('NEXUS_ENGINE_URL', 'http://172.235.15.209:8081')

# Nexus session storage (user_id -> session_id mapping)
nexus_sessions: Dict[str, Dict[str, str]] = {}  # {user_id: {challenge_id: session_id}}

# Rate limiting: track last start request per user
nexus_start_cooldowns: Dict[str, datetime] = {}  # {user_id: last_start_timestamp}
NEXUS_START_COOLDOWN_SECONDS = 45  # Minimum seconds between start requests


class NexusSessionRequest(BaseModel):
    challenge_id: str


@api_router.post("/docker/start/{challenge_id}")
async def start_docker_instance(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Start a K8s container for the challenge via Nexus Engine"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        challenge = await conn.fetchrow('''
            SELECT id, title, "dockerImage" as docker_image
            FROM ctf_public_challenges WHERE id = $1
        ''', challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        if not challenge['docker_image']:
            raise HTTPException(status_code=400, detail="This challenge does not have a container")
        
        user_id = current_user['id']
        
        # Rate limiting: check cooldown
        last_start = nexus_start_cooldowns.get(user_id)
        if last_start:
            elapsed = (datetime.now(timezone.utc) - last_start).total_seconds()
            if elapsed < NEXUS_START_COOLDOWN_SECONDS:
                remaining = int(NEXUS_START_COOLDOWN_SECONDS - elapsed)
                raise HTTPException(
                    status_code=429, 
                    detail=f"Please wait {remaining} seconds before starting another instance"
                )
        
        # Check for existing session
        if user_id in nexus_sessions and challenge_id in nexus_sessions[user_id]:
            existing_session_id = nexus_sessions[user_id][challenge_id]
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        f"{NEXUS_ENGINE_URL}/api/v1/sessions/{existing_session_id}",
                        timeout=10.0
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get('status') == 'running':
                            return {
                                "session_id": data['session_id'],
                                "target_ip": data['target_ip'],
                                "expires_at": data['expires_at'],
                                "status": "running",
                                "message": "Existing instance found"
                            }
            except:
                pass
        
        # Spawn new session via Nexus
        try:
            async with httpx.AsyncClient() as client:
                # Create challenge in Nexus if needed
                nexus_challenge = {
                    "name": challenge['title'],
                    "category": "CTF",
                    "difficulty": "Medium",
                    "description": f"Challenge: {challenge['title']}",
                    "max_score": 100,
                    "flag": "PLACEHOLDER",
                    "ttl_minutes": 60,
                    "ports": [22, 80, 443, 3000, 8000, 8080],
                    "image_url": challenge['docker_image']
                }
                
                check_resp = await client.get(
                    f"{NEXUS_ENGINE_URL}/api/v1/challenges/{challenge_id}",
                    timeout=10.0
                )
                
                if check_resp.status_code != 200:
                    create_resp = await client.post(
                        f"{NEXUS_ENGINE_URL}/api/v1/challenges",
                        json=nexus_challenge,
                        timeout=10.0
                    )
                    nexus_chal_id = create_resp.json().get('id', challenge_id)
                else:
                    nexus_chal_id = challenge_id
                
                spawn_resp = await client.post(
                    f"{NEXUS_ENGINE_URL}/api/v1/sessions",
                    json={"challenge_id": nexus_chal_id},
                    headers={"X-User-ID": user_id},
                    timeout=180.0
                )
                
                if spawn_resp.status_code != 201:
                    error_detail = spawn_resp.json().get('error', 'Unknown error')
                    raise HTTPException(status_code=503, detail=f"Nexus error: {error_detail}")
                
                session_data = spawn_resp.json()
                
                # Record the cooldown timestamp
                nexus_start_cooldowns[user_id] = datetime.now(timezone.utc)
                
                if str(user_id) not in nexus_sessions:
                    nexus_sessions[str(user_id)] = {}
                nexus_sessions[str(user_id)][str(challenge_id)] = session_data['session_id']
                
                # Track usage for billing (insert into nexus_usage table)
                try:
                    pool = await Database.get_pool()
                    async with pool.acquire() as conn:
                        # Ensure table exists
                        await conn.execute('''
                            CREATE TABLE IF NOT EXISTS nexus_usage (
                                id UUID PRIMARY KEY,
                                user_id TEXT NOT NULL,
                                challenge_id TEXT NOT NULL,
                                session_id TEXT NOT NULL,
                                started_at TIMESTAMP DEFAULT NOW(),
                                ended_at TIMESTAMP,
                                status TEXT DEFAULT 'running',
                                pod_seconds INTEGER,
                                estimated_cost DECIMAL(10, 4)
                            )
                        ''')
                        await conn.execute('''
                            INSERT INTO nexus_usage (
                                id, user_id, challenge_id, session_id, started_at, status
                            ) VALUES ($1, $2, $3, $4, NOW(), 'running')
                        ''', generate_uuid(), str(user_id), str(challenge_id), session_data['session_id'])
                except Exception as e:
                    logger.warning(f"Failed to record usage: {e}")  # Don't fail the request
                
                return {
                    "session_id": session_data['session_id'],
                    "target_ip": session_data['target_ip'],
                    "expires_at": session_data['expires_at'],
                    "status": "running",
                    "message": "Container started successfully"
                }
                
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Nexus timeout - container may still be starting")
        except httpx.RequestError as e:
            logger.error(f"Nexus connection error: {e}")
            raise HTTPException(status_code=503, detail="Nexus Engine unavailable")


@api_router.delete("/docker/stop/{session_id}")
async def stop_docker_instance(session_id: str, current_user: dict = Depends(get_current_user)):
    """Stop a running container via Nexus Engine"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}",
                timeout=30.0
            )
            if resp.status_code in [200, 404]:  # Treat 404 as already stopped
                uid = str(current_user['id'])
                if uid in nexus_sessions:
                    for cid, sess_id in list(nexus_sessions[uid].items()):
                        if sess_id == session_id:
                            del nexus_sessions[uid][cid]
                            break
                
                # Update usage record with end time and calculate cost
                try:
                    pool = await Database.get_pool()
                    async with pool.acquire() as conn:
                        # Calculate cost: ~$0.035/hour per instance
                        # Status 'stopped' = user manually stopped
                        await conn.execute('''
                            UPDATE nexus_usage SET 
                                ended_at = NOW(),
                                status = 'stopped',
                                pod_seconds = GREATEST(60, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER),
                                estimated_cost = GREATEST(0.0001, (EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600.0) * 0.035)
                            WHERE session_id = $1 AND status = 'running'
                        ''', session_id)
                except Exception as e:
                    logger.warning(f"Failed to update usage: {e}")
                
                return {"message": "Container stopped", "session_id": session_id}
            else:
                raise HTTPException(status_code=resp.status_code, detail="Failed to stop container")
    except httpx.RequestError as e:
        logger.error(f"Nexus connection error: {e}")
        raise HTTPException(status_code=503, detail="Nexus Engine unavailable")


@api_router.post("/docker/extend/{session_id}")
async def extend_docker_instance(session_id: str, current_user: dict = Depends(get_current_user)):
    """Extend container TTL by 30 minutes"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}/extend",
                json={"extra_minutes": 30},
                timeout=10.0
            )
            if resp.status_code == 200:
                result = resp.json()
                
                # Track extension in database for billing
                try:
                    pool = await Database.get_pool()
                    async with pool.acquire() as conn:
                        # Record extension event and add estimated cost for 30 min
                        # Cost: $0.035/hour = $0.0175 for 30 min
                        await conn.execute('''
                            UPDATE nexus_usage SET 
                                estimated_cost = COALESCE(estimated_cost, 0) + 0.0175,
                                pod_seconds = COALESCE(pod_seconds, 0) + 1800
                            WHERE session_id = $1
                        ''', session_id)
                except Exception as e:
                    logger.warning(f"Failed to record extension: {e}")
                
                return {
                    "session_id": id,
                    "expires_at": result.get('new_expires_at') or result.get('expires_at'),
                    "status": "running",
                    "extended_by": 30
                }
            else:
                raise HTTPException(status_code=resp.status_code, detail="Failed to extend session")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail="Nexus Engine unavailable")


@api_router.get("/docker/status/{session_id}")
async def get_docker_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """Get container status and connection info"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}",
                timeout=10.0
            )
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 404:
                raise HTTPException(status_code=404, detail="Session not found or expired")
            else:
                raise HTTPException(status_code=resp.status_code, detail="Failed to get status")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail="Nexus Engine unavailable")


@api_router.get("/docker/challenge-session/{challenge_id}")
async def get_challenge_session(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Get user's existing session for a challenge (if any)"""
    user_id = str(current_user['id'])
    logger.info(f"Checking session for user {user_id}, challenge {challenge_id}")
    
    # Check in-memory cache first
    if user_id in nexus_sessions and challenge_id in nexus_sessions[user_id]:
        session_id = nexus_sessions[user_id][challenge_id]
        logger.info(f"Found session {session_id} in cache for user {user_id}")
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}",
                    timeout=10.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get('status') == 'running':
                        return {
                            "session_id": session_id,
                            "target_ip": data.get('target_ip'),
                            "expires_at": data.get('expires_at'),
                            "status": "running"
                        }
        except Exception as e:
            logger.warning(f"Error checking cache session {session_id}: {e}")
        
        # Session no longer valid, remove from cache
        del nexus_sessions[user_id][challenge_id]
    
    # Check database for running session
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow('''
                SELECT session_id, started_at FROM nexus_usage
                WHERE user_id = $1 AND challenge_id = $2 AND status = 'running'
                AND started_at > NOW() - INTERVAL '4 hours'
                ORDER BY started_at DESC LIMIT 1
            ''', user_id, challenge_id)
            
            if row:
                session_id = row['session_id']
                logger.info(f"Found running session {session_id} in DB for user {user_id}")
                # Verify with Nexus
                try:
                    async with httpx.AsyncClient() as client:
                        resp = await client.get(
                            f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}",
                            timeout=10.0
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            # Cache it
                            if user_id not in nexus_sessions:
                                nexus_sessions[user_id] = {}
                            nexus_sessions[user_id][challenge_id] = session_id
                            return {
                                "session_id": session_id,
                                "target_ip": data.get('target_ip'),
                                "expires_at": data.get('expires_at'),
                                "status": "running"
                            }
                        elif resp.status_code == 404:
                            logger.info(f"Session {session_id} found in DB but not in Nexus (404)")
                            # Mark as expired in DB
                            await conn.execute("UPDATE nexus_usage SET status = 'expired', ended_at = NOW() WHERE session_id = $1", session_id)
                        else:
                            logger.warning(f"Session {session_id}: Nexus returned status {resp.status_code}")
                except httpx.TimeoutException:
                    logger.warning(f"Timeout verifying session {session_id} - returning DB data anyway")
                    # Trust database if Nexus is slow
                    return {
                        "session_id": session_id,
                        "target_ip": None,  # IP unknown
                        "expires_at": None,
                        "status": "running"
                    }
                except Exception as e:
                    logger.warning(f"Error verifying DB session {session_id} with Nexus: {e}")
    except Exception as e:
        logger.warning(f"Error checking persistence from DB: {e}")
    
    # No active session found
    logger.info(f"No active session found for user {user_id}, challenge {challenge_id}")
    return {"status": "none"}


# Nexus Admin Endpoints
@api_router.get("/admin/nexus/sessions")
async def admin_nexus_sessions(current_user: dict = Depends(require_admin)):
    """Get all active Nexus sessions (admin only) - from Nexus Engine + database"""
    sessions = []
    
    # 1. Try to get from Nexus Engine API
    try:
        async with httpx.AsyncClient() as client:
            # Try the main sessions endpoint
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/sessions", timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                if 'sessions' in data:
                    sessions.extend(data['sessions'])
    except Exception as e:
        logger.warning(f"Failed to fetch sessions from Nexus: {e}")
    
    # 2. Also get from database (nexus_usage running sessions) and enrich with Nexus data
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT session_id, user_id, challenge_id, started_at, status
                FROM nexus_usage
                WHERE status = 'running'
                ORDER BY started_at DESC
                LIMIT 50
            ''')
            for row in rows:
                session_id = row['session_id']
                # Check if already in sessions list from Nexus
                existing = next((s for s in sessions if s.get('session_id') == session_id), None)
                if existing:
                    continue
                
                # Try to get details from Nexus
                session_data = {
                    'session_id': session_id,
                    'user_id': row['user_id'],
                    'challenge_id': row['challenge_id'],
                    'started_at': row['started_at'].isoformat() if row['started_at'] else None,
                    'status': row['status'],
                    'source': 'database'
                }
                
                # Fetch target_ip from Nexus
                try:
                    async with httpx.AsyncClient() as client:
                        resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}", timeout=5.0)
                        if resp.status_code == 200:
                            nexus_data = resp.json()
                            session_data['target_ip'] = nexus_data.get('target_ip')
                            session_data['expires_at'] = nexus_data.get('expires_at')
                except:
                    pass
                
                sessions.append(session_data)
    except Exception as e:
        logger.warning(f"Failed to fetch sessions from DB: {e}")
    
    return {"sessions": sessions}


@api_router.get("/admin/nexus/stats")
async def admin_nexus_stats(current_user: dict = Depends(require_admin)):
    """Get Nexus Engine stats (admin only) - combines Nexus Engine + database"""
    stats = {
        "active_sessions": 0,
        "total_pods": 0,
        "total_sessions_today": 0,
        "estimated_cost_today": 0.0,
        "nexus_engine_healthy": False
    }
    
    # 1. Check Nexus Engine health
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/health", timeout=5.0)
            if resp.status_code == 200:
                stats["nexus_engine_healthy"] = True
            
            # Get sessions count
            sess_resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/sessions", timeout=10.0)
            if sess_resp.status_code == 200:
                data = sess_resp.json()
                stats["active_sessions"] = len(data.get('sessions', []))
    except Exception as e:
        logger.warning(f"Failed to check Nexus health: {e}")
    
    # 2. Get stats from database
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            # Count running sessions
            running = await conn.fetchval('''
                SELECT COUNT(*) FROM nexus_usage WHERE status = 'running'
            ''')
            if running:
                stats["active_sessions"] = max(stats["active_sessions"], running)
            
            # Today's stats
            today_stats = await conn.fetchrow('''
                SELECT 
                    COUNT(*) as sessions,
                    COALESCE(SUM(estimated_cost), 0) as cost
                FROM nexus_usage
                WHERE DATE(started_at) = CURRENT_DATE
            ''')
            if today_stats:
                stats["total_sessions_today"] = int(today_stats['sessions'] or 0)
                stats["estimated_cost_today"] = float(today_stats['cost'] or 0)
    except Exception as e:
        logger.warning(f"Failed to get DB stats: {e}")
    
    return stats


@api_router.delete("/admin/nexus/sessions/{session_id}")
async def admin_terminate_session(session_id: str, current_user: dict = Depends(require_admin)):
    """Admin-only: Terminate any session by ID"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}",
                timeout=30.0
            )
            
            # Update database status
            try:
                pool = await Database.get_pool()
                async with pool.acquire() as conn:
                    await conn.execute('''
                        UPDATE nexus_usage SET 
                            ended_at = NOW(),
                            status = 'terminated',
                            pod_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
                            estimated_cost = (EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600.0) * 0.035
                        WHERE session_id = $1 AND status = 'running'
                    ''', session_id)
            except Exception as e:
                logger.warning(f"Failed to update usage: {e}")
            
            if resp.status_code == 200:
                return {"success": True, "message": f"Session {session_id} terminated"}
            else:
                # Still mark as terminated in DB even if Nexus returns error
                return {"success": True, "message": f"Session marked as terminated (Nexus status: {resp.status_code})"}
                
    except httpx.RequestError as e:
        logger.error(f"Nexus connection error: {e}")
        # Mark as terminated in DB anyway
        try:
            pool = await Database.get_pool()
            async with pool.acquire() as conn:
                await conn.execute('''
                    UPDATE nexus_usage SET status = 'terminated', ended_at = NOW()
                    WHERE session_id = $1
                ''', session_id)
        except:
            pass
        return {"success": True, "message": "Session marked as terminated (Nexus unavailable)"}


@api_router.post("/admin/nexus/cleanup")
async def admin_cleanup_orphans(current_user: dict = Depends(require_admin)):
    """Admin-only: Manually trigger the Janitor cleanup cycle"""
    try:
        # We run the cleanup logic once immediately
        cleaned_count = 0
        
        # 1. Get K8s state
        cmd = "kubectl get svc -n nexus-challenges -o jsonpath='{.items[*].metadata.name}'"
        process = await asyncio.create_subprocess_shell(
            cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await process.communicate()
        active_services = stdout.decode().split()
        k8s_session_ids = [s.replace('svc-', '') for s in active_services if s.startswith('svc-sess-')]
        
        # 2. Get DB state
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT session_id FROM nexus_usage WHERE status = 'running'")
            db_session_ids = [r['session_id'] for r in rows]
            
            # Identify and Kill orphans
            orphans = [sid for sid in k8s_session_ids if sid not in db_session_ids]
            async with httpx.AsyncClient() as client:
                for sid in orphans:
                    await client.delete(f"{NEXUS_ENGINE_URL}/api/v1/sessions/{sid}", timeout=5.0)
                    cleaned_count += 1
            
            # also clean pods
            await asyncio.create_subprocess_shell("kubectl delete pods -n nexus-challenges --field-selector=status.phase!=Running")

            return {"success": True, "orphans_cleaned": cleaned_count, "message": "Cleanup cycle completed"}
    except Exception as e:
        logger.error(f"Manual cleanup failed: {e}")
        return {"success": False, "error": str(e)}


async def nexus_cleanup_janitor_task():
    """
    Background loop to sync database records with actual K8s state.
    
    Philosophy: Nexus Engine handles TTL-based termination and resource management.
    This janitor only:
    1. Updates DB records when sessions are found terminated
    2. Identifies truly orphaned resources (in K8s but not in any system)
    3. Cleans up failed/completed pods
    """
    logger.info("🛡️ Nexus Janitor: Database sync loop initialized.")
    await asyncio.sleep(60)  # Wait 1 minute before first run to let system stabilize
    
    while True:
        try:
            pool = await Database.get_pool()
            async with pool.acquire() as conn:
                # 1. Check running DB records against Nexus/K8s
                running_sessions = await conn.fetch(
                    "SELECT session_id, user_id, challenge_id FROM nexus_usage WHERE status = 'running'"
                )
                
                for session in running_sessions:
                    session_id = session['session_id']
                    try:
                        async with httpx.AsyncClient() as client:
                            resp = await client.get(
                                f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}",
                                timeout=5.0
                            )
                            if resp.status_code == 404:
                                # Session no longer exists in Nexus - TTL expired
                                logger.info(f"🛡️ Janitor: Session {session_id} not found in Nexus, marking as expired")
                                await conn.execute("""
                                    UPDATE nexus_usage SET 
                                        status = 'expired', 
                                        ended_at = COALESCE(ended_at, NOW())
                                    WHERE session_id = $1 AND status = 'running'
                                """, session_id)
                                
                                # Also remove from in-memory cache
                                uid = session['user_id']
                                cid = session['challenge_id']
                                if uid in nexus_sessions and cid in nexus_sessions[uid]:
                                    del nexus_sessions[uid][cid]
                                    
                    except Exception as e:
                        # Nexus may be temporarily unavailable - don't mark as terminated
                        logger.debug(f"🛡️ Janitor: Could not verify session {session_id}: {e}")
                
                # 2. Cleanup non-running pods (failed/completed) - safe maintenance
                try:
                    await asyncio.create_subprocess_shell(
                        "kubectl delete pods -n nexus-challenges --field-selector=status.phase!=Running --ignore-not-found 2>/dev/null || true"
                    )
                except Exception:
                    pass  # kubectl might not be available
                    
        except Exception as e:
            logger.error(f"🛡️ Janitor Cycle Error: {e}")
        
        await asyncio.sleep(300)  # Check every 5 minutes



@api_router.get("/admin/nexus/history")
async def admin_nexus_history(
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(require_admin)
):
    """Get complete session history with user info and billing details"""
    offset = (page - 1) * limit
    
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            # Get total count
            total = await conn.fetchval('SELECT COUNT(*) FROM nexus_usage')
            
            # Get sessions with user details
            rows = await conn.fetch('''
                SELECT 
                    nu.session_id,
                    nu.user_id,
                    nu.challenge_id,
                    nu.started_at,
                    nu.ended_at,
                    nu.status,
                    nu.pod_seconds,
                    nu.estimated_cost,
                    u.name,
                    u.email
                FROM nexus_usage nu
                LEFT JOIN users u ON nu.user_id = u.id
                ORDER BY nu.started_at DESC
                LIMIT $1 OFFSET $2
            ''', limit, offset)
            
            sessions = []
            for row in rows:
                # Calculate duration from actual timestamps, not pod_seconds (which includes extensions)
                duration_mins = None
                if row['started_at']:
                    from datetime import datetime, timezone
                    started = row['started_at']
                    if started.tzinfo is None:
                        started = started.replace(tzinfo=timezone.utc)
                    
                    if row['status'] == 'running':
                        # Currently running - calculate from now
                        now = datetime.now(timezone.utc)
                        duration_mins = int((now - started).total_seconds() / 60)
                    else:
                        # Session ended - use ended_at if available, otherwise use NOW() as fallback
                        if row['ended_at']:
                            ended = row['ended_at']
                            if ended.tzinfo is None:
                                ended = ended.replace(tzinfo=timezone.utc)
                            duration_mins = int((ended - started).total_seconds() / 60)
                        else:
                            # Fallback: ended_at was not set, calculate from now
                            now = datetime.now(timezone.utc)
                            duration_mins = int((now - started).total_seconds() / 60)
                
                sessions.append({
                    'session_id': row['session_id'],
                    'user_id': row['user_id'],
                    'username': row['name'] or 'Unknown',
                    'email': row['email'],
                    'challenge_id': row['challenge_id'],
                    'started_at': row['started_at'].isoformat() if row['started_at'] else None,
                    'ended_at': row['ended_at'].isoformat() if row['ended_at'] else None,
                    'status': row['status'],
                    'duration_mins': duration_mins,
                    'cost': round(float(row['estimated_cost'] or 0), 4)
                })
            
            # Get summary stats
            stats = await conn.fetchrow('''
                SELECT 
                    COUNT(*) as total_sessions,
                    COALESCE(SUM(estimated_cost), 0) as total_cost,
                    COALESCE(SUM(pod_seconds), 0) as total_seconds,
                    COUNT(DISTINCT user_id) as unique_users
                FROM nexus_usage
            ''')
            
            # Get daily breakdown for last 7 days
            daily = await conn.fetch('''
                SELECT 
                    DATE(started_at) as date,
                    COUNT(*) as sessions,
                    COALESCE(SUM(estimated_cost), 0) as cost,
                    COALESCE(SUM(pod_seconds), 0) as seconds
                FROM nexus_usage
                WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY DATE(started_at)
                ORDER BY date DESC
            ''')
            
            return {
                "sessions": sessions,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit if total else 0
                },
                "summary": {
                    "total_sessions": int(stats['total_sessions'] or 0),
                    "total_cost": round(float(stats['total_cost'] or 0), 4),
                    "total_hours": round((stats['total_seconds'] or 0) / 3600, 2),
                    "unique_users": int(stats['unique_users'] or 0)
                },
                "daily_breakdown": [
                    {
                        "date": row['date'].isoformat(),
                        "sessions": int(row['sessions']),
                        "cost": round(float(row['cost'] or 0), 4),
                        "hours": round((row['seconds'] or 0) / 3600, 2)
                    }
                    for row in daily
                ]
            }
    except Exception as e:
        logger.error(f"Failed to get history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")


@api_router.get("/admin/nexus/pricing")
async def admin_nexus_pricing(
    hours: float = 1.0,
    concurrent_users: int = 10,
    current_user: dict = Depends(require_admin)
):
    """
    Calculate estimated costs for Nexus/GKE usage.
    
    Per challenge instance (GKE Autopilot asia-south1):
    - 0.25 vCPU = $0.0079/hour
    - 0.5GB RAM = $0.00168/hour  
    - 1 LoadBalancer = $0.025/hour
    - Total: ~$0.035/hour per instance
    """
    vcpu_cost = 0.25 * 0.0316
    memory_cost = 0.5 * 0.00336
    lb_cost = 0.025
    instance_cost_per_hour = vcpu_cost + memory_cost + lb_cost
    
    total_instance_hours = hours * concurrent_users
    total_cost = total_instance_hours * instance_cost_per_hour
    monthly_hours = hours * concurrent_users * 30
    monthly_cost = monthly_hours * instance_cost_per_hour
    
    return {
        "pricing": {
            "per_instance_per_hour": round(instance_cost_per_hour, 4),
            "breakdown": {"vcpu_0.25": round(vcpu_cost, 4), "memory_0.5gb": round(memory_cost, 5), "loadbalancer": lb_cost}
        },
        "estimate": {
            "hours": hours, "concurrent_users": concurrent_users,
            "total_instance_hours": total_instance_hours, "total_cost_usd": round(total_cost, 2)
        },
        "monthly_projection": {
            "assuming_daily_usage": True, "monthly_instance_hours": monthly_hours, "monthly_cost_usd": round(monthly_cost, 2)
        },
        "note": "Actual costs may vary. GKE Autopilot charges only for running pods."
    }


@api_router.get("/admin/nexus/billing")
async def admin_nexus_billing(current_user: dict = Depends(require_admin)):
    """
    Get billing history from database.
    Returns usage data grouped by day for the last 7 days.
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Try to fetch from nexus_usage table if it exists
        try:
            rows = await conn.fetch('''
                SELECT 
                    DATE(started_at) as date,
                    COALESCE(SUM(estimated_cost), 0) as cost,
                    COUNT(*) as sessions
                FROM nexus_usage
                WHERE started_at >= NOW() - INTERVAL '7 days'
                GROUP BY DATE(started_at)
                ORDER BY date DESC
            ''')
            history = [
                {
                    "date": row['date'].strftime('%b %d') if row['date'] else '',
                    "cost": float(row['cost']) if row['cost'] else 0,
                    "sessions": int(row['sessions']) if row['sessions'] else 0
                }
                for row in rows
            ]
            return {"history": history}
        except Exception as e:
            # Table doesn't exist yet or other error - return empty
            logger.info(f"Billing data not available: {e}")
            return {"history": []}


# ===========================================
# APPLICATION LIFECYCLE
# ===========================================


@app.on_event("startup")
async def startup():
    logger.info("Starting CTF Platform API v2.0 (PostgreSQL)")
    
    # Initialize Artifacts directory
    ARTIFACTS_DIR = ROOT_DIR / "uploads" / "artifacts"
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        pool = await Database.get_pool()
        logger.info("Database connection established")
        
        # Migration: Create Artifacts Table
        async with pool.acquire() as conn:
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS ctf_challenge_artifacts (
                    id UUID PRIMARY KEY,
                    challenge_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER,
                    mime_type TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            ''')
            logger.info("Artifacts table verified")
            
            # Migration: Add tags column to challenges table if not exists
            try:
                await conn.execute('''
                    ALTER TABLE ctf_public_challenges 
                    ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb
                ''')
                logger.info("Tags column migration complete")
            except Exception as e:
                logger.debug(f"Tags column already exists or migration skipped: {e}")

            # Migration: Add bio and social_links to users table
            try:
                await conn.execute('''
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
                    ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb
                ''')
                logger.info("User profile columns migration complete")
            except Exception as e:
                logger.debug(f"User profile columns already exist or migration skipped: {e}")

            # Migration: Add google_avatar and github_avatar columns for OAuth provider avatars
            try:
                await conn.execute('''
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS google_avatar TEXT,
                    ADD COLUMN IF NOT EXISTS github_avatar TEXT
                ''')
                logger.info("OAuth avatar columns migration complete")
            except Exception as e:
                logger.debug(f"OAuth avatar columns already exist or migration skipped: {e}")

    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise
    
    # Start background janitor for Nexus
    asyncio.create_task(nexus_cleanup_janitor_task())


@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down...")
    await Database.close()


# Include router and middleware
app.include_router(api_router)

# Security Middlewares (Note: Fast/Starlette executes middleware in reverse order of addition)
# Execution Order: CORS -> TrustedHost -> SecurityHeaders -> RateLimit -> Router
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=os.environ.get('ALLOWED_HOSTS', '*').split(',')
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
