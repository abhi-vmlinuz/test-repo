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
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import json
from datetime import datetime, timezone, timedelta
import bcrypt
import argon2  # LMS uses Argon2 for password hashing
import jwt
import asyncpg
import zipfile
import shutil
import tempfile

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
            cls._pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
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

class PublicChallengeCreate(BaseModel):
    category_id: str
    title: str
    description: str
    difficulty: str = "medium"  # easy, medium, hard
    points: int = 100
    flag: str
    docker_image: Optional[str] = None
    docker_command: Optional[str] = None
    docker_port: Optional[int] = None
    github_repo: Optional[str] = None
    github_path: Optional[str] = None
    hints: List[Hint] = []
    questions: List[Question] = []
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
# FASTAPI APP SETUP
# ===========================================

app = FastAPI(
    title="ZecurX CTF Platform API",
    description="CTF Platform integrated with ZecurX LMS",
    version="2.0.0"
)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()


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
                       r.type as role_type
                FROM users u
                JOIN "Role" r ON u."roleId" = r.id
                WHERE u.id = $1
            ''', user_id)
            
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            if user['is_banned'] and user['role_type'] != 'SUPERADMIN':
                raise HTTPException(status_code=403, detail="Account is banned")
            
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
                'is_active': user['isActive']
            }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


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
                'role_type': user['role_type']  # Include actual role type for LMS integration
            }
        }


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user


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
async def get_challenges(category_id: Optional[str] = None):
    """Get all public CTF challenges"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        if category_id:
            challenges = await conn.fetch('''
                SELECT id, "categoryId", title, description, difficulty, 
                       points, "dockerImage", hints, questions, solves, "isPublished"
                FROM ctf_public_challenges
                WHERE "categoryId" = $1 AND "isPublished" = true
                ORDER BY points
            ''', category_id)
        else:
            challenges = await conn.fetch('''
                SELECT id, "categoryId", title, description, difficulty,
                       points, "dockerImage", hints, questions, solves, "isPublished"
                FROM ctf_public_challenges
                WHERE "isPublished" = true
                ORDER BY points
            ''')
        
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
            
            result.append({
                'id': ch['id'],
                'category_id': ch['categoryId'],
                'title': ch['title'],
                'description': ch['description'],
                'difficulty': ch['difficulty'].lower() if ch['difficulty'] else 'medium',
                'points': ch['points'] or 0,
                'total_points': total_points,  # Base + questions
                'docker_image': ch['dockerImage'],
                'hints': hints,
                'questions': questions,
                'solves': ch['solves'],
                'is_published': ch['isPublished']
            })
        
        return result


@api_router.get("/challenges/{challenge_id}")
async def get_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Get challenge details with user progress"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        challenge = await conn.fetchrow('''
            SELECT id, "categoryId", title, description, difficulty,
                   points, "dockerImage", hints, questions, solves, flag
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
async def get_leaderboard(limit: int = 100):
    """Get global CTF leaderboard"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        users = await conn.fetch('''
            SELECT u.id, u.name, u.email, u."ctfScore" as score
            FROM users u
            WHERE u."ctfScore" > 0
            ORDER BY u."ctfScore" DESC
            LIMIT $1
        ''', limit)
        
        return [
            {
                'rank': i + 1,
                'id': u['id'],
                'username': u['name'] or u['email'].split('@')[0],
                'score': u['score']
            }
            for i, u in enumerate(users)
        ]


# ===========================================
# PUBLIC CTF: USER STATS
# ===========================================

@api_router.get("/me/stats")
@api_router.get("/stats/me")  # Alias for frontend compatibility
async def get_my_stats(current_user: dict = Depends(get_current_user)):
    """Get current user's CTF statistics"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Total challenges solved
        solved = await conn.fetchval('''
            SELECT COUNT(*) FROM ctf_public_progress
            WHERE "userId" = $1 AND solved = true
        ''', current_user['id'])
        
        # Total points
        points = await conn.fetchval('''
            SELECT COALESCE(SUM("scoreEarned"), 0) FROM ctf_public_progress
            WHERE "userId" = $1
        ''', current_user['id'])
        
        # Rank
        rank = await conn.fetchval('''
            SELECT COUNT(*) + 1 FROM users
            WHERE "ctfScore" > (SELECT "ctfScore" FROM users WHERE id = $1)
        ''', current_user['id'])
        
        # Category breakdown
        categories = await conn.fetch('''
            SELECT c.name, COUNT(p.id) as solved_count
            FROM ctf_categories c
            LEFT JOIN ctf_public_challenges ch ON c.id = ch."categoryId"
            LEFT JOIN ctf_public_progress p ON ch.id = p."challengeId" 
                AND p."userId" = $1 AND p.solved = true
            GROUP BY c.id, c.name
        ''', current_user['id'])
        
        # Get total challenges for completion percentage
        total_challenges = await conn.fetchval('''
            SELECT COUNT(*) FROM ctf_public_challenges WHERE "isPublished" = true
        ''')
        
        # Get category stats for frontend
        category_stats = []
        for cat in categories:
            cat_total = await conn.fetchval('''
                SELECT COUNT(*) FROM ctf_public_challenges 
                WHERE "categoryId" = (SELECT id FROM ctf_categories WHERE name = $1)
                AND "isPublished" = true
            ''', cat['name'])
            category_stats.append({
                'category': cat['name'],
                'solved': cat['solved_count'] or 0,
                'total': cat_total or 0
            })
        
        return {
            'challenges_solved': solved,
            'total_challenges': total_challenges,
            'total_points': points,
            'total_score': points,  # Alias for frontend
            'rank': rank,
            'score': current_user.get('score', 0),
            'categories': [dict(c) for c in categories],
            'category_stats': category_stats
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
             data.docker_image, data.docker_command,
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
            
            result.append({
                'id': c['id'],
                'category_id': c['categoryId'],
                'title': c['title'],
                'description': c['description'],
                'difficulty': c['difficulty'].lower() if c['difficulty'] else 'medium',
                'points': c['points'],
                'flag': c['flag'],
                'docker_image': c['dockerImage'],
                'docker_command': c['dockerCommand'],
                'hints': hints or [],
                'questions': questions or [],
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
        
        await conn.execute('''
            INSERT INTO ctf_public_challenges (
                id, "categoryId", title, description, difficulty, points,
                flag, "dockerImage", "dockerCommand", hints, questions,
                "isPublished", solves, "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5::"CtfDifficulty", $6, $7, $8, $9, $10, $11, $12, 0, NOW(), NOW())
        ''', challenge_id, data.category_id, data.title, data.description,
             data.difficulty.upper(), data.points, data.flag,
             data.docker_image, data.docker_command,
             json.dumps(hints), json.dumps(questions), data.is_published)
        
        return {'id': challenge_id}


@api_router.put("/admin/challenges/{challenge_id}")
async def admin_update_challenge(challenge_id: str, data: PublicChallengeCreate, admin: dict = Depends(require_admin)):
    """Update a challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        hints = [{'text': h.text, 'cost': h.cost} for h in data.hints]
        questions = [{'question': q.question, 'flag': q.flag, 'points': q.points} for q in data.questions]
        
        await conn.execute('''
            UPDATE ctf_public_challenges SET
                "categoryId" = $1, title = $2, description = $3, difficulty = $4::"CtfDifficulty",
                points = $5, flag = $6, "dockerImage" = $7, "dockerCommand" = $8,
                hints = $9, questions = $10, "isPublished" = $11, "updatedAt" = NOW()
            WHERE id = $12
        ''', data.category_id, data.title, data.description, data.difficulty.upper(),
             data.points, data.flag, data.docker_image, data.docker_command,
             json.dumps(hints), json.dumps(questions), data.is_published, challenge_id)
        
        return {'success': True}


@api_router.delete("/admin/challenges/{challenge_id}")
async def admin_delete_challenge(challenge_id: str, admin: dict = Depends(require_admin)):
    """Delete a challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM ctf_public_challenges WHERE id = $1', challenge_id)
        return {'success': True}


# ===========================================
# ADMIN: DOCKER CHALLENGE UPLOAD
# ===========================================

DOCKER_BUILDS_DIR = Path("/tmp/nexus-docker-builds")
DOCKER_BUILDS_DIR.mkdir(exist_ok=True)


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
                # Images are stored at: ghcr.io/abhizzz123/ctf-challenges/{short-id}
                ghcr_username = os.environ.get('GHCR_USERNAME', 'abhizzz123')
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
                 docker_image, data.get('docker_command'),
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
                ghcr_username = os.environ.get('GHCR_USERNAME', 'abhizzz123')
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
                 docker_image, data.get('docker_command'),
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

import httpx

NEXUS_ENGINE_URL = os.environ.get('NEXUS_ENGINE_URL', 'http://172.235.15.209:8081')

# Nexus session storage (user_id -> session_id mapping)
nexus_sessions: Dict[str, Dict[str, str]] = {}  # {user_id: {challenge_id: session_id}}


class NexusSessionRequest(BaseModel):
    challenge_id: str


@api_router.post("/docker/start/{challenge_id}")
async def start_docker_instance(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Start a K8s container for the challenge via Nexus Engine"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        challenge = await conn.fetchrow('''
            SELECT id, title, docker_image, docker_command 
            FROM ctf_public_challenges WHERE id = $1
        ''', challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        if not challenge['docker_image']:
            raise HTTPException(status_code=400, detail="This challenge does not have a container")
        
        user_id = current_user['id']
        
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
                
                if user_id not in nexus_sessions:
                    nexus_sessions[user_id] = {}
                nexus_sessions[user_id][challenge_id] = session_data['session_id']
                
                # Track usage for billing (insert into nexus_usage table)
                try:
                    pool = await Database.get_pool()
                    async with pool.acquire() as conn:
                        await conn.execute('''
                            INSERT INTO nexus_usage (
                                id, user_id, challenge_id, session_id, started_at, status
                            ) VALUES ($1, $2, $3, $4, NOW(), 'running')
                        ''', generate_uuid(), user_id, challenge_id, session_data['session_id'])
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
            if resp.status_code == 200:
                user_id = current_user['id']
                if user_id in nexus_sessions:
                    for chal_id, sess_id in list(nexus_sessions[user_id].items()):
                        if sess_id == session_id:
                            del nexus_sessions[user_id][chal_id]
                            break
                
                # Update usage record with end time and calculate cost
                try:
                    pool = await Database.get_pool()
                    async with pool.acquire() as conn:
                        # Calculate cost: ~$0.035/hour per instance
                        await conn.execute('''
                            UPDATE nexus_usage SET 
                                ended_at = NOW(),
                                status = 'completed',
                                pod_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
                                estimated_cost = (EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600.0) * 0.035
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
    """Extend container TTL by 15 minutes"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}/extend",
                json={"extra_minutes": 15},
                timeout=10.0
            )
            if resp.status_code == 200:
                return resp.json()
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


# Nexus Admin Endpoints
@api_router.get("/admin/nexus/sessions")
async def admin_nexus_sessions(current_user: dict = Depends(require_admin)):
    """Get all active Nexus sessions (admin only)"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/admin/sessions", timeout=10.0)
            return resp.json()
    except:
        return {"sessions": []}


@api_router.get("/admin/nexus/stats")
async def admin_nexus_stats(current_user: dict = Depends(require_admin)):
    """Get Nexus Engine stats (admin only)"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/admin/stats", timeout=10.0)
            return resp.json()
    except:
        return {"active_sessions": 0, "total_pods": 0}


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
    try:
        await Database.get_pool()
        logger.info("Database connection established")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise


@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down...")
    await Database.close()


# Include router and middleware
app.include_router(api_router)

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
