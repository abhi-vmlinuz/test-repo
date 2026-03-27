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
import random
from datetime import datetime, timezone, timedelta
import bcrypt
import argon2  # LMS uses Argon2 for password hashing
import jwt
import asyncpg
import zipfile
import shutil
import tempfile
import httpx
import smtplib
import secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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

# SMTP Configuration (for OTP emails)
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '')
SMTP_FROM = os.environ.get('SMTP_FROM', 'noreply@zecurx.com')
SMTP_FROM_NAME = os.environ.get('SMTP_FROM_NAME', 'ZecurX CTF')

# Session Configuration
SESSION_EXPIRY_HOURS = 24  # Sessions expire after 24 hours
OTP_EXPIRY_MINUTES = 5     # OTP codes expire after 5 minutes
PASSWORD_RESET_EXPIRY_MINUTES = 60  # Password reset tokens expire after 60 minutes


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
            async def init_connection(conn):
                # Register uuid codec: asyncpg encodes/decodes uuid as str
                await conn.set_type_codec(
                    'uuid',
                    encoder=str,
                    decoder=str,
                    schema='pg_catalog',
                    format='text'
                )
            cls._pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=min_size,
                max_size=max_size,
                init=init_connection
            )
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
    force_login: bool = False  # If True, clears stale session and logs in

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

# Session & OTP Models
class ForceLogoutRequest(BaseModel):
    """Request to initiate force logout (sends OTP)"""
    email: EmailStr
    password: str

class OTPVerifyRequest(BaseModel):
    """Verify OTP and complete force logout"""
    email: EmailStr
    otp_code: str
    password: str  # Re-verify password for security

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
    author: Optional[str] = None  # Challenge builder/author name
    docker_image: Optional[str] = None
    docker_port: Optional[int] = None  # Deprecated - use ports instead
    ports: List[int] = []  # Ports to expose for players (e.g., [22, 80, 3000])
    github_repo: Optional[str] = None
    github_path: Optional[str] = None
    hints: List[Hint] = []
    questions: List[Question] = []
    tags: List[str] = []  # Tags for filtering/display (e.g., "web", "crypto", "forensics")
    is_published: bool = True
    # Multi-container pack support
    challenge_pack_id: Optional[str] = None  # ID of the challenge pack (for docker-compose based challenges)
    is_multi_container: bool = False  # True if using a multi-container pack
    has_docker: bool = False  # True if this challenge has a lab environment


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
# CERTIFICATION EXAM MODELS
# ===========================================

# Points mapping for certification exam pools (EXPERT excluded)
CERTIFICATION_DIFFICULTY_POINTS = {
    'EASY': 10,
    'MEDIUM': 20,
    'HARD': 30
}

class CertificationExamConfigCreate(BaseModel):
    """Create a certification exam configuration with 3 pools"""
    name: str  # e.g., "ZXCPPT January 2026"
    lms_final_exam_id: str
    pool_a_challenge_ids: List[str]  # Exactly 7 challenges, 120 points
    pool_b_challenge_ids: List[str]  # Exactly 7 challenges, 120 points
    pool_c_challenge_ids: List[str]  # Exactly 7 challenges, 120 points
    
    # Optional overrides (defaults in DB)
    global_duration_hours: int = 48
    ctf_duration_hours: int = 12
    report_duration_hours: int = 3

class CertificationExamConfigUpdate(BaseModel):
    """Update certification exam configuration"""
    name: Optional[str] = None
    pool_a_challenge_ids: Optional[List[str]] = None
    pool_b_challenge_ids: Optional[List[str]] = None
    pool_c_challenge_ids: Optional[List[str]] = None
    global_duration_hours: Optional[int] = None
    ctf_duration_hours: Optional[int] = None
    report_duration_hours: Optional[int] = None

class CertificationPoolChallenge(BaseModel):
    """Challenge available for pool selection"""
    id: str
    title: str
    category: str
    category_id: str
    difficulty: str
    points: int  # Certification points (10/20/30), not challenge original points

class CertificationExamConfigResponse(BaseModel):
    """Certification exam config details"""
    id: str
    name: str
    exam_type: str
    lms_final_exam_id: str
    pool_a_challenge_ids: List[str]
    pool_b_challenge_ids: List[str]
    pool_c_challenge_ids: List[str]
    total_lab_points: int
    global_duration_hours: int
    ctf_duration_hours: int
    report_duration_hours: int
    is_published: bool
    created_at: str
    updated_at: str
    # Computed fields
    pool_a_challenges: Optional[List[dict]] = None
    pool_b_challenges: Optional[List[dict]] = None
    pool_c_challenges: Optional[List[dict]] = None
    attempt_count: Optional[int] = None

class CertificationExamAttemptSummary(BaseModel):
    """Summary of a student's certification exam attempt"""
    id: str
    user_id: str
    student_name: str
    student_email: str
    assigned_pool: str
    status: str
    mcq_score: Optional[float] = None
    mcq_correct: Optional[int] = None
    mcq_wrong: Optional[int] = None
    lab_score: Optional[float] = None
    lab_points_earned: int
    report_score: Optional[float] = None
    final_score: Optional[float] = None
    passed: Optional[bool] = None
    certification_level: Optional[str] = None
    redeemed_at: str
    global_expires_at: str
    lab_started_at: Optional[str] = None
    lab_expires_at: Optional[str] = None
    report_uploaded_at: Optional[str] = None
    report_graded_at: Optional[str] = None

class ReportGradeRequest(BaseModel):
    """Admin request to grade a student's report"""
    clarity: int = Field(..., ge=0, le=20)
    technical: int = Field(..., ge=0, le=25)
    reproducibility: int = Field(..., ge=0, le=25)
    impact: int = Field(..., ge=0, le=15)
    remediation: int = Field(..., ge=0, le=15)
    feedback: Optional[str] = None


# ===========================================
# HELPER FUNCTIONS
# ===========================================

def generate_uuid() -> str:
    return str(uuid.uuid4())

def slugify(text: str) -> str:
    """Generate a URL-friendly slug from text."""
    import re
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = text.strip('-')
    return text

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
# SESSION & OTP HELPERS
# ===========================================

def generate_otp() -> str:
    """Generate a 6-digit OTP code"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

def generate_session_token() -> str:
    """Generate a secure session token"""
    return secrets.token_urlsafe(32)

async def send_otp_email(email: str, otp_code: str, username: str = "User") -> bool:
    """Send OTP email for force logout verification"""
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP not configured, OTP email skipped")
        logger.info(f"OTP for {email}: {otp_code}")  # Log for dev purposes
        return True  # Return True in dev mode
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'🔐 ZecurX CTF - Verification Code: {otp_code}'
        msg['From'] = f'{SMTP_FROM_NAME} <{SMTP_FROM}>'
        msg['To'] = email
        
        html_content = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #18181b 0%, #3f3f46 100%); padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">🔐 Session Verification</h1>
                </div>
                <div style="padding: 32px;">
                    <p style="color: #52525b; font-size: 15px; margin: 0 0 24px;">Hi {username},</p>
                    <p style="color: #52525b; font-size: 15px; margin: 0 0 24px;">
                        Someone is trying to log into your account from a new device. 
                        If this is you, use the verification code below to complete the login:
                    </p>
                    <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                        <div style="font-size: 36px; font-weight: 700; color: #18181b; letter-spacing: 8px; font-family: monospace;">
                            {otp_code}
                        </div>
                        <p style="color: #71717a; font-size: 13px; margin: 12px 0 0;">
                            Code expires in 5 minutes
                        </p>
                    </div>
                    <p style="color: #71717a; font-size: 13px; margin: 0; padding-top: 16px; border-top: 1px solid #e4e4e7;">
                        ⚠️ If this wasn't you, someone has your password. Please change it immediately.
                    </p>
                </div>
                <div style="background: #fafafa; padding: 16px 32px; text-align: center; border-top: 1px solid #e4e4e7;">
                    <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                        ZecurX CTF Platform • ctf.zecurx.com
                    </p>
                </div>
            </div>
        </body>
        </html>
        '''
        
        text_content = f'''
        ZecurX CTF - Verification Code
        
        Hi {username},
        
        Someone is trying to log into your account from a new device.
        Your verification code is: {otp_code}
        
        This code expires in 5 minutes.
        
        If this wasn't you, please change your password immediately.
        '''
        
        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, email, msg.as_string())
        
        logger.info(f"OTP email sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send OTP email: {e}")
        return False

async def create_session(conn, user_id: str, session_token: str, request: Request = None) -> str:
    """Create a new active session for user"""
    ip_address = request.client.host if request else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")[:500] if request else "unknown"
    
    expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_EXPIRY_HOURS)
    
    await conn.execute('''
        INSERT INTO ctf_active_sessions (user_id, session_token, ip_address, user_agent, expires_at)
        VALUES ($1, $2, $3, $4, $5)
    ''', user_id, session_token, ip_address, user_agent, expires_at)
    
    return session_token

async def get_active_session(conn, user_id: str) -> Optional[dict]:
    """Check if user has an active session"""
    # Clean up expired sessions first
    await conn.execute('''
        UPDATE ctf_active_sessions 
        SET is_active = false 
        WHERE expires_at < NOW() AND is_active = true
    ''')
    
    # Also invalidate stale sessions (no activity for 2+ hours)
    # This prevents false positives from abandoned sessions
    await conn.execute('''
        UPDATE ctf_active_sessions 
        SET is_active = false 
        WHERE is_active = true 
        AND last_activity_at < NOW() - INTERVAL '2 hours'
    ''')
    
    session = await conn.fetchrow('''
        SELECT id, session_token, ip_address, user_agent, created_at, last_activity_at
        FROM ctf_active_sessions
        WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
    ''', user_id)
    
    return dict(session) if session else None


async def invalidate_user_sessions(conn, user_id: str) -> int:
    """Invalidate all active sessions for a user (for force logout)"""
    result = await conn.execute('''
        UPDATE ctf_active_sessions 
        SET is_active = false 
        WHERE user_id = $1 AND is_active = true
    ''', user_id)
    
    # Extract count from result (e.g., "UPDATE 3")
    count = int(result.split()[-1]) if result else 0
    logger.info(f"Invalidated {count} sessions for user {user_id}")
    return count

async def invalidate_session_by_token(conn, session_token: str) -> bool:
    """Invalidate a specific session by token"""
    result = await conn.execute('''
        UPDATE ctf_active_sessions 
        SET is_active = false 
        WHERE session_token = $1 AND is_active = true
    ''', session_token)
    
    return 'UPDATE 1' in result

async def create_otp(conn, user_id: str, email: str, purpose: str = 'force_logout') -> str:
    """Create and store OTP code"""
    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    # Invalidate any existing OTPs for this user/purpose
    await conn.execute('''
        DELETE FROM ctf_otp_codes 
        WHERE user_id = $1 AND purpose = $2 AND is_used = false
    ''', user_id, purpose)
    
    await conn.execute('''
        INSERT INTO ctf_otp_codes (user_id, email, code, purpose, expires_at)
        VALUES ($1, $2, $3, $4, $5)
    ''', user_id, email, otp_code, purpose, expires_at)
    
    return otp_code

async def verify_otp(conn, user_id: str, otp_code: str, purpose: str = 'force_logout') -> bool:
    """Verify OTP code"""
    otp = await conn.fetchrow('''
        SELECT id FROM ctf_otp_codes
        WHERE user_id = $1 AND code = $2 AND purpose = $3 
              AND is_used = false AND expires_at > NOW()
    ''', user_id, otp_code, purpose)
    
    if otp:
        # Mark as used
        await conn.execute('''
            UPDATE ctf_otp_codes SET is_used = true, used_at = NOW() WHERE id::text = $1
        ''', otp['id'])
        return True
    
    return False


def generate_reset_token() -> str:
    """Generate a secure password reset token (URL-safe)"""
    return secrets.token_urlsafe(32)


async def create_password_reset_token(conn, user_id: str, email: str) -> str:
    """Create and store password reset token"""
    token = generate_reset_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_EXPIRY_MINUTES)
    
    # Invalidate any existing reset tokens for this user
    await conn.execute('''
        DELETE FROM ctf_otp_codes 
        WHERE user_id = $1 AND purpose = 'password_reset' AND is_used = false
    ''', user_id)
    
    # Store token (using ctf_otp_codes table with purpose = 'password_reset')
    await conn.execute('''
        INSERT INTO ctf_otp_codes (user_id, email, code, purpose, expires_at)
        VALUES ($1, $2, $3, 'password_reset', $4)
    ''', user_id, email, token, expires_at)
    
    return token


async def verify_reset_token(conn, token: str) -> Optional[dict]:
    """Verify password reset token and return user info"""
    result = await conn.fetchrow('''
        SELECT o.id, o.user_id, o.email, u.name
        FROM ctf_otp_codes o
        JOIN users u ON u.id = o.user_id
        WHERE o.code = $1 AND o.purpose = 'password_reset'
              AND o.is_used = false AND o.expires_at > NOW()
    ''', token)
    
    return dict(result) if result else None


async def consume_reset_token(conn, token: str) -> bool:
    """Mark reset token as used"""
    result = await conn.execute('''
        UPDATE ctf_otp_codes SET is_used = true, used_at = NOW()
        WHERE code = $1 AND purpose = 'password_reset' AND is_used = false
    ''', token)
    return 'UPDATE 1' in result


def send_password_reset_email(to_email: str, user_name: str, reset_token: str) -> bool:
    """Send password reset email with token link"""
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP not configured - cannot send password reset email")
        return False
    
    try:
        reset_url = f"https://ctf.zecurx.com/reset-password?token={reset_token}"
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Reset Your ZecurX Password'
        msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
        msg['To'] = to_email
        
        text_content = f"""
Hi {user_name},

You requested to reset your password for your ZecurX CTF account.

Click the link below to reset your password:
{reset_url}

This link will expire in 60 minutes.

If you didn't request this, you can safely ignore this email.

- The ZecurX Team
        """.strip()
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
            <td style="padding: 40px 30px; text-align: center; background-color: #09090b;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">ZecurX CTF</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 40px 30px;">
                <h2 style="margin: 0 0 20px 0; color: #09090b; font-size: 20px;">Reset Your Password</h2>
                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Hi {user_name},
                </p>
                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    You requested to reset your password for your ZecurX CTF account. Click the button below to set a new password:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="text-align: center;">
                            <a href="{reset_url}" style="display: inline-block; padding: 14px 32px; background-color: #09090b; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                                Reset Password
                            </a>
                        </td>
                    </tr>
                </table>
                <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    This link will expire in <strong>60 minutes</strong>.
                </p>
                <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0;">
                    If you didn't request this, you can safely ignore this email.
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px 30px; text-align: center; background-color: #fafafa; border-top: 1px solid #eaeaea;">
                <p style="color: #888888; font-size: 12px; margin: 0;">
                    © 2026 ZecurX. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
        """.strip()
        
        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        
        logger.info(f"Password reset email sent to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        return False


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



from seo_routes import seo_router

api_router = APIRouter(prefix="/api")
app.include_router(seo_router, prefix="/api")
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
                WHERE u.id::text = $1
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
            
            # Update session last_activity_at (heartbeat to keep session alive)
            await conn.execute('''
                UPDATE ctf_active_sessions 
                SET last_activity_at = NOW() 
                WHERE user_id = $1 AND is_active = true
            ''', user_id)
            
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


async def require_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require superadmin role only"""
    if current_user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return current_user


async def require_feature(feature_key: str, current_user: dict) -> bool:
    """Check if a feature is accessible by the current user.
    Returns True if accessible, raises 403 if not."""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        flag = await conn.fetchrow(
            'SELECT status FROM feature_flags WHERE key = $1', feature_key
        )
        if not flag:
            return True  # Unknown features default to accessible

        status = flag['status']
        if status == 'enabled':
            return True
        elif status == 'beta':
            if current_user.get('role') != 'superadmin':
                raise HTTPException(status_code=403, detail="Feature not available")
            return True
        else:
            raise HTTPException(status_code=403, detail="Feature not available")


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
async def login(credentials: UserLogin, request: Request):
    """Login with LMS credentials - Single session enforcement"""
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
                # OR has an active certification exam attempt (cert students get access too)
                has_ctf_access = await conn.fetchval('''
                    SELECT EXISTS (
                        SELECT 1 
                        FROM enrollments e
                        JOIN courses c ON e."courseId" = c.id
                        JOIN ctf_courses cc ON cc."lmsCourseId" = c.id
                        WHERE e."userId"::text = $1 AND e.status = 'ACTIVE'
                    )
                ''', str(user['id']))

                if not has_ctf_access:
                    # Also allow if student has a certification exam attempt
                    has_cert_access = await conn.fetchval('''
                        SELECT EXISTS (
                            SELECT 1
                            FROM certification_exam_attempts cea
                            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
                            WHERE cea."userId"::text = $1
                            AND cec."isPublished" = true
                        )
                    ''', str(user['id']))
                    has_ctf_access = has_cert_access

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
        
        # Always clear any stale sessions to allow fresh login
        await conn.execute(
            'DELETE FROM ctf_active_sessions WHERE user_id::text = $1',
            str(user['id'])
        )

        # Map roles to CTF display roles
        role_map = {
            'SUPERADMIN': 'superadmin', 
            'ADMIN': 'admin', 
            'INSTRUCTOR': 'admin',
            'STUDENT': 'student',  # Students with LMS CTF enrollment
            'CTF_USER': 'user'
        }
        
        # Create JWT token
        token = create_token(user['id'])
        
        # Create session token for tracking
        session_token = generate_session_token()
        await create_session(conn, user['id'], session_token, request)
        
        return {
            'token': token,
            'session_token': session_token,  # Return for logout purposes
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


@api_router.post("/auth/force-logout/request")
async def request_force_logout(data: ForceLogoutRequest):
    """Request OTP to force logout existing session"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Verify user exists and password is correct
        user = await conn.fetchrow('''
            SELECT u.id, u.name, u.email, u.password
            FROM users u
            WHERE LOWER(u.email) = LOWER($1)
        ''', data.email)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not verify_password(data.password, user['password']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if there's actually an active session
        active_session = await get_active_session(conn, user['id'])
        if not active_session:
            raise HTTPException(
                status_code=400, 
                detail="No active session found. You can login directly."
            )
        
        # Generate and send OTP
        otp_code = await create_otp(conn, user['id'], user['email'], 'force_logout')
        email_sent = await send_otp_email(user['email'], otp_code, user['name'] or 'User')
        
        if not email_sent:
            raise HTTPException(
                status_code=500, 
                detail="Failed to send verification email. Please try again."
            )
        
        return {
            'success': True,
            'message': f"Verification code sent to {user['email'][:3]}***{user['email'].split('@')[0][-1]}@{user['email'].split('@')[1]}",
            'expires_in': OTP_EXPIRY_MINUTES * 60  # In seconds
        }


@api_router.post("/auth/force-logout/verify")
async def verify_force_logout(data: OTPVerifyRequest, request: Request):
    """Verify OTP and complete force logout + new login"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Verify user and password again (security)
        user = await conn.fetchrow('''
            SELECT u.id, u.name, u.email, u.password,
                   u."ctfScore" as score, u.avatar_url,
                   r.type as role_type
            FROM users u
            JOIN "Role" r ON u."roleId" = r.id
            WHERE LOWER(u.email) = LOWER($1)
        ''', data.email)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not verify_password(data.password, user['password']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify OTP
        is_valid = await verify_otp(conn, user['id'], data.otp_code, 'force_logout')
        if not is_valid:
            raise HTTPException(
                status_code=400, 
                detail="Invalid or expired verification code"
            )
        
        # Invalidate all existing sessions
        await invalidate_user_sessions(conn, user['id'])
        
        # Create new session for this device
        token = create_token(user['id'])
        session_token = generate_session_token()
        await create_session(conn, user['id'], session_token, request)
        
        # Map roles
        role_map = {
            'SUPERADMIN': 'superadmin', 
            'ADMIN': 'admin', 
            'INSTRUCTOR': 'admin',
            'STUDENT': 'student',
            'CTF_USER': 'user'
        }
        
        logger.info(f"Force logout completed for user {user['email']} from {request.client.host}")
        
        return {
            'success': True,
            'token': token,
            'session_token': session_token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'username': user['name'],
                'email': user['email'],
                'score': user['score'] or 0,
                'role': role_map.get(user['role_type'], 'user'),
                'role_type': user['role_type'],
                'avatar_url': user['avatar_url']
            }
        }


@api_router.post("/auth/logout")
async def logout(request: Request, current_user: dict = Depends(get_current_user)):
    """Logout and invalidate session"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get session token from request body or invalidate all user sessions
        try:
            body = await request.json()
            session_token = body.get('session_token')
            if session_token:
                await invalidate_session_by_token(conn, session_token)
            else:
                await invalidate_user_sessions(conn, current_user['id'])
        except:
            # If no body, invalidate all sessions
            await invalidate_user_sessions(conn, current_user['id'])
        
        return {'success': True, 'message': 'Logged out successfully'}


# Password Reset Request Model
class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


@api_router.post("/auth/password-reset/request")
async def request_password_reset(data: PasswordResetRequest):
    """Request password reset - sends email with reset link"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Find user by email
        user = await conn.fetchrow('''
            SELECT id, name, email FROM users
            WHERE LOWER(email) = LOWER($1)
        ''', data.email)
        
        # Always return success to prevent email enumeration attacks
        if not user:
            logger.info(f"Password reset requested for non-existent email: {data.email}")
            return {
                'success': True,
                'message': 'If an account exists with this email, you will receive reset instructions.'
            }
        
        # Create reset token
        token = await create_password_reset_token(conn, user['id'], user['email'])
        
        # Send email
        email_sent = send_password_reset_email(user['email'], user['name'], token)
        
        if not email_sent:
            raise HTTPException(
                status_code=500,
                detail="Failed to send reset email. Please try again later."
            )
        
        logger.info(f"Password reset requested for user {user['email']}")
        
        return {
            'success': True,
            'message': 'If an account exists with this email, you will receive reset instructions.'
        }


@api_router.get("/auth/password-reset/verify")
async def verify_password_reset_token(token: str):
    """Verify if a password reset token is valid"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        result = await verify_reset_token(conn, token)
        
        if not result:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset link. Please request a new one."
            )
        
        return {
            'valid': True,
            'email': result['email'][:3] + '***@' + result['email'].split('@')[1]
        }


@api_router.post("/auth/password-reset/confirm")
async def confirm_password_reset(data: PasswordResetConfirm):
    """Confirm password reset with token and new password"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Verify token
        token_data = await verify_reset_token(conn, data.token)
        
        if not token_data:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset link. Please request a new one."
            )
        
        # Hash new password with Argon2 (LMS format)
        ph = argon2.PasswordHasher()
        hashed_password = ph.hash(data.new_password)
        
        # Update password
        await conn.execute('''
            UPDATE users SET password = $1 WHERE id::text = $2
        ''', hashed_password, token_data['user_id'])
        
        # Consume token
        await consume_reset_token(conn, data.token)
        
        # Invalidate all sessions for this user (security)
        await invalidate_user_sessions(conn, token_data['user_id'])
        
        logger.info(f"Password reset completed for user {token_data['email']}")
        
        return {
            'success': True,
            'message': 'Password has been reset successfully. Please log in with your new password.'
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
        old_avatar = await conn.fetchval('SELECT avatar_url FROM users WHERE id::text = $1', current_user['id'])
        
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
            await conn.execute('UPDATE users SET avatar_url = $1 WHERE id::text = $2', avatar_url, current_user['id'])
            
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
                FROM users WHERE id::text = $1
            ''', current_user['id'])
        except Exception:
            # Some columns don't exist, try simpler query
            try:
                user = await conn.fetchrow('''
                    SELECT avatar_url, avatar FROM users WHERE id::text = $1
                ''', current_user['id'])
            except Exception:
                user = await conn.fetchrow('''
                    SELECT avatar_url FROM users WHERE id::text = $1
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
        
        await conn.execute('UPDATE users SET avatar_url = $1 WHERE id::text = $2', new_avatar, current_user['id'])
        
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
                            'UPDATE users SET avatar_url = COALESCE(avatar_url, $1), github_avatar = $1, "updatedAt" = NOW() WHERE id::text = $2',
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
                            WHERE id::text = $3
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
                    WHERE u.id::text = $1
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
                            'UPDATE users SET avatar_url = COALESCE(avatar_url, $1), google_avatar = $1, "updatedAt" = NOW() WHERE id::text = $2',
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
                            WHERE id::text = $3
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
                    WHERE u.id::text = $1
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
            c.points, c."dockerImage", c.hints, c.questions, c.solves, c."isPublished", c.tags, c."hasDocker",
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
            # Parse hints (include text since hints are free)
            hints = []
            if ch.get('hints'):
                hint_data = json.loads(ch['hints']) if isinstance(ch['hints'], str) else ch['hints']
                hints = [{'text': h.get('text', ''), 'cost': 0} for h in hint_data]
            
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
                'has_docker': ch.get('hasDocker', False),
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
                   points, "dockerImage", hints, questions, solves, flag, tags,
                   "hasDocker", "challengePackId", "isMultiContainer", author
            FROM ctf_public_challenges
            WHERE (id::text = $1 OR slug = $1) AND "isPublished" = true
        ''', challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
            
        # Use the actual UUID for subsequent queries
        challenge_id = str(challenge['id'])
        
        # Get user progress
        progress = await conn.fetchrow('''
            SELECT solved, "hintsUsed", "solvedQuestions", "scoreEarned"
            FROM ctf_public_progress
            WHERE "userId"::text = $1 AND "challengeId" = $2
        ''', current_user['id'], challenge_id)
        
        # Parse hints (always include text since hints are free)
        hints_data = json.loads(challenge['hints']) if isinstance(challenge['hints'], str) else (challenge['hints'] or [])
        hints_used = list(progress['hintsUsed']) if progress else []  # Keep for user_progress
        hints = []
        for i, h in enumerate(hints_data):
            hints.append({'index': i, 'text': h.get('text', ''), 'cost': 0})
        
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
            'author': challenge.get('author'),  # Challenge author/builder
            'difficulty': challenge['difficulty'].lower() if challenge['difficulty'] else 'medium',
            'points': challenge['points'],
            'docker_image': challenge['dockerImage'],
            'has_docker': challenge.get('hasDocker', False),
            'challenge_pack_id': challenge.get('challengePackId'),
            'is_multi_container': challenge.get('isMultiContainer', False),
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
        # Get challenge (slug support)
        challenge = await conn.fetchrow('''
            SELECT id, flag, points, hints 
            FROM ctf_public_challenges 
            WHERE id::text = $1 OR slug = $1
        ''', submission.challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
            
        # Use canonical UUID
        challenge_id = str(challenge['id'])
        
        # Get current progress
        progress = await conn.fetchrow('''
            SELECT id, solved, "hintsUsed", "scoreEarned"
            FROM ctf_public_progress
            WHERE "userId"::text = $1 AND "challengeId" = $2
        ''', current_user['id'], challenge_id)
        
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
                WHERE id::text = $2
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
            WHERE id::text = $2
        ''', points_earned, current_user['id'])
        
        # Update solve count
        await conn.execute('''
            UPDATE ctf_public_challenges SET solves = solves + 1, "updatedAt" = NOW()
            WHERE id::text = $1
        ''', challenge_id)
        
        return {'correct': True, 'message': 'Correct flag!', 'points': points_earned}


@api_router.post("/submit-question")
async def submit_question(submission: QuestionSubmit, current_user: dict = Depends(get_current_user)):
    """Submit a question answer for multi-question challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get challenge (slug support)
        challenge = await conn.fetchrow('''
            SELECT id, questions, points 
            FROM ctf_public_challenges 
            WHERE id::text = $1 OR slug = $1
        ''', submission.challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
            
        challenge_id = str(challenge['id'])
        questions = json.loads(challenge['questions']) if isinstance(challenge['questions'], str) else (challenge['questions'] or [])
        if submission.question_index >= len(questions):
            raise HTTPException(status_code=400, detail="Invalid question index")
        
        question = questions[submission.question_index]
        
        # Get or create progress
        progress = await conn.fetchrow('''
            SELECT id, "solvedQuestions", "scoreEarned"
            FROM ctf_public_progress
            WHERE "userId"::text = $1 AND "challengeId" = $2
        ''', current_user['id'], challenge_id)
        
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
        
        # Challenge is only complete when ALL questions are answered
        all_questions_solved = len(solved_questions) >= len(questions)
        is_first_solve = len(solved_questions) == 1
        
        if progress:
            if all_questions_solved:
                # All questions solved - mark challenge as complete
                await conn.execute('''
                    UPDATE ctf_public_progress SET
                        solved = true, "solvedQuestions" = $1, "scoreEarned" = $2, 
                        "solvedAt" = NOW(), "updatedAt" = NOW()
                    WHERE id::text = $3
                ''', solved_questions, total_earned, progress['id'])
            else:
                # Not all questions solved yet - just update score and questions
                await conn.execute('''
                    UPDATE ctf_public_progress SET
                        "solvedQuestions" = $1, "scoreEarned" = $2, "updatedAt" = NOW()
                    WHERE id::text = $3
                ''', solved_questions, total_earned, progress['id'])
        else:
            # New progress record - only mark solved if all questions answered (unlikely on first)
            await conn.execute('''
                INSERT INTO ctf_public_progress (
                    id, "userId", "challengeId", solved, "hintsUsed",
                    "solvedQuestions", "scoreEarned", "solvedAt", "createdAt", "updatedAt"
                ) VALUES ($1, $2, $3, $4, '{}', $5, $6, CASE WHEN $4 THEN NOW() ELSE NULL END, NOW(), NOW())
            ''', generate_uuid(), current_user['id'], challenge_id, 
                 all_questions_solved, solved_questions, total_earned)
        
        # Update user score
        await conn.execute('''
            UPDATE users SET "ctfScore" = "ctfScore" + $1, "updatedAt" = NOW()
            WHERE id::text = $2
        ''', points_earned, current_user['id'])
        
        # Update solve count only when ALL questions are solved (challenge complete)
        if all_questions_solved and (not progress or not progress.get('solved', False)):
            await conn.execute('''
                UPDATE ctf_public_challenges SET solves = solves + 1, "updatedAt" = NOW()
                WHERE id::text = $1
            ''', challenge_id)
        
        # Auto-destroy Nexus instance on challenge completion
        if all_questions_solved:
            asyncio.create_task(
                _auto_destroy_nexus_session(str(current_user['id']), challenge_id)
            )
        
        return {
            'correct': True, 
            'message': 'Correct!', 
            'points': points_earned,
            'challenge_complete': all_questions_solved
        }


async def _auto_destroy_nexus_session(user_id: str, challenge_id: str) -> None:
    """
    Background task: terminate the Nexus session for a user/challenge pair
    when all questions are solved. Fire-and-forget - errors are logged, not raised.
    """
    session_id = None

    # 1. Check in-memory cache first
    if user_id in nexus_sessions and challenge_id in nexus_sessions[user_id]:
        session_id = nexus_sessions[user_id][challenge_id]
        logger.info(f"[AUTO-DESTROY] Found session {session_id} in cache for user {user_id}")

    # 2. Fall back to DB if not in cache
    if not session_id:
        try:
            pool = await Database.get_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow('''
                    SELECT session_id FROM nexus_usage
                    WHERE user_id = $1 AND challenge_id = $2 AND status = 'running'
                    ORDER BY started_at DESC LIMIT 1
                ''', user_id, challenge_id)
                if row:
                    session_id = row['session_id']
                    logger.info(f"[AUTO-DESTROY] Found session {session_id} in DB for user {user_id}")
        except Exception as e:
            logger.error(f"[AUTO-DESTROY] DB lookup failed for user {user_id}: {e}")

    if not session_id:
        logger.info(f"[AUTO-DESTROY] No active session found for user {user_id}, challenge {challenge_id} - skipping")
        return

    # 3. Terminate the session via Nexus Engine
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}",
                timeout=30.0
            )
            if resp.status_code in [200, 404]:
                logger.info(f"[AUTO-DESTROY] Session {session_id} terminated (status={resp.status_code})")
            else:
                logger.warning(f"[AUTO-DESTROY] Unexpected status {resp.status_code} for session {session_id}: {resp.text}")
    except Exception as e:
        logger.error(f"[AUTO-DESTROY] Failed to call Nexus for session {session_id}: {e}")
        return  # Don't clean up cache/DB if Nexus call failed

    # 4. Update nexus_usage to 'completed'
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            await conn.execute('''
                UPDATE nexus_usage SET
                    ended_at = NOW(),
                    status = 'completed',
                    pod_seconds = GREATEST(60, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER),
                    estimated_cost = GREATEST(0.0001, (EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600.0) * 0.045)
                WHERE session_id = $1 AND status = 'running'
            ''', session_id)
            logger.info(f"[AUTO-DESTROY] nexus_usage marked 'completed' for session {session_id}")
    except Exception as e:
        logger.warning(f"[AUTO-DESTROY] Failed to update nexus_usage for session {session_id}: {e}")

    # 5. Remove from in-memory cache
    if user_id in nexus_sessions and challenge_id in nexus_sessions.get(user_id, {}):
        del nexus_sessions[user_id][challenge_id]
        logger.info(f"[AUTO-DESTROY] Removed session {session_id} from nexus_sessions cache")


# ===========================================
# PUBLIC CTF: HINTS
# ===========================================

@api_router.post("/hints")
async def unlock_hint(hint_request: HintRequest, current_user: dict = Depends(get_current_user)):
    """Unlock a hint for a public challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get challenge (slug support)
        challenge = await conn.fetchrow('''
            SELECT id, hints 
            FROM ctf_public_challenges 
            WHERE id::text = $1 OR slug = $1
        ''', hint_request.challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
            
        challenge_id = str(challenge['id'])
        hints = json.loads(challenge['hints']) if isinstance(challenge['hints'], str) else (challenge['hints'] or [])
        if hint_request.hint_index >= len(hints):
            raise HTTPException(status_code=404, detail="Hint not found")
        
        hint = hints[hint_request.hint_index]
        
        # Get or create progress
        progress = await conn.fetchrow('''
            SELECT id, "hintsUsed" FROM ctf_public_progress
            WHERE "userId"::text = $1 AND "challengeId" = $2
        ''', current_user['id'], challenge_id)
        
        hints_used = list(progress['hintsUsed']) if progress else []
        
        # Already unlocked?
        if hint_request.hint_index in hints_used:
            return {'hint': hint, 'already_unlocked': True, 'cost': 0}
        
        hints_used.append(hint_request.hint_index)
        
        if progress:
            await conn.execute('''
                UPDATE ctf_public_progress SET "hintsUsed" = $1, "updatedAt" = NOW()
                WHERE id::text = $2
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
                    COALESCE(SUM(cp."scoreEarned"), 0) as score
                FROM users u
                LEFT JOIN ctf_public_progress cp ON u.id = cp."userId" 
                    AND cp."solvedAt" >= NOW() - INTERVAL '{interval}'
                    AND cp.solved = true
                GROUP BY u.id, u.name, u.email, u.avatar_url
                HAVING COALESCE(SUM(cp."scoreEarned"), 0) > 0
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
                (SELECT COUNT(*) FROM ctf_public_progress WHERE "userId"::text = $1 AND solved = true) as solved_count,
                (SELECT COALESCE(SUM("scoreEarned"), 0) FROM ctf_public_progress WHERE "userId"::text = $1) as total_points,
                (SELECT COUNT(*) + 1 FROM users WHERE "ctfScore" > (SELECT "ctfScore" FROM users WHERE id::text = $1)) as rank,
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
            WHERE "userId"::text = $1 
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
            FROM users WHERE id::text = $1
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
            FROM ctf_public_progress WHERE "userId"::text = $1
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
            WHERE "userId"::text = $1 
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
        await conn.execute('DELETE FROM ctf_categories WHERE id::text = $1', category_id)
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
        # Check for duplicate title to prevent double-click issues
        existing = await conn.fetchrow('''
            SELECT id FROM ctf_public_challenges WHERE lower(title) = lower($1)
        ''', data.title)
        if existing:
            raise HTTPException(status_code=409, detail=f"A challenge with the title '{data.title}' already exists")
        
        challenge_id = generate_uuid()
        
        hints = [{'text': h.text, 'cost': h.cost} for h in data.hints]
        questions = [{'question': q.question, 'flag': q.flag, 'points': q.points} for q in data.questions]
        
        await conn.execute('''
            INSERT INTO ctf_public_challenges (
                id, "categoryId", title, slug, description, difficulty, points,
                flag, "dockerImage", "dockerCommand", hints, questions,
                "isPublished", solves, "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, NOW(), NOW())
        ''', challenge_id, data.category_id, data.title, slugify(data.title), data.description,
             data.difficulty, data.points, data.flag,
             data.docker_image, None,  # dockerCommand is deprecated
             json.dumps(hints), json.dumps(questions), data.is_published)
        
        return {'id': challenge_id}



@api_router.delete("/admin/public-challenges/{challenge_id}")
async def admin_delete_public_challenge(challenge_id: str, admin: dict = Depends(require_admin)):
    """Delete a public challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM ctf_public_challenges WHERE id::text = $1', challenge_id)
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
# ADMIN: CERTIFICATION EXAMS
# ===========================================

async def validate_certification_pool(challenge_ids: List[str], conn) -> tuple:
    """
    Validate that a pool has exactly 7 challenges totaling 120 points.
    Returns (is_valid, error_message, total_points, challenges_details)
    """
    if len(challenge_ids) != 7:
        return False, f"Pool must have exactly 7 challenges (has {len(challenge_ids)})", 0, []

    # Fetch challenges - use text[]::uuid[] cast chain so asyncpg can pass str list safely
    challenges = await conn.fetch('''
        SELECT c.id, c.title, c.difficulty, cat.name as category
        FROM ctf_public_challenges c
        LEFT JOIN ctf_categories cat ON c."categoryId" = cat.id
        WHERE c.id::text = ANY($1)
    ''', challenge_ids)
    
    if len(challenges) != 7:
        found_ids = {str(c['id']) for c in challenges}
        missing = [cid for cid in challenge_ids if cid not in found_ids]
        return False, f"Some challenges not found: {missing}", 0, []
    
    # Calculate total points and verify difficulty
    total_points = 0
    details = []
    for c in challenges:
        difficulty = c['difficulty'].upper() if c['difficulty'] else 'MEDIUM'
        if difficulty not in CERTIFICATION_DIFFICULTY_POINTS:
            return False, f"Challenge '{c['title']}' has invalid difficulty '{difficulty}' (only EASY, MEDIUM, HARD allowed)", 0, []
        
        points = CERTIFICATION_DIFFICULTY_POINTS[difficulty]
        total_points += points
        details.append({
            'id': str(c['id']),
            'title': c['title'],
            'difficulty': difficulty,
            'category': c['category'] or 'Uncategorized',
            'points': points
        })
    
    if total_points != 120:
        return False, f"Pool must total 120 points (has {total_points})", total_points, details
    
    return True, "", total_points, details


@api_router.get("/admin/certification-exams/available-challenges")
async def admin_get_available_certification_challenges(admin: dict = Depends(require_admin)):
    """
    Get all CTF challenges available for certification exam pools.
    Only returns EASY, MEDIUM, HARD challenges (EXPERT excluded).
    Grouped by difficulty with certification points.
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        challenges = await conn.fetch('''
            SELECT c.id::text, c.title, c.difficulty::text as difficulty, c.points as original_points,
                   c."isPublished" as is_published,
                   cat.id::text as category_id, cat.name as category
            FROM ctf_public_challenges c
            LEFT JOIN ctf_categories cat ON c."categoryId" = cat.id
            WHERE UPPER(c.difficulty::text) IN ('EASY', 'MEDIUM', 'HARD')

            UNION ALL

            SELECT ch.id::text, ch.title, ch.difficulty::text as difficulty, ch.points as original_points,
                   ch."isPublished" as is_published,
                   NULL as category_id, m.name as category
            FROM ctf_challenges ch
            LEFT JOIN ctf_modules m ON ch."ctfModuleId" = m.id
            WHERE UPPER(ch.difficulty::text) IN ('EASY', 'MEDIUM', 'HARD')

            ORDER BY difficulty, title
        ''')
        
        result = {
            'easy': [],
            'medium': [],
            'hard': []
        }
        
        print(f"[DEBUG] admin_get_available_certification_challenges: Total rows from DB: {len(challenges)}")
        
        seen_ids = set()
        for c in challenges:
            challenge_id = str(c['id'])
            if challenge_id in seen_ids:
                continue
            seen_ids.add(challenge_id)
            difficulty = c['difficulty'].upper() if c['difficulty'] else 'MEDIUM'
            cert_points = CERTIFICATION_DIFFICULTY_POINTS.get(difficulty, 20)
            
            challenge_data = {
                'id': challenge_id,
                'title': c['title'],
                'category': c['category'] or 'Uncategorized',
                'category_id': str(c['category_id']) if c['category_id'] else None,
                'difficulty': difficulty,
                'points': cert_points,  # Certification points
                'original_points': c['original_points'],  # Challenge's own points
                'is_published': bool(c['is_published'])
            }
            
            print(f"[DEBUG] Challenge: id={challenge_id}, title={c['title']}, difficulty={difficulty}, is_published={c['is_published']}")
            
            result[difficulty.lower()].append(challenge_data)
        
        print(f"[DEBUG] Result counts: easy={len(result['easy'])}, medium={len(result['medium'])}, hard={len(result['hard'])}")
        
        return result


@api_router.get("/admin/certification-exams/lms-final-exams")
async def admin_get_lms_final_exams(admin: dict = Depends(require_admin)):
    """
    Get all LMS Final Exams available for linking to certification exams.
    Shows which ones are already linked.
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        exams = await conn.fetch('''
            SELECT fe.id, fe.title, fe.description, fe."isPublished" as is_published,
                   c.title as course_title, c.id as course_id,
                   CASE WHEN cec.id IS NOT NULL THEN true ELSE false END as has_certification,
                   cec.id as certification_config_id, cec.name as certification_name
            FROM final_exams fe
            LEFT JOIN courses c ON fe."courseId" = c.id
            LEFT JOIN certification_exam_configs cec ON fe.id = cec."lmsFinalExamId"
            ORDER BY fe."createdAt" DESC
        ''')
        
        return {
            'final_exams': [{
            'id': str(e['id']),
            'title': e['title'],
            'description': e['description'],
            'is_published': e['is_published'],
            'course_title': e['course_title'],
            'course_id': str(e['course_id']) if e['course_id'] else None,
            'has_certification': e['has_certification'],
            'certification_config_id': str(e['certification_config_id']) if e['certification_config_id'] else None,
            'certification_name': e['certification_name']
        } for e in exams]
        }


@api_router.post("/admin/certification-exams")
async def admin_create_certification_exam(data: CertificationExamConfigCreate, admin: dict = Depends(require_admin)):
    """
    Create a new certification exam configuration with 3 pools.
    Each pool must have exactly 7 challenges totaling 120 points.
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Check if LMS final exam exists (pass str, cast to uuid in SQL)
        lms_exam = await conn.fetchrow(
            'SELECT id, title FROM final_exams WHERE id::text = $1',
            data.lms_final_exam_id
        )
        if not lms_exam:
            raise HTTPException(status_code=404, detail="LMS Final Exam not found")
        
        # Check if already linked
        existing = await conn.fetchrow(
            'SELECT id FROM certification_exam_configs WHERE "lmsFinalExamId"::text = $1',
            data.lms_final_exam_id
        )
        if existing:
            raise HTTPException(status_code=409, detail="This LMS Final Exam already has a certification exam configuration")
        
        # Validate Pool A
        valid_a, error_a, points_a, details_a = await validate_certification_pool(data.pool_a_challenge_ids, conn)
        if not valid_a:
            raise HTTPException(status_code=400, detail=f"Pool A validation failed: {error_a}")
        
        # Validate Pool B
        valid_b, error_b, points_b, details_b = await validate_certification_pool(data.pool_b_challenge_ids, conn)
        if not valid_b:
            raise HTTPException(status_code=400, detail=f"Pool B validation failed: {error_b}")
        
        # Validate Pool C
        valid_c, error_c, points_c, details_c = await validate_certification_pool(data.pool_c_challenge_ids, conn)
        if not valid_c:
            raise HTTPException(status_code=400, detail=f"Pool C validation failed: {error_c}")
        
        # Create the exam config
        config_id = generate_uuid()
        await conn.execute('''
            INSERT INTO certification_exam_configs (
                id, name, "examType", "lmsFinalExamId",
                "poolAChallengeIds", "poolBChallengeIds", "poolCChallengeIds",
                "totalLabPoints", "globalDurationHours", "ctfDurationHours", "reportDurationHours",
                "mcqWeight", "labWeight", "reportWeight",
                "passThreshold", "labMinThreshold", "reportMinThreshold", "labUnlockReportThreshold",
                "associateMin", "professionalMin", "eliteMin",
                "isPublished", "createdById", "createdAt", "updatedAt"
            ) VALUES (
                $1, $2, 'ZXCPPT', $3,
                $4, $5, $6,
                120, $7, $8, $9,
                0.30, 0.50, 0.20,
                70.00, 60.00, 60.00, 80.00,
                70.00, 80.00, 90.00,
                false, $10, NOW(), NOW()
            )
        ''', config_id, data.name, data.lms_final_exam_id,
             data.pool_a_challenge_ids, data.pool_b_challenge_ids, data.pool_c_challenge_ids,
             data.global_duration_hours, data.ctf_duration_hours, data.report_duration_hours,
             admin['id'])
        
        return {
            'id': config_id,
            'message': 'Certification exam created successfully',
            'pools': {
                'A': {'challenges': len(details_a), 'points': points_a},
                'B': {'challenges': len(details_b), 'points': points_b},
                'C': {'challenges': len(details_c), 'points': points_c}
            }
        }


@api_router.get("/admin/certification-exams")
async def admin_list_certification_exams(admin: dict = Depends(require_admin)):
    """List all certification exam configurations"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        configs = await conn.fetch('''
            SELECT cec.*, fe.title as lms_exam_title, u.name as created_by_name,
                   (SELECT COUNT(*) FROM certification_exam_attempts cea WHERE cea."examConfigId" = cec.id) as attempt_count,
                   (SELECT COUNT(*) FROM certification_exam_attempts cea WHERE cea."examConfigId" = cec.id AND cea.status NOT IN ('MCQ_COMPLETED')) as active_attempt_count
            FROM certification_exam_configs cec
            LEFT JOIN final_exams fe ON cec."lmsFinalExamId" = fe.id
            LEFT JOIN users u ON cec."createdById" = u.id
            ORDER BY cec."createdAt" DESC
        ''')
        
        return [{
            'id': str(c['id']),
            'name': c['name'],
            'exam_type': c['examType'],
            'lms_final_exam_id': str(c['lmsFinalExamId']),
            'lms_exam_title': c['lms_exam_title'],
            'total_lab_points': c['totalLabPoints'],
            'global_duration_hours': c['globalDurationHours'],
            'ctf_duration_hours': c['ctfDurationHours'],
            'report_duration_hours': c['reportDurationHours'],
            'is_published': c['isPublished'],
            'attempt_count': c['attempt_count'],
            'active_attempt_count': c['active_attempt_count'],
            'created_by': c['created_by_name'],
            'created_at': c['createdAt'].isoformat() if c['createdAt'] else None,
            'updated_at': c['updatedAt'].isoformat() if c['updatedAt'] else None
        } for c in configs]


@api_router.get("/admin/certification-exams/{config_id}")
async def admin_get_certification_exam(config_id: str, admin: dict = Depends(require_admin)):
    """Get detailed certification exam configuration with pool challenges"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        config = await conn.fetchrow('''
            SELECT cec.*, fe.title as lms_exam_title
            FROM certification_exam_configs cec
            LEFT JOIN final_exams fe ON cec."lmsFinalExamId" = fe.id
            WHERE cec.id::text = $1
        ''', config_id)
        
        if not config:
            raise HTTPException(status_code=404, detail="Certification exam not found")
        
        # Fetch challenge details for each pool
        async def get_pool_details(challenge_ids):
            if not challenge_ids:
                return []
            challenges = await conn.fetch('''
                SELECT c.id, c.title, c.difficulty, cat.name as category
                FROM ctf_public_challenges c
                LEFT JOIN ctf_categories cat ON c."categoryId" = cat.id
                WHERE c.id::text = ANY($1)
            ''', challenge_ids)
            
            # Maintain order from pool
            id_to_challenge = {str(c['id']): c for c in challenges}
            result = []
            for cid in challenge_ids:
                c = id_to_challenge.get(cid)
                if c:
                    difficulty = c['difficulty'].upper() if c['difficulty'] else 'MEDIUM'
                    result.append({
                        'id': str(c['id']),
                        'challenge_id': str(c['id']),  # alias for frontend compatibility
                        'title': c['title'],
                        'difficulty': difficulty,
                        'category': c['category'] or 'Uncategorized',
                        'points': CERTIFICATION_DIFFICULTY_POINTS.get(difficulty, 20)
                    })
            return result
        
        pool_a = await get_pool_details(config['poolAChallengeIds'])
        pool_b = await get_pool_details(config['poolBChallengeIds'])
        pool_c = await get_pool_details(config['poolCChallengeIds'])
        
        # Get attempt statistics
        stats = await conn.fetchrow('''
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'GRADED' AND passed = true) as passed,
                COUNT(*) FILTER (WHERE status = 'GRADED' AND passed = false) as failed,
                COUNT(*) FILTER (WHERE status NOT IN ('GRADED', 'EXPIRED')) as in_progress,
                COUNT(*) FILTER (WHERE "assignedPool" = 'A') as pool_a_count,
                COUNT(*) FILTER (WHERE "assignedPool" = 'B') as pool_b_count,
                COUNT(*) FILTER (WHERE "assignedPool" = 'C') as pool_c_count
            FROM certification_exam_attempts
            WHERE "examConfigId"::text = $1
        ''', config_id)
        
        return {
            'id': str(config['id']),
            'name': config['name'],
            'exam_type': config['examType'],
            'lms_final_exam_id': str(config['lmsFinalExamId']),
            'lms_exam_title': config['lms_exam_title'],
            'pool_a_challenge_ids': config['poolAChallengeIds'],
            'pool_b_challenge_ids': config['poolBChallengeIds'],
            'pool_c_challenge_ids': config['poolCChallengeIds'],
            'pool_a_challenges': pool_a,
            'pool_b_challenges': pool_b,
            'pool_c_challenges': pool_c,
            'pool_a': pool_a,
            'pool_b': pool_b,
            'pool_c': pool_c,
            'total_lab_points': config['totalLabPoints'],
            'global_duration_hours': config['globalDurationHours'],
            'ctf_duration_hours': config['ctfDurationHours'],
            'report_duration_hours': config['reportDurationHours'],
            'mcq_weight': float(config['mcqWeight']),
            'lab_weight': float(config['labWeight']),
            'report_weight': float(config['reportWeight']),
            'pass_threshold': float(config['passThreshold']),
            'lab_min_threshold': float(config['labMinThreshold']),
            'report_min_threshold': float(config['reportMinThreshold']),
            'lab_unlock_report_threshold': float(config['labUnlockReportThreshold']),
            'associate_min': float(config['associateMin']),
            'professional_min': float(config['professionalMin']),
            'elite_min': float(config['eliteMin']),
            'is_published': config['isPublished'],
            'created_at': config['createdAt'].isoformat() if config['createdAt'] else None,
            'updated_at': config['updatedAt'].isoformat() if config['updatedAt'] else None,
            'total_attempts': stats['total'],
            'passed_attempts': stats['passed'],
            'statistics': {
                'total_attempts': stats['total'],
                'passed': stats['passed'],
                'failed': stats['failed'],
                'in_progress': stats['in_progress'],
                'pool_distribution': {
                    'A': stats['pool_a_count'],
                    'B': stats['pool_b_count'],
                    'C': stats['pool_c_count']
                }
            }
        }


@api_router.put("/admin/certification-exams/{config_id}")
async def admin_update_certification_exam(config_id: str, data: CertificationExamConfigUpdate, admin: dict = Depends(require_admin)):
    """Update certification exam configuration (only if no attempts exist)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Check if exam exists
        config = await conn.fetchrow('SELECT * FROM certification_exam_configs WHERE id::text = $1', config_id)
        if not config:
            raise HTTPException(status_code=404, detail="Certification exam not found")
        
        # Admins can always edit exam configs
        
        # Build update query dynamically
        updates = []
        params = []
        param_idx = 1
        
        if data.name is not None:
            updates.append(f'name = ${param_idx}')
            params.append(data.name)
            param_idx += 1
        
        if data.pool_a_challenge_ids is not None:
            valid, error, _, _ = await validate_certification_pool(data.pool_a_challenge_ids, conn)
            if not valid:
                raise HTTPException(status_code=400, detail=f"Pool A validation failed: {error}")
            updates.append(f'"poolAChallengeIds" = ${param_idx}')
            params.append(data.pool_a_challenge_ids)
            param_idx += 1
        
        if data.pool_b_challenge_ids is not None:
            valid, error, _, _ = await validate_certification_pool(data.pool_b_challenge_ids, conn)
            if not valid:
                raise HTTPException(status_code=400, detail=f"Pool B validation failed: {error}")
            updates.append(f'"poolBChallengeIds" = ${param_idx}')
            params.append(data.pool_b_challenge_ids)
            param_idx += 1
        
        if data.pool_c_challenge_ids is not None:
            valid, error, _, _ = await validate_certification_pool(data.pool_c_challenge_ids, conn)
            if not valid:
                raise HTTPException(status_code=400, detail=f"Pool C validation failed: {error}")
            updates.append(f'"poolCChallengeIds" = ${param_idx}')
            params.append(data.pool_c_challenge_ids)
            param_idx += 1
        
        if data.global_duration_hours is not None:
            updates.append(f'"globalDurationHours" = ${param_idx}')
            params.append(data.global_duration_hours)
            param_idx += 1
        
        if data.ctf_duration_hours is not None:
            updates.append(f'"ctfDurationHours" = ${param_idx}')
            params.append(data.ctf_duration_hours)
            param_idx += 1
        
        if data.report_duration_hours is not None:
            updates.append(f'"reportDurationHours" = ${param_idx}')
            params.append(data.report_duration_hours)
            param_idx += 1
        
        if not updates:
            return {'message': 'No changes provided'}
        
        updates.append(f'"updatedAt" = NOW()')
        params.append(config_id)
        
        query = f'UPDATE certification_exam_configs SET {", ".join(updates)} WHERE id = ${param_idx}'
        await conn.execute(query, *params)
        
        return {'message': 'Certification exam updated successfully'}


@api_router.delete("/admin/certification-exams/{config_id}")
async def admin_delete_certification_exam(config_id: str, admin: dict = Depends(require_admin)):
    """Delete certification exam configuration (only if no attempts exist)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Check if exam exists
        config = await conn.fetchrow('SELECT id FROM certification_exam_configs WHERE id::text = $1', config_id)
        if not config:
            raise HTTPException(status_code=404, detail="Certification exam not found")
        
        # Check if there are any attempts
        attempt_count = await conn.fetchval(
            'SELECT COUNT(*) FROM certification_exam_attempts WHERE "examConfigId"::text = $1',
            config_id
        )
        if attempt_count > 0:
            raise HTTPException(status_code=400, detail=f"Cannot delete exam with {attempt_count} existing attempts")
        
        await conn.execute('DELETE FROM certification_exam_configs WHERE id::text = $1', config_id)
        return {'message': 'Certification exam deleted successfully'}


@api_router.put("/admin/certification-exams/{config_id}/publish")
async def admin_publish_certification_exam(config_id: str, admin: dict = Depends(require_admin)):
    """Publish or unpublish a certification exam"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        config = await conn.fetchrow('SELECT id, "isPublished" FROM certification_exam_configs WHERE id::text = $1', config_id)
        if not config:
            raise HTTPException(status_code=404, detail="Certification exam not found")
        
        new_status = not config['isPublished']
        await conn.execute(
            'UPDATE certification_exam_configs SET "isPublished" = $1, "updatedAt" = NOW() WHERE id::text = $2',
            new_status, config_id
        )
        
        return {
            'message': f'Certification exam {"published" if new_status else "unpublished"} successfully',
            'is_published': new_status
        }


@api_router.get("/admin/certification-exams/{config_id}/attempts")
async def admin_list_certification_attempts(
    config_id: str,
    status: Optional[str] = None,
    pool_filter: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """List all student attempts for a certification exam"""
    db_pool = await Database.get_pool()
    async with db_pool.acquire() as conn:
        # Verify exam exists
        config = await conn.fetchrow('SELECT id FROM certification_exam_configs WHERE id::text = $1', config_id)
        if not config:
            raise HTTPException(status_code=404, detail="Certification exam not found")
        
        # Build query with optional filters
        query = '''
            SELECT cea.*, u.name as student_name, u.email as student_email
            FROM certification_exam_attempts cea
            JOIN users u ON cea."userId" = u.id
            WHERE cea."examConfigId"::text = $1
        '''
        params = [config_id]
        param_idx = 2
        
        if status:
            query += f' AND cea.status = ${param_idx}'
            params.append(status.upper())
            param_idx += 1
        
        if pool_filter:
            query += f' AND cea."assignedPool" = ${param_idx}'
            params.append(pool_filter.upper())
            param_idx += 1
        
        query += ' ORDER BY cea."redeemedAt" DESC'
        
        attempts = await conn.fetch(query, *params)
        
        return [{
            'id': str(a['id']),
            'user_id': str(a['userId']),
            'student_name': a['student_name'] or 'Unknown',
            'student_email': a['student_email'],
            'assigned_pool': a['assignedPool'],
            'status': a['status'],
            'mcq_score': float(a['mcqScore']) if a['mcqScore'] else None,
            'mcq_correct': a['mcqCorrect'],
            'mcq_wrong': a['mcqWrong'],
            'mcq_total': a['mcqTotal'],
            'lab_score': float(a['labScore']) if a['labScore'] else None,
            'lab_points_earned': a['labPointsEarned'],
            'lab_total_points': a['labTotalPoints'],
            'report_score': float(a['reportTotalScore']) if a['reportTotalScore'] else None,
            'final_score': float(a['finalScore']) if a['finalScore'] else None,
            'passed': a['passed'],
            'certification_level': a['certificationLevel'],
            'redeemed_at': a['redeemedAt'].isoformat() if a['redeemedAt'] else None,
            'global_expires_at': a['globalExpiresAt'].isoformat() if a['globalExpiresAt'] else None,
            'lab_started_at': a['labStartedAt'].isoformat() if a['labStartedAt'] else None,
            'lab_expires_at': a['labExpiresAt'].isoformat() if a['labExpiresAt'] else None,
            'lab_completed_at': a['labCompletedAt'].isoformat() if a['labCompletedAt'] else None,
            'report_unlocked_at': a['reportUnlockedAt'].isoformat() if a['reportUnlockedAt'] else None,
            'report_uploaded_at': a['reportUploadedAt'].isoformat() if a['reportUploadedAt'] else None,
            'report_graded_at': a['reportGradedAt'].isoformat() if a['reportGradedAt'] else None
        } for a in attempts]


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
            WHERE id::text = $4
        ''', data.name, data.description, data.icon, category_id)
        return {'success': True}


@api_router.delete("/admin/categories/{category_id}")
async def admin_remove_category(category_id: str, admin: dict = Depends(require_admin)):
    """Delete a category"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM ctf_categories WHERE id::text = $1', category_id)
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
            WHERE u.id::text = $1
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
                UPDATE users SET "isLocked" = $1, "isActive" = $2, "updatedAt" = NOW() WHERE id::text = $3
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
                    UPDATE users SET "roleId" = $1, "updatedAt" = NOW() WHERE id::text = $2
                ''', role_row['id'], user_id)
        
        return {'success': True}


@api_router.post("/admin/users/{user_id}/reset-progress")
async def admin_reset_user_progress(user_id: str, admin: dict = Depends(require_admin)):
    """Reset user's CTF progress"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Delete public progress
        await conn.execute('DELETE FROM ctf_public_progress WHERE "userId"::text = $1', user_id)
        
        # Reset score
        await conn.execute('''
            UPDATE users SET "ctfScore" = 0, "updatedAt" = NOW() WHERE id::text = $1
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
            WHERE u.id::text = $1
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
        await conn.execute('DELETE FROM users WHERE id::text = $1', user_id)
        
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
            ports = c.get('ports') or []
            if isinstance(ports, str):
                ports = json.loads(ports)
            
            # Calculate total points (base + questions)
            question_points = sum(q.get('points', 25) for q in (questions or []))
            total_points = c['points'] + question_points
            
            result.append({
                'id': c['id'],
                'category_id': c['categoryId'],
                'title': c['title'],
                'description': c['description'],
                'author': c.get('author'),  # Challenge author/builder
                'difficulty': c['difficulty'].lower() if c['difficulty'] else 'medium',
                'points': c['points'],
                'total_points': total_points,  # Base + question points
                'flag': c['flag'],
                'docker_image': c['dockerImage'],
                'hints': hints or [],
                'questions': questions or [],
                'tags': tags or [],
                'ports': ports or [],
                'is_published': c['isPublished'],
                'solves': c['solves'],
                # Multi-container pack support
                'has_docker': c.get('hasDocker', bool(c['dockerImage'])),
                'challenge_pack_id': c.get('challengePackId'),
                'is_multi_container': c.get('isMultiContainer', False)
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
        ports = data.ports if data.ports else []
        
        # Determine if this has a docker/lab environment
        has_docker = bool(data.docker_image or data.challenge_pack_id or data.has_docker)
        
        await conn.execute('''
            INSERT INTO ctf_public_challenges (
                id, "categoryId", title, description, difficulty, points,
                flag, author, "dockerImage", "dockerCommand", hints, questions,
                tags, ports, "isPublished", solves, "createdAt", "updatedAt",
                "hasDocker", "challengePackId", "isMultiContainer"
            ) VALUES ($1, $2, $3, $4, $5::"CtfDifficulty", $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0, NOW(), NOW(), $16, $17, $18)
        ''', challenge_id, data.category_id, data.title, data.description,
             data.difficulty.upper(), data.points, data.flag, data.author,
             data.docker_image, None,  # dockerCommand deprecated
             json.dumps(hints), json.dumps(questions), json.dumps(tags), json.dumps(ports), data.is_published,
             has_docker, data.challenge_pack_id, data.is_multi_container)
        
        return {'id': challenge_id}


@api_router.put("/admin/challenges/{challenge_id}")
async def admin_update_challenge(challenge_id: str, data: PublicChallengeCreate, admin: dict = Depends(require_admin)):
    """Update a challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        hints = [{'text': h.text, 'cost': h.cost} for h in data.hints]
        questions = [{'question': q.question, 'flag': q.flag, 'points': q.points} for q in data.questions]
        tags = data.tags if data.tags else []
        ports = data.ports if data.ports else []
        # Determine if this has a docker/lab environment
        has_docker = bool(data.docker_image or data.challenge_pack_id or data.has_docker)
        
        await conn.execute('''
            UPDATE ctf_public_challenges SET
                "categoryId" = $1, title = $2, description = $3, difficulty = $4::"CtfDifficulty",
                points = $5, flag = $6, author = $7, "dockerImage" = $8, "dockerCommand" = $9,
                hints = $10, questions = $11, tags = $12, ports = $13, "isPublished" = $14,
                "hasDocker" = $15, "challengePackId" = $16, "isMultiContainer" = $17,
                "updatedAt" = NOW()
            WHERE id::text = $18
        ''', data.category_id, data.title, data.description, data.difficulty.upper(),
             data.points, data.flag, data.author, data.docker_image, None,  # dockerCommand deprecated
             json.dumps(hints), json.dumps(questions), json.dumps(tags), json.dumps(ports), data.is_published,
             has_docker, data.challenge_pack_id, data.is_multi_container, challenge_id)
        
        return {'success': True}


@api_router.delete("/admin/challenges/{challenge_id}")
async def admin_delete_challenge(challenge_id: str, admin: dict = Depends(require_admin)):
    """Delete a challenge"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM ctf_public_challenges WHERE id::text = $1', challenge_id)
        return {'success': True}


# ===========================================
# DOCKERFILE & DOCKER COMPOSE PORT ANALYSIS
# ===========================================

def parse_expose_from_dockerfile(dockerfile_content: str) -> List[int]:
    """Parse EXPOSE statements from a Dockerfile"""
    import re
    ports = []
    # Match EXPOSE 22 80 443 or EXPOSE 22/tcp 80/udp patterns
    expose_pattern = r'EXPOSE\s+([\d\s/tcp/udp]+)'
    for match in re.finditer(expose_pattern, dockerfile_content, re.IGNORECASE):
        port_str = match.group(1)
        # Extract just the port numbers
        for port_match in re.findall(r'(\d+)', port_str):
            port = int(port_match)
            if 1 <= port <= 65535 and port not in ports:
                ports.append(port)
    return ports


def parse_ports_from_docker_compose(compose_content: str) -> List[int]:
    """
    Parse ports from a docker-compose.yml file.
    Handles various port formats:
      - "80"
      - "80:80"
      - "12222:22"
      - "$PORT:80"
      - "8080-8090:8080-8090"
    Returns the INTERNAL port (right side of mapping) for K8s exposure.
    """
    import re
    import yaml
    
    ports = []
    
    try:
        # Parse YAML
        compose_data = yaml.safe_load(compose_content)
        if not compose_data:
            return ports
        
        # Get services (support both docker-compose v2 and v3)
        services = compose_data.get('services', {})
        
        for service_name, service_config in services.items():
            if not isinstance(service_config, dict):
                continue
            
            # Get ports for this service
            service_ports = service_config.get('ports', [])
            
            for port_spec in service_ports:
                if isinstance(port_spec, int):
                    # Simple port number
                    if 1 <= port_spec <= 65535 and port_spec not in ports:
                        ports.append(port_spec)
                elif isinstance(port_spec, str):
                    # Port mapping string like "8080:80" or "80"
                    # Remove any protocol suffix like /tcp or /udp
                    port_str = port_spec.split('/')[0]
                    
                    # Handle variable substitution like $PORT:80
                    port_str = re.sub(r'\$\{?[A-Za-z_][A-Za-z0-9_]*\}?', '0', port_str)
                    
                    if ':' in port_str:
                        # Host:Container format - we want the container port (internal)
                        parts = port_str.split(':')
                        try:
                            # Get the internal port (last part)
                            internal = parts[-1]
                            # Handle range like 8080-8090
                            if '-' in internal:
                                range_parts = internal.split('-')
                                start_port = int(range_parts[0])
                                end_port = int(range_parts[1])
                                for p in range(start_port, min(end_port + 1, start_port + 10)):  # Limit range
                                    if 1 <= p <= 65535 and p not in ports:
                                        ports.append(p)
                            else:
                                port = int(internal)
                                if 1 <= port <= 65535 and port not in ports:
                                    ports.append(port)
                        except (ValueError, IndexError):
                            pass
                    else:
                        # Single port
                        try:
                            if '-' in port_str:
                                range_parts = port_str.split('-')
                                start_port = int(range_parts[0])
                                if 1 <= start_port <= 65535 and start_port not in ports:
                                    ports.append(start_port)
                            else:
                                port = int(port_str)
                                if 1 <= port <= 65535 and port not in ports:
                                    ports.append(port)
                        except ValueError:
                            pass
                            
            # Also check for 'expose' directive (internal ports)
            exposed_ports = service_config.get('expose', [])
            for port_spec in exposed_ports:
                try:
                    port = int(str(port_spec).split('/')[0])
                    if 1 <= port <= 65535 and port not in ports:
                        ports.append(port)
                except ValueError:
                    pass
    
    except yaml.YAMLError as e:
        logger.warning(f"Failed to parse docker-compose.yml: {e}")
    except Exception as e:
        logger.warning(f"Error parsing compose ports: {e}")
    
    return ports


def detect_all_ports_from_zip(zip_file_contents: dict) -> tuple[List[int], dict]:
    """
    Comprehensive port detection from a ZIP containing Docker files.
    
    Args:
        zip_file_contents: Dict with keys like 'dockerfile_content', 
                          'docker_compose_content', 'dockerfiles' (list of contents)
    
    Returns:
        Tuple of (merged_ports, detection_info)
    """
    all_ports = []
    detection_info = {
        'sources': [],
        'details': {}
    }
    
    # 1. Parse main Dockerfile
    if zip_file_contents.get('dockerfile_content'):
        dockerfile_ports = parse_expose_from_dockerfile(zip_file_contents['dockerfile_content'])
        if dockerfile_ports:
            for p in dockerfile_ports:
                if p not in all_ports:
                    all_ports.append(p)
            detection_info['sources'].append('Dockerfile')
            detection_info['details']['dockerfile'] = dockerfile_ports
    
    # 2. Parse docker-compose.yml
    if zip_file_contents.get('docker_compose_content'):
        compose_ports = parse_ports_from_docker_compose(zip_file_contents['docker_compose_content'])
        if compose_ports:
            for p in compose_ports:
                if p not in all_ports:
                    all_ports.append(p)
            detection_info['sources'].append('docker-compose.yml')
            detection_info['details']['docker_compose'] = compose_ports
    
    # 3. Parse additional Dockerfiles (for multi-service compose with Dockerfile builds)
    additional_dockerfiles = zip_file_contents.get('additional_dockerfiles', {})
    for path, content in additional_dockerfiles.items():
        df_ports = parse_expose_from_dockerfile(content)
        if df_ports:
            for p in df_ports:
                if p not in all_ports:
                    all_ports.append(p)
            source_name = f"Dockerfile ({path})"
            detection_info['sources'].append(source_name)
            detection_info['details'][path] = df_ports
    
    # Sort ports for consistent display
    all_ports.sort()
    
    return all_ports, detection_info


@api_router.post("/admin/analyze-ports")
async def analyze_dockerfile_ports(
    dockerfile_content: Optional[str] = None,
    image_url: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """
    Analyze a Dockerfile or image to extract EXPOSE ports.
    Returns list of detected ports for admin to select from.
    """
    ports = []
    source = "none"
    
    # Method 1: Parse Dockerfile content if provided
    if dockerfile_content:
        ports = parse_expose_from_dockerfile(dockerfile_content)
        source = "dockerfile"
    
    # Method 2: Try common port defaults if no ports found
    if not ports and image_url:
        # Common port presets based on image name
        image_lower = image_url.lower() if image_url else ""
        if 'nginx' in image_lower or 'apache' in image_lower or 'httpd' in image_lower:
            ports = [80, 443]
        elif 'ssh' in image_lower or 'ubuntu' in image_lower or 'debian' in image_lower:
            ports = [22]
        elif 'node' in image_lower or 'express' in image_lower:
            ports = [3000]
        elif 'python' in image_lower or 'flask' in image_lower or 'django' in image_lower:
            ports = [8000]
        elif 'mysql' in image_lower or 'mariadb' in image_lower:
            ports = [3306]
        elif 'postgres' in image_lower:
            ports = [5432]
        elif 'redis' in image_lower:
            ports = [6379]
        elif 'mongo' in image_lower:
            ports = [27017]
        source = "image_heuristic" if ports else "none"
    
    # Fallback: Common CTF ports
    if not ports:
        ports = [22, 80, 443, 3000, 8080]
        source = "defaults"
    
    return {
        "ports": ports,
        "source": source,
        "common_ports": {
            22: "SSH",
            80: "HTTP",
            443: "HTTPS",
            3000: "Node.js/React",
            3306: "MySQL",
            5432: "PostgreSQL",
            6379: "Redis",
            8000: "Python/Django",
            8080: "Alt HTTP",
            8443: "Alt HTTPS",
            27017: "MongoDB"
        }
    }


# ===========================================
# ZIP FILE PREVIEW
# ===========================================

@api_router.post("/admin/preview-zip")
async def preview_zip_contents(
    file: UploadFile = File(...),
    admin: dict = Depends(require_admin)
):
    """
    Preview the contents of a ZIP file.
    - Shows only ROOT level files/folders
    - Scans all subdirectories for Dockerfiles (for docker-compose builds)
    - Combines ports from docker-compose.yml AND all Dockerfiles
    """
    import io
    import yaml
    
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
    
    try:
        # Read file into memory
        content = await file.read()
        
        # Check size (max 100MB for preview)
        if len(content) > 100 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="ZIP file too large (max 100MB)")
        
        # Parse ZIP
        zip_buffer = io.BytesIO(content)
        with zipfile.ZipFile(zip_buffer, 'r') as zf:
            # Collect all file info
            all_files = []
            root_files = []  # Only root-level files/folders
            dockerfile_content = None  # Root Dockerfile
            docker_compose_content = None
            additional_dockerfiles = {}  # Subdirectory Dockerfiles: {path: content}
            
            # Determine if ZIP has a wrapper folder (common when zipping a folder)
            all_names = [info.filename for info in zf.infolist()]
            wrapper_prefix = ""
            if all_names:
                # Check if all files share a common top-level folder
                first_parts = [n.split('/')[0] for n in all_names if '/' in n]
                if first_parts and len(set(first_parts)) == 1:
                    # All files are in a single folder - treat its contents as root
                    wrapper_prefix = first_parts[0] + "/"
            
            for info in zf.infolist():
                # Skip Mac OS metadata
                if '__MACOSX' in info.filename or info.filename.startswith('.'):
                    continue
                
                # Normalize path (remove wrapper folder if present)
                normalized_name = info.filename
                if wrapper_prefix and normalized_name.startswith(wrapper_prefix):
                    normalized_name = normalized_name[len(wrapper_prefix):]
                
                if not normalized_name:
                    continue
                
                file_entry = {
                    "name": normalized_name,
                    "original_path": info.filename,
                    "size": info.file_size,
                    "compressed_size": info.compress_size,
                    "is_dir": info.is_dir()
                }
                all_files.append(file_entry)
                
                # Check if this is a root-level item
                # Root level means no '/' in the normalized name (or only trailing '/')
                path_parts = normalized_name.rstrip('/').split('/')
                if len(path_parts) == 1:
                    root_files.append(file_entry)
                
                # Check for ROOT Dockerfile
                if normalized_name.lower() in ['dockerfile', 'dockerfile/']:
                    try:
                        dockerfile_content = zf.read(info.filename).decode('utf-8')
                    except:
                        pass
                
                # Check for ANY Dockerfile in subdirectories (for docker-compose builds)
                basename = normalized_name.rstrip('/').split('/')[-1].lower()
                if basename == 'dockerfile' and normalized_name.lower() not in ['dockerfile', 'dockerfile/']:
                    try:
                        df_content = zf.read(info.filename).decode('utf-8')
                        # Store with the directory path for reference
                        dir_path = '/'.join(normalized_name.split('/')[:-1])
                        additional_dockerfiles[dir_path] = df_content
                    except:
                        pass
                
                # Check for docker-compose.yml (at root or one level deep)
                if (normalized_name.lower() in ['docker-compose.yml', 'docker-compose.yaml'] or 
                    normalized_name.lower().endswith('/docker-compose.yml') or
                    normalized_name.lower().endswith('/docker-compose.yaml')):
                    try:
                        docker_compose_content = zf.read(info.filename).decode('utf-8')
                    except:
                        pass
            
            # ==========================================
            # COMPREHENSIVE PORT DETECTION
            # ==========================================
            zip_contents = {
                'dockerfile_content': dockerfile_content,
                'docker_compose_content': docker_compose_content,
                'additional_dockerfiles': additional_dockerfiles
            }
            
            detected_ports, port_detection_info = detect_all_ports_from_zip(zip_contents)
            
            return {
                "filename": file.filename,
                "total_files": len(all_files),
                "total_size": sum(f["size"] for f in all_files),
                "files": root_files,  # Only show root-level files!
                "all_files_count": len(all_files),
                "has_dockerfile": dockerfile_content is not None,
                "has_docker_compose": docker_compose_content is not None,
                "dockerfile_content": dockerfile_content,
                "docker_compose_content": docker_compose_content,
                "additional_dockerfiles": list(additional_dockerfiles.keys()),  # Show paths where extra Dockerfiles found
                "detected_ports": detected_ports,
                "port_detection_info": port_detection_info,  # Details on where ports came from
                "has_wrapper_folder": bool(wrapper_prefix),
                "wrapper_folder": wrapper_prefix.rstrip('/') if wrapper_prefix else None
            }
    
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")
    except Exception as e:
        logger.error(f"Error previewing ZIP: {e}")
        raise HTTPException(status_code=500, detail="Failed to preview ZIP file")


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
            SELECT a.id, a.filename, a.file_size, a.mime_type, a.created_at 
            FROM ctf_challenge_artifacts a
            JOIN ctf_public_challenges c ON a.challenge_id::text = c.id::text
            WHERE c.id::text = $1
            ORDER BY a.created_at DESC
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
        row = await conn.fetchrow('SELECT file_path FROM ctf_challenge_artifacts WHERE id::text = $1', uuid.UUID(artifact_id))
        if not row:
            raise HTTPException(status_code=404, detail="Artifact not found")
        
        file_path = Path(row['file_path'])
        if file_path.exists():
            file_path.unlink()
            
        await conn.execute('DELETE FROM ctf_challenge_artifacts WHERE id::text = $1', uuid.UUID(artifact_id))
        return {"success": True}

@api_router.get("/artifacts/download/{artifact_id}")
async def download_artifact(artifact_id: str):
    """Download an artifact"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow('SELECT file_path, filename, mime_type FROM ctf_challenge_artifacts WHERE id::text = $1', uuid.UUID(artifact_id))
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


@api_router.post("/admin/challenges/{challenge_id}/artifacts/from-github")
async def import_artifact_from_github(
    challenge_id: str,
    repo: str = Form(...),        # e.g., "owner/repo"
    path: str = Form(...),        # e.g., "challenges/web/files/flag.txt"
    branch: str = Form("main"),   # e.g., "main" or "master"
    admin: dict = Depends(require_admin)
):
    """Import an artifact from a GitHub repository"""
    import mimetypes
    
    # Get GitHub token from admin_settings or env
    github_token = os.environ.get('GITHUB_TOKEN', '')
    if not github_token:
        try:
            pool = await Database.get_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT value FROM admin_settings WHERE key = 'github_token'"
                )
                if row:
                    github_token = row['value']
        except:
            pass
    
    if not github_token:
        raise HTTPException(status_code=400, detail="GitHub token not configured. Connect GitHub in Image Registry first.")
    
    # Construct raw GitHub URL
    raw_url = f"https://raw.githubusercontent.com/{repo}/{branch}/{path}"
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                raw_url,
                headers={
                    "Authorization": f"Bearer {github_token}",
                    "Accept": "application/vnd.github.v3.raw"
                },
                timeout=60.0,
                follow_redirects=True
            )
            
            if resp.status_code == 404:
                raise HTTPException(status_code=404, detail=f"File not found: {path} in {repo}/{branch}")
            elif resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"GitHub error: {resp.status_code}")
            
            content = resp.content
            file_size = len(content)
            
            # 300MB limit
            if file_size > 300 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="File too large. Maximum size is 300MB.")
            
            # Extract filename from path
            filename = path.split('/')[-1]
            clean_filename = "".join(c for c in filename if c.isalnum() or c in "._- ").strip()
            if not clean_filename:
                clean_filename = "artifact_" + str(uuid.uuid4())[:8]
            
            artifact_id = uuid.uuid4()
            storage_name = f"{artifact_id}_{clean_filename}"
            file_path = ROOT_DIR / "uploads" / "artifacts" / storage_name
            
            # Ensure directory exists
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, "wb") as f:
                f.write(content)
            
            mime_type, _ = mimetypes.guess_type(clean_filename)
            
            pool = await Database.get_pool()
            async with pool.acquire() as conn:
                await conn.execute('''
                    INSERT INTO ctf_challenge_artifacts (id, challenge_id, filename, file_path, file_size, mime_type)
                    VALUES ($1, $2, $3, $4, $5, $6)
                ''', artifact_id, challenge_id, clean_filename, str(file_path), file_size, mime_type)
            
            logger.info(f"Imported artifact from GitHub: {repo}/{path} -> {clean_filename}")
            
            return {
                "success": True,
                "id": str(artifact_id),
                "filename": clean_filename,
                "size": file_size,
                "source": f"github:{repo}/{path}"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub artifact import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")



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


@api_router.post("/admin/preview-zip")
async def preview_zip_contents(file: UploadFile, admin: dict = Depends(require_admin)):
    """
    Preview contents of a ZIP file without processing.
    Returns file list, detected Dockerfiles, compose files, and ports.
    """
    import re
    import tempfile
    import zipfile
    
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are allowed")
    
    # Save to temp file
    temp_path = Path(tempfile.mktemp(suffix='.zip'))
    try:
        content = await file.read()
        temp_path.write_bytes(content)
        
        with zipfile.ZipFile(temp_path, 'r') as zf:
            all_files = zf.namelist()
            
            # Build file info list
            files = []
            total_size = 0
            for name in all_files[:100]:  # Limit to first 100 entries
                info = zf.getinfo(name)
                is_dir = name.endswith('/')
                files.append({
                    'name': name,
                    'size': info.file_size,
                    'is_dir': is_dir
                })
                total_size += info.file_size
            
            # Detect Dockerfile and docker-compose
            has_dockerfile = False
            has_docker_compose = False
            dockerfile_content = None
            docker_compose_content = None
            additional_dockerfiles = []
            
            # Check for wrapper folder (common pattern: zip contains single folder with all files)
            wrapper_folder = None
            if len(all_files) > 0:
                first_parts = set()
                for f in all_files:
                    parts = f.split('/')
                    if parts[0]:
                        first_parts.add(parts[0])
                if len(first_parts) == 1:
                    wrapper_folder = list(first_parts)[0]
            
            # Find Dockerfile and compose files
            for name in all_files:
                basename = name.split('/')[-1].lower()
                if basename == 'dockerfile':
                    if not has_dockerfile:
                        has_dockerfile = True
                        try:
                            dockerfile_content = zf.read(name).decode('utf-8', errors='ignore')[:5000]
                        except:
                            pass
                    else:
                        additional_dockerfiles.append(name)
                elif basename in ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']:
                    if not has_docker_compose:
                        has_docker_compose = True
                        try:
                            docker_compose_content = zf.read(name).decode('utf-8', errors='ignore')[:5000]
                        except:
                            pass
            
            # Detect ports from Dockerfile and compose
            detected_ports = set()
            port_sources = []
            port_details = {}
            
            if dockerfile_content:
                # EXPOSE instructions
                for match in re.findall(r'EXPOSE\s+(\d+)', dockerfile_content, re.IGNORECASE):
                    detected_ports.add(int(match))
                if detected_ports:
                    port_sources.append('Dockerfile EXPOSE')
                    port_details['dockerfile'] = list(detected_ports)
            
            if docker_compose_content:
                # ports: - "8080:80" or - 3000
                compose_ports = set()
                for match in re.findall(r'["\']?(\d+):(\d+)["\']?', docker_compose_content):
                    compose_ports.add(int(match[0]))  # Host port
                for match in re.findall(r'^\s*-\s*["\']?(\d+)["\']?\s*$', docker_compose_content, re.MULTILINE):
                    compose_ports.add(int(match))
                if compose_ports:
                    detected_ports.update(compose_ports)
                    port_sources.append('docker-compose ports')
                    port_details['compose'] = list(compose_ports)
            
            return {
                'files': files,
                'total_files': len(files),
                'all_files_count': len(all_files),
                'total_size': total_size,
                'has_dockerfile': has_dockerfile,
                'has_docker_compose': has_docker_compose,
                'dockerfile_content': dockerfile_content,
                'docker_compose_content': docker_compose_content,
                'detected_ports': sorted(list(detected_ports)),
                'port_detection_info': {
                    'sources': port_sources,
                    'details': port_details
                },
                'additional_dockerfiles': additional_dockerfiles if additional_dockerfiles else None,
                'has_wrapper_folder': wrapper_folder is not None,
                'wrapper_folder': wrapper_folder
            }
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")
    except Exception as e:
        logger.error(f"ZIP preview error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to preview ZIP: {str(e)}")
    finally:
        if temp_path.exists():
            temp_path.unlink()


@api_router.get("/admin/docker-images")
async def list_docker_images(admin: dict = Depends(require_admin)):
    """
    List available Docker images from GHCR and challenge database.
    Returns images that can be used for challenges.
    Only shows database images if they still exist in GHCR.
    """
    images = []
    ghcr_images = set()  # Track GHCR images for validation
    db_images = []  # Store DB images to validate later
    
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
                db_images.append({
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

    ghcr_api_success = False  # Track if we successfully queried GHCR API
    
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
                    ghcr_api_success = True  # API call succeeded!
                    packages = resp.json()
                    logger.info(f"Found {len(packages)} GHCR packages")
                    
                    for pkg in packages:
                        owner = pkg.get('owner', {}).get('login', ghcr_username)
                        image_url = f"ghcr.io/{owner.lower()}/{pkg['name'].lower()}:latest"
                        
                        # Track this image as existing in GHCR
                        ghcr_images.add(image_url.lower())
                        
                        # Add to images list
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
    
    # 3. Only add database images if they exist in GHCR (prevents showing deleted images)
    for db_img in db_images:
        image_lower = db_img['image'].lower()
        # Check if this image exists in GHCR
        if image_lower in ghcr_images:
            # Don't add duplicate - it's already in the list from GHCR
            # But mark the GHCR entry as "In Use" if a challenge uses it
            for img in images:
                if img['image'].lower() == image_lower and img['source'] == 'ghcr':
                    img['in_use'] = True
                    img['used_by'] = db_img['label']
                    break
        elif not ghcr_api_success:
            # GHCR API call failed - show all DB images with warning
            db_img['warning'] = 'Cannot verify - GHCR not connected'
            if not any(img['image'].lower() == image_lower for img in images):
                images.append(db_img)
        else:
            # GHCR API succeeded but image not found - it was deleted
            # Add it with orphan warning so admin can clean it up
            db_img['warning'] = 'Deleted from GHCR - Orphaned'
            db_img['is_orphaned'] = True
            if not any(img['image'].lower() == image_lower for img in images):
                images.append(db_img)
    
    logger.info(f"Returning {len(images)} total images (GHCR API success: {ghcr_api_success})")
    
    # 4. Also fetch Challenge Packs (multi-container bundles)
    packs = []
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            pack_rows = await conn.fetch('''
                SELECT id, pack_name, display_name, images, combined_ports, created_at
                FROM challenge_packs
                ORDER BY created_at DESC
                LIMIT 50
            ''')
            for row in pack_rows:
                packs.append({
                    'id': str(row['id']),
                    'pack_name': row['pack_name'],
                    'display_name': row['display_name'],
                    'images': row['images'] if isinstance(row['images'], list) else json.loads(row['images']),
                    'combined_ports': row['combined_ports'] if isinstance(row['combined_ports'], list) else json.loads(row['combined_ports']),
                    'is_multi_container': True,
                    'created_at': row['created_at'].isoformat() if row['created_at'] else None
                })
    except Exception as e:
        logger.warning(f"Could not fetch challenge packs: {e}")
    
    return {
        'images': images,
        'packs': packs,
        'ghcr_connected': ghcr_api_success,
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
# GitHub Admin API - Browse repos and build from folders
# =============================================================================

@api_router.get("/admin/github/status")
async def admin_github_status(admin: dict = Depends(require_admin)):
    """Check if admin has GitHub connected via GHCR token"""
    # Use GHCR token to check GitHub access
    ghcr_token = os.environ.get('GHCR_TOKEN', '')
    ghcr_username = os.environ.get('GHCR_USERNAME', '')
    
    # Also try to get from database
    if not ghcr_token or not ghcr_username:
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
        except:
            pass
    
    if not ghcr_token:
        return {'connected': False, 'username': None}
    
    # Verify token works with GitHub API
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {ghcr_token}",
                    "Accept": "application/vnd.github+json"
                },
                timeout=10.0
            )
            if resp.status_code == 200:
                user_data = resp.json()
                return {
                    'connected': True,
                    'username': user_data.get('login', ghcr_username)
                }
    except:
        pass
    
    return {'connected': bool(ghcr_token), 'username': ghcr_username}


@api_router.get("/admin/github/repos")
async def admin_github_repos(admin: dict = Depends(require_admin)):
    """List admin's GitHub repositories"""
    ghcr_token = await get_ghcr_token()
    
    if not ghcr_token:
        raise HTTPException(status_code=400, detail="GitHub not connected. Configure GHCR first.")
    
    try:
        async with httpx.AsyncClient() as client:
            # Get all repos the user has access to
            resp = await client.get(
                "https://api.github.com/user/repos",
                params={
                    'sort': 'updated',
                    'direction': 'desc',
                    'per_page': 50,
                    'type': 'all'  # Include private repos
                },
                headers={
                    "Authorization": f"Bearer {ghcr_token}",
                    "Accept": "application/vnd.github+json"
                },
                timeout=15.0
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Failed to fetch repos")
            
            repos = resp.json()
            return {
                'repos': [
                    {
                        'name': r['name'],
                        'full_name': r['full_name'],
                        'html_url': r['html_url'],
                        'description': r.get('description'),
                        'private': r['private'],
                        'updated_at': r.get('updated_at')
                    }
                    for r in repos
                ]
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/github/repo-contents")
async def admin_github_repo_contents(
    repo: str,
    path: str = '',
    admin: dict = Depends(require_admin)
):
    """Browse folder contents of a GitHub repository"""
    ghcr_token = await get_ghcr_token()
    
    if not ghcr_token:
        raise HTTPException(status_code=400, detail="GitHub not connected")
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://api.github.com/repos/{repo}/contents/{path}"
            resp = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {ghcr_token}",
                    "Accept": "application/vnd.github+json"
                },
                timeout=15.0
            )
            
            if resp.status_code == 404:
                raise HTTPException(status_code=404, detail="Repository or path not found")
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Failed to fetch contents")
            
            contents = resp.json()
            
            # Handle single file response
            if isinstance(contents, dict):
                contents = [contents]
            
            # Format for frontend - show directories first, then files
            formatted = []
            for item in contents:
                formatted.append({
                    'name': item['name'],
                    'path': item['path'],
                    'type': item['type'],  # 'dir' or 'file'
                    'size': item.get('size', 0)
                })
            
            # Sort: directories first, then files
            formatted.sort(key=lambda x: (x['type'] != 'dir', x['name'].lower()))
            
            return {'contents': formatted, 'path': path}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/github/preview-folder")
async def admin_github_preview_folder(
    repo: str,
    path: str,
    admin: dict = Depends(require_admin)
):
    """Preview a folder to see if it has Dockerfile or docker-compose.yml"""
    ghcr_token = await get_ghcr_token()
    
    if not ghcr_token:
        raise HTTPException(status_code=400, detail="GitHub not connected")
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://api.github.com/repos/{repo}/contents/{path}"
            resp = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {ghcr_token}",
                    "Accept": "application/vnd.github+json"
                },
                timeout=15.0
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Failed to fetch folder")
            
            contents = resp.json()
            if isinstance(contents, dict):
                contents = [contents]
            
            # Check for Dockerfile and docker-compose.yml
            files = [item['name'] for item in contents]
            has_dockerfile = 'Dockerfile' in files or 'dockerfile' in files
            has_compose = any(f.lower() in ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'] 
                            for f in files)
            
            # Get subdirectories (potential multi-service setup)
            subdirs = [item['name'] for item in contents if item['type'] == 'dir']
            
            return {
                'has_dockerfile': has_dockerfile,
                'has_compose': has_compose,
                'files': files,
                'subdirectories': subdirs,
                'can_build': has_dockerfile or has_compose
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_ghcr_token():
    """Helper to get GHCR token from env or database"""
    token = os.environ.get('GHCR_TOKEN', '')
    if token:
        return token
    
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT value FROM admin_settings WHERE key = 'ghcr_token'"
            )
            if row:
                return row['value']
    except:
        pass
    return None


@api_router.post("/admin/images/build-from-github")
async def build_image_from_github(
    data: dict,
    admin: dict = Depends(require_admin)
):
    """Clone a GitHub folder and build Docker image from it"""
    import re  # Required for sanitizing image names
    import yaml  # Required for parsing docker-compose.yml
    
    repo = data.get('repo')  # e.g., 'username/repo-name'
    path = data.get('path', '')  # folder path in repo
    image_name = data.get('image_name', '')
    
    if not repo or not image_name:
        raise HTTPException(status_code=400, detail="Repository and image name required")
    
    ghcr_token = await get_ghcr_token()
    ghcr_username = os.environ.get('GHCR_USERNAME', '')
    
    # Get username from database if not in env
    if not ghcr_username:
        try:
            pool = await Database.get_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT value FROM admin_settings WHERE key = 'ghcr_username'"
                )
                if row:
                    ghcr_username = row['value']
        except:
            pass
    
    if not ghcr_token or not ghcr_username:
        raise HTTPException(status_code=400, detail="GHCR not configured")
    
    # Clean image name
    clean_name = re.sub(r'[^a-z0-9-]', '-', image_name.lower().strip())[:50]
    if not clean_name:
        raise HTTPException(status_code=400, detail="Invalid image name")
    
    # Create build directory
    build_dir = Path(f"/tmp/github-builds/{clean_name}-{uuid.uuid4().hex[:8]}")
    build_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Clone the repository using git sparse checkout for efficiency
        clone_url = f"https://x-access-token:{ghcr_token}@github.com/{repo}.git"
        
        # Clone with depth 1 for speed
        clone_process = await asyncio.create_subprocess_exec(
            'git', 'clone', '--depth', '1', clone_url, str(build_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(clone_process.communicate(), timeout=120)
        
        if clone_process.returncode != 0:
            logger.error(f"Git clone failed: {stderr.decode()}")
            raise HTTPException(status_code=500, detail="Failed to clone repository")
        
        # Navigate to the specific folder
        context_dir = build_dir / path if path else build_dir
        
        if not context_dir.exists():
            raise HTTPException(status_code=404, detail=f"Path '{path}' not found in repository")
        
        # Check what build files we have
        has_docker_compose = (
            (context_dir / 'docker-compose.yml').exists() or
            (context_dir / 'docker-compose.yaml').exists() or
            (context_dir / 'compose.yml').exists() or
            (context_dir / 'compose.yaml').exists()
        )
        has_dockerfile = (context_dir / 'Dockerfile').exists()
        
        if not has_dockerfile and not has_docker_compose:
            raise HTTPException(status_code=400, detail="No Dockerfile or docker-compose.yml found in folder")
        
        # Login to GHCR
        login_process = await asyncio.create_subprocess_exec(
            'docker', 'login', 'ghcr.io', '-u', ghcr_username, '--password-stdin',
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await login_process.communicate(input=ghcr_token.encode())
        
        if has_docker_compose:
            # Build multi-container pack - similar to ZIP build
            # Read compose file
            compose_file = None
            for cf in ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']:
                if (context_dir / cf).exists():
                    compose_file = context_dir / cf
                    break
            
            compose_content = compose_file.read_text()
            compose_data = yaml.safe_load(compose_content)
            services = compose_data.get('services', {})
            
            built_images = []
            all_ports = []
            
            for service_name, service_config in services.items():
                service_build = service_config.get('build')
                service_image = service_config.get('image')
                
                if service_build:
                    # Build this service
                    if isinstance(service_build, str):
                        build_context = context_dir / service_build
                    else:
                        build_context = context_dir / service_build.get('context', '.')
                    
                    service_image_name = f"ghcr.io/{ghcr_username.lower()}/{clean_name}-{service_name}:latest"
                    
                    # Build
                    build_process = await asyncio.create_subprocess_exec(
                        'docker', 'build', '-t', service_image_name, str(build_context),
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    stdout, stderr = await asyncio.wait_for(build_process.communicate(), timeout=600)
                    
                    if build_process.returncode != 0:
                        logger.error(f"Build failed for {service_name}: {stderr.decode()}")
                        continue
                    
                    # Push
                    push_process = await asyncio.create_subprocess_exec(
                        'docker', 'push', service_image_name,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    await asyncio.wait_for(push_process.communicate(), timeout=300)
                    
                    # Get ports
                    service_ports = []
                    for port_spec in service_config.get('ports', []):
                        try:
                            if isinstance(port_spec, int):
                                service_ports.append(port_spec)
                            elif isinstance(port_spec, str):
                                parts = port_spec.split(':')
                                container_port = int(parts[-1].split('/')[0])
                                service_ports.append(container_port)
                        except:
                            pass
                    
                    built_images.append({
                        'name': service_name,
                        'image': service_image_name,
                        'ports': service_ports
                    })
                    all_ports.extend(service_ports)
            
            if not built_images:
                raise HTTPException(status_code=500, detail="No services could be built")
            
            # Store as challenge pack
            try:
                pool = await Database.get_pool()
                async with pool.acquire() as conn:
                    await conn.execute('''
                        CREATE TABLE IF NOT EXISTS challenge_packs (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            pack_name TEXT UNIQUE NOT NULL,
                            display_name TEXT NOT NULL,
                            images JSONB NOT NULL,
                            combined_ports JSONB NOT NULL,
                            compose_content TEXT,
                            is_multi_container BOOLEAN DEFAULT TRUE,
                            created_at TIMESTAMP DEFAULT NOW(),
                            updated_at TIMESTAMP DEFAULT NOW()
                        )
                    ''')
                    
                    pack_id = uuid.uuid4()
                    await conn.execute('''
                        INSERT INTO challenge_packs (id, pack_name, display_name, images, combined_ports, compose_content)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (pack_name) DO UPDATE SET
                            images = EXCLUDED.images,
                            combined_ports = EXCLUDED.combined_ports,
                            compose_content = EXCLUDED.compose_content,
                            updated_at = NOW()
                    ''', pack_id, clean_name, image_name, json.dumps(built_images), json.dumps(list(set(all_ports))), compose_content)
            except Exception as db_err:
                logger.warning(f"Could not store pack: {db_err}")
            
            return {
                'status': 'success',
                'type': 'pack',
                'pack_name': clean_name,
                'images': built_images,
                'ports': list(set(all_ports)),
                'message': f"Built {len(built_images)} service(s)"
            }
        
        else:
            # Single Dockerfile build
            image_url = f"ghcr.io/{ghcr_username.lower()}/{clean_name}:latest"
            
            # Build
            build_process = await asyncio.create_subprocess_exec(
                'docker', 'build', '-t', image_url, str(context_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(build_process.communicate(), timeout=600)
            
            if build_process.returncode != 0:
                raise HTTPException(status_code=500, detail=f"Build failed: {stderr.decode()[:500]}")
            
            # Push
            push_process = await asyncio.create_subprocess_exec(
                'docker', 'push', image_url,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await asyncio.wait_for(push_process.communicate(), timeout=300)
            
            # Detect ports from Dockerfile
            ports = []
            dockerfile_path = context_dir / 'Dockerfile'
            if dockerfile_path.exists():
                dockerfile_content = dockerfile_path.read_text()
                expose_matches = re.findall(r'EXPOSE\s+(\d+)', dockerfile_content)
                ports = [int(p) for p in expose_matches]
            
            # Store in metadata
            try:
                pool = await Database.get_pool()
                async with pool.acquire() as conn:
                    await conn.execute('''
                        INSERT INTO docker_image_metadata (image_uri, ports, created_at)
                        VALUES ($1, $2, NOW())
                        ON CONFLICT (image_uri) DO UPDATE SET ports = $2
                    ''', image_url, json.dumps(ports))
            except:
                pass
            
            return {
                'status': 'success',
                'type': 'image',
                'image_url': image_url,
                'ports': ports,
                'message': f"Built and pushed {image_url}"
            }
    
    except HTTPException:
        raise
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Build timed out")
    except Exception as e:
        logger.error(f"GitHub build failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        shutil.rmtree(build_dir, ignore_errors=True)


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
    """
    Build Docker image(s) from uploaded ZIP and push to GHCR.
    
    Supports:
    - Single Dockerfile: Builds one image
    - Docker Compose: Builds ALL service images as a "Challenge Pack"
    """
    import yaml
    
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
    
    # Clean image name (will be used as pack name for compose)
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
        
        extracted_dir = build_dir / "extracted"
        
        # Handle wrapper folder (common when zipping a folder)
        subdirs = [d for d in extracted_dir.iterdir() if d.is_dir() and not d.name.startswith('.') and d.name != '__MACOSX']
        if len(subdirs) == 1 and not (extracted_dir / "Dockerfile").exists() and not (extracted_dir / "docker-compose.yml").exists():
            # ZIP contains a single folder - use it as root
            extracted_dir = subdirs[0]
        
        # Check for docker-compose.yml
        compose_path = None
        for compose_name in ['docker-compose.yml', 'docker-compose.yaml']:
            if (extracted_dir / compose_name).exists():
                compose_path = extracted_dir / compose_name
                break
        
        if not docker_client:
            raise HTTPException(status_code=500, detail="Docker not available on server")
        
        # Login to GHCR first
        docker_client.login(
            username=ghcr_username,
            password=ghcr_token,
            registry="ghcr.io"
        )
        logger.info("Logged in to GHCR")
        
        # =====================================
        # DOCKER COMPOSE BUILD (Multi-Container)
        # =====================================
        if compose_path:
            logger.info(f"Docker Compose detected: {compose_path}")
            
            with open(compose_path, 'r') as f:
                compose_content = f.read()
                compose_data = yaml.safe_load(compose_content)
            
            services = compose_data.get('services', {})
            if not services:
                raise HTTPException(status_code=400, detail="No services found in docker-compose.yml")
            
            built_images = []
            all_ports = []
            
            for service_name, service_config in services.items():
                if not isinstance(service_config, dict):
                    continue
                
                # Determine build context
                build_config = service_config.get('build', None)
                service_image = service_config.get('image', None)
                
                if build_config:
                    # Service has a build context
                    if isinstance(build_config, str):
                        build_context = extracted_dir / build_config
                        dockerfile_name = "Dockerfile"
                    elif isinstance(build_config, dict):
                        build_context = extracted_dir / build_config.get('context', '.')
                        dockerfile_name = build_config.get('dockerfile', 'Dockerfile')
                    else:
                        continue
                    
                    # Check Dockerfile exists
                    dockerfile_path = build_context / dockerfile_name
                    if not dockerfile_path.exists():
                        logger.warning(f"Dockerfile not found for service {service_name}: {dockerfile_path}")
                        continue
                    
                    # Parse ports from Dockerfile
                    service_ports = []
                    try:
                        with open(dockerfile_path, 'r') as df:
                            service_ports = parse_expose_from_dockerfile(df.read())
                    except:
                        pass
                    
                    # Also get ports from compose service definition
                    compose_ports = service_config.get('ports', [])
                    for port_spec in compose_ports:
                        try:
                            if isinstance(port_spec, int):
                                if port_spec not in service_ports:
                                    service_ports.append(port_spec)
                            elif isinstance(port_spec, str):
                                # Parse "host:container" format
                                parts = port_spec.split(':')
                                container_port = int(parts[-1].split('/')[0])
                                if container_port not in service_ports:
                                    service_ports.append(container_port)
                        except:
                            pass
                    
                    # Build image for this service
                    service_image_name = f"ghcr.io/{ghcr_username.lower()}/{clean_name}-{service_name}:latest"
                    
                    logger.info(f"Building service '{service_name}': {service_image_name}")
                    
                    try:
                        image, build_logs = docker_client.images.build(
                            path=str(build_context),
                            dockerfile=dockerfile_name,
                            tag=service_image_name,
                            rm=True
                        )
                        
                        # Push to GHCR
                        logger.info(f"Pushing {service_image_name}")
                        docker_client.images.push(service_image_name)
                        
                        # Make public
                        try:
                            async with httpx.AsyncClient() as client:
                                pkg_name = f"{clean_name}-{service_name}"
                                await client.patch(
                                    f"https://api.github.com/user/packages/container/{pkg_name}",
                                    headers={
                                        "Authorization": f"Bearer {ghcr_token}",
                                        "Accept": "application/vnd.github+json",
                                        "X-GitHub-Api-Version": "2022-11-28"
                                    },
                                    json={"visibility": "public"},
                                    timeout=10.0
                                )
                        except:
                            pass
                        
                        built_images.append({
                            'name': service_name,  # Changed from 'service' to 'name'
                            'image': service_image_name,
                            'ports': service_ports
                        })
                        
                        for p in service_ports:
                            if p not in all_ports:
                                all_ports.append(p)
                        
                        logger.info(f"Built and pushed {service_name} with ports {service_ports}")
                        
                    except Exception as build_err:
                        logger.error(f"Failed to build service {service_name}: {build_err}")
                        # Continue with other services
                
                elif service_image:
                    # Service uses a pre-built image
                    service_ports = []
                    compose_ports = service_config.get('ports', [])
                    for port_spec in compose_ports:
                        try:
                            if isinstance(port_spec, int):
                                service_ports.append(port_spec)
                            elif isinstance(port_spec, str):
                                parts = port_spec.split(':')
                                container_port = int(parts[-1].split('/')[0])
                                if container_port not in service_ports:
                                    service_ports.append(container_port)
                        except:
                            pass
                    
                    built_images.append({
                        'name': service_name,  # Changed from 'service' to 'name'
                        'image': service_image,
                        'ports': service_ports,
                        'prebuild': True
                    })
                    
                    for p in service_ports:
                        if p not in all_ports:
                            all_ports.append(p)
            
            if not built_images:
                raise HTTPException(status_code=400, detail="No services could be built from docker-compose.yml")
            
            # Store as Challenge Pack in database
            try:
                pool = await Database.get_pool()
                async with pool.acquire() as conn:
                    # Create challenge_packs table if not exists
                    await conn.execute('''
                        CREATE TABLE IF NOT EXISTS challenge_packs (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            pack_name TEXT UNIQUE NOT NULL,
                            display_name TEXT NOT NULL,
                            images JSONB NOT NULL,
                            combined_ports JSONB NOT NULL,
                            compose_content TEXT,
                            is_multi_container BOOLEAN DEFAULT TRUE,
                            created_at TIMESTAMP DEFAULT NOW(),
                            updated_at TIMESTAMP DEFAULT NOW()
                        )
                    ''')
                    
                    pack_id = uuid.uuid4()
                    await conn.execute('''
                        INSERT INTO challenge_packs (id, pack_name, display_name, images, combined_ports, compose_content)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (pack_name) DO UPDATE SET
                            images = EXCLUDED.images,
                            combined_ports = EXCLUDED.combined_ports,
                            compose_content = EXCLUDED.compose_content,
                            updated_at = NOW()
                    ''', pack_id, clean_name, image_name, json.dumps(built_images), json.dumps(all_ports), compose_content)
                    
                    logger.info(f"Stored challenge pack '{clean_name}' with {len(built_images)} images")
            except Exception as db_error:
                logger.warning(f"Could not store challenge pack: {db_error}")
            
            # Clean up
            shutil.rmtree(build_dir, ignore_errors=True)
            
            return {
                'status': 'success',
                'type': 'pack',
                'pack_name': clean_name,
                'images': built_images,
                'ports': all_ports,
                'message': f'Challenge Pack "{clean_name}" built with {len(built_images)} container(s)!'
            }
        
        # =====================================
        # SINGLE DOCKERFILE BUILD
        # =====================================
        else:
            # Find Dockerfile
            dockerfile_path = None
            
            if (extracted_dir / "Dockerfile").exists():
                dockerfile_path = extracted_dir / "Dockerfile"
            else:
                # Check one level deep
                for subdir in extracted_dir.iterdir():
                    if subdir.is_dir() and (subdir / "Dockerfile").exists():
                        dockerfile_path = subdir / "Dockerfile"
                        extracted_dir = subdir
                        break
            
            if not dockerfile_path:
                raise HTTPException(status_code=400, detail="No Dockerfile or docker-compose.yml found in ZIP")
            
            # Parse Dockerfile for EXPOSE ports
            detected_ports = []
            dockerfile_content = ""
            try:
                with open(dockerfile_path, 'r') as df:
                    dockerfile_content = df.read()
                    detected_ports = parse_expose_from_dockerfile(dockerfile_content)
            except Exception as e:
                logger.warning(f"Could not parse Dockerfile for ports: {e}")
            
            full_image_name = f"ghcr.io/{ghcr_username.lower()}/{clean_name}:latest"
            
            logger.info(f"Building single image: {full_image_name}")
            
            try:
                image, build_logs = docker_client.images.build(
                    path=str(extracted_dir),
                    tag=full_image_name,
                    rm=True
                )
                logger.info(f"Image built successfully: {full_image_name}")
                
                # Push to GHCR
                logger.info(f"Pushing image to GHCR: {full_image_name}")
                docker_client.images.push(full_image_name)
                
                # Make public
                try:
                    async with httpx.AsyncClient() as client:
                        await client.patch(
                            f"https://api.github.com/user/packages/container/{clean_name}",
                            headers={
                                "Authorization": f"Bearer {ghcr_token}",
                                "Accept": "application/vnd.github+json",
                                "X-GitHub-Api-Version": "2022-11-28"
                            },
                            json={"visibility": "public"},
                            timeout=10.0
                        )
                except:
                    pass
                
                # Store image metadata
                try:
                    pool = await Database.get_pool()
                    async with pool.acquire() as conn:
                        await conn.execute('''
                            CREATE TABLE IF NOT EXISTS docker_image_metadata (
                                id SERIAL PRIMARY KEY,
                                image_url TEXT UNIQUE NOT NULL,
                                image_name TEXT,
                                ports JSONB DEFAULT '[]',
                                dockerfile_content TEXT,
                                created_at TIMESTAMP DEFAULT NOW(),
                                updated_at TIMESTAMP DEFAULT NOW()
                            )
                        ''')
                        
                        await conn.execute('''
                            INSERT INTO docker_image_metadata (image_url, image_name, ports, dockerfile_content)
                            VALUES ($1, $2, $3, $4)
                            ON CONFLICT (image_url) DO UPDATE SET
                                ports = EXCLUDED.ports,
                                dockerfile_content = EXCLUDED.dockerfile_content,
                                updated_at = NOW()
                        ''', full_image_name, clean_name, json.dumps(detected_ports), dockerfile_content)
                except Exception as db_error:
                    logger.warning(f"Could not store image metadata: {db_error}")
                
                # Clean up
                shutil.rmtree(build_dir, ignore_errors=True)
                
                return {
                    'status': 'success',
                    'type': 'single',
                    'image': full_image_name,
                    'ports': detected_ports,
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
    """Remove an image reference from the database (does not delete from GHCR)"""
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            # Remove from docker_image_metadata table
            await conn.execute('''
                DELETE FROM docker_image_metadata WHERE image_url ILIKE $1
            ''', f'%{image_name}%')
            
            # Count challenges still using this image
            count = await conn.fetchval('''
                SELECT COUNT(*) FROM ctf_public_challenges 
                WHERE "dockerImage" ILIKE $1
            ''', f'%{image_name}%')
            
            return {
                'success': True,
                'message': f'Image reference removed from metadata.',
                'challenges_affected': count,
                'note': 'To delete from GHCR, visit: https://github.com/settings/packages'
            }
    except Exception as e:
        logger.error(f"Failed to delete image reference: {e}")
        return {'success': False, 'message': str(e)}


@api_router.post("/admin/images/cleanup-orphans")
async def cleanup_orphaned_images(admin: dict = Depends(require_admin)):
    """Remove all orphaned image references from database that no longer exist in GHCR"""
    cleaned = []
    
    # Get GHCR credentials
    ghcr_username = os.environ.get('GHCR_USERNAME', '')
    ghcr_token = os.environ.get('GHCR_TOKEN', '')
    
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
        except:
            pass
    
    if not ghcr_token or not ghcr_username:
        return {'success': False, 'message': 'GHCR not configured. Cannot determine orphaned images.'}
    
    # Get GHCR images
    ghcr_images = set()
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.github.com/user/packages?package_type=container",
                headers={
                    "Authorization": f"Bearer {ghcr_token}",
                    "Accept": "application/vnd.github+json"
                },
                timeout=10.0
            )
            if resp.status_code == 200:
                for pkg in resp.json():
                    owner = pkg.get('owner', {}).get('login', ghcr_username)
                    image_url = f"ghcr.io/{owner.lower()}/{pkg['name'].lower()}:latest"
                    ghcr_images.add(image_url.lower())
            else:
                return {'success': False, 'message': f'GHCR API error: {resp.status_code}'}
    except Exception as e:
        return {'success': False, 'message': f'Failed to fetch GHCR images: {e}'}
    
    # Get database images and clean orphans
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            # Get all DB images
            rows = await conn.fetch('''
                SELECT DISTINCT "dockerImage" as docker_image FROM ctf_public_challenges 
                WHERE "dockerImage" IS NOT NULL AND "dockerImage" != ''
            ''')
            
            for row in rows:
                img = row['docker_image'].lower()
                if img not in ghcr_images:
                    # This is an orphan - clear it from challenges
                    await conn.execute('''
                        UPDATE ctf_public_challenges 
                        SET "dockerImage" = NULL, "hasDocker" = FALSE
                        WHERE LOWER("dockerImage") = $1
                    ''', img)
                    cleaned.append(row['docker_image'])
            
            # Also clean metadata table
            await conn.execute('''
                DELETE FROM docker_image_metadata 
                WHERE LOWER(image_url) NOT IN (SELECT unnest($1::text[]))
            ''', list(ghcr_images) if ghcr_images else [''])
            
    except Exception as e:
        logger.error(f"Cleanup error: {e}")
        return {'success': False, 'message': str(e)}
    
    return {
        'success': True,
        'cleaned_count': len(cleaned),
        'cleaned_images': cleaned,
        'ghcr_image_count': len(ghcr_images)
    }


@api_router.delete("/admin/challenge-packs/{pack_id}")
async def delete_challenge_pack(pack_id: str, admin: dict = Depends(require_admin)):
    """Delete a challenge pack by ID"""
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            # Check if pack exists
            pack = await conn.fetchrow(
                "SELECT id, pack_name, display_name FROM challenge_packs WHERE id::text = $1",
                pack_id
            )
            if not pack:
                raise HTTPException(status_code=404, detail="Challenge pack not found")
            
            # Delete the pack
            await conn.execute("DELETE FROM challenge_packs WHERE id::text = $1", pack_id)
            
            logger.info(f"Challenge pack '{pack['display_name']}' ({pack_id}) deleted by admin {admin.get('email')}")
            
            return {
                'success': True,
                'message': f"Challenge pack '{pack['display_name']}' deleted",
                'pack_name': pack['pack_name']
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete challenge pack: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/images/metadata")
async def get_image_metadata(
    image_url: str = Form(...),
    admin: dict = Depends(require_admin)
):
    """Get stored metadata for a Docker image, including detected ports"""
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            # Ensure table exists
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS docker_image_metadata (
                    id SERIAL PRIMARY KEY,
                    image_url TEXT UNIQUE NOT NULL,
                    image_name TEXT,
                    ports JSONB DEFAULT '[]',
                    dockerfile_content TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            ''')
            
            row = await conn.fetchrow('''
                SELECT image_url, image_name, ports, dockerfile_content
                FROM docker_image_metadata
                WHERE image_url = $1
            ''', image_url)
            
            if row:
                ports = row['ports']
                if isinstance(ports, str):
                    ports = json.loads(ports)
                return {
                    'found': True,
                    'image_url': row['image_url'],
                    'image_name': row['image_name'],
                    'ports': ports or [],
                    'dockerfile_content': row['dockerfile_content']
                }
            else:
                return {
                    'found': False,
                    'image_url': image_url,
                    'ports': [],
                    'message': 'No metadata found for this image. Ports need to be set manually.'
                }
    except Exception as e:
        logger.error(f"Error fetching image metadata: {e}")
        return {
            'found': False,
            'image_url': image_url,
            'ports': [],
            'message': str(e)
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
                # Images are stored at: ghcr.io/<owner>/ctf-challenges/{short-id}
                ghcr_username = os.environ.get('GHCR_USERNAME', 'zecurx')
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
                ghcr_username = os.environ.get('GHCR_USERNAME', 'zecurx')
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
                WHERE id::text = $12
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
            SELECT COUNT(*) FROM ctf_enrollments WHERE "userId"::text = $1
        ''', current_user['id'])
        
        # Get completed challenges
        completed = await conn.fetchval('''
            SELECT COUNT(*) FROM ctf_progress 
            WHERE "userId"::text = $1 AND "isCompleted" = true
        ''', current_user['id'])
        
        # Get total points
        total_points = await conn.fetchval('''
            SELECT COALESCE(SUM("pointsEarned"), 0) FROM ctf_progress 
            WHERE "userId"::text = $1
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
            WHERE "userId"::text = $1 AND "ctfCourseId" = $2
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
            WHERE id::text = $1
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
            WHERE "userId"::text = $1 AND "ctfCourseId" = $2
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
            WHERE "userId"::text = $1 AND "ctfCourseId" = $2
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
            # Parse hints (include text since hints are free)
            hints = ch_dict.get('hints')
            if hints:
                if isinstance(hints, str):
                    hints = json.loads(hints)
                ch_dict['hints'] = [{'text': h.get('text', ''), 'cost': 0} for h in hints]
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
            WHERE "userId"::text = $1 AND "ctfCourseId" = $2
        ''', current_user['id'], challenge['ctfCourseId'])
        
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled")
        
        # Get user progress
        progress = await conn.fetchrow('''
            SELECT "flagsSolved", "hintsUsed", "pointsEarned", "isCompleted"
            FROM ctf_progress
            WHERE "userId"::text = $1 AND "challengeId" = $2
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
            WHERE "userId"::text = $1 AND "ctfCourseId" = $2
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
            WHERE "userId"::text = $1 AND "challengeId" = $2
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
                WHERE id::text = $4
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
            WHERE id::text = $2
        ''', flag_points, current_user['id'])
        
        # Update solve count if first flag
        if len(flags_solved) == 1:
            await conn.execute('''
                UPDATE ctf_challenges SET "solveCount" = "solveCount" + 1
                WHERE id::text = $1
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
            WHERE "userId"::text = $1 AND "ctfCourseId" = $2
        ''', current_user['id'], challenge['ctfCourseId'])
        
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled")
        
        # Get or create progress
        progress = await conn.fetchrow('''
            SELECT id, "hintsUsed", "flagsSolved", "pointsEarned"
            FROM ctf_progress
            WHERE "userId"::text = $1 AND "challengeId" = $2
        ''', current_user['id'], challenge_id)
        
        hints_used = list(progress['hintsUsed']) if progress else []
        
        if hint_index in hints_used:
            return {'hint': hint, 'already_unlocked': True, 'cost': 0}
        
        hints_used.append(hint_index)
        
        if progress:
            await conn.execute('''
                UPDATE ctf_progress SET "hintsUsed" = $1, "updatedAt" = NOW()
                WHERE id::text = $2
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
        
        # Basic counts
        stats['total_users'] = await conn.fetchval('SELECT COUNT(*) FROM users')
        stats['total_courses'] = await conn.fetchval('SELECT COUNT(*) FROM ctf_courses')
        stats['total_modules'] = await conn.fetchval('SELECT COUNT(*) FROM ctf_modules')
        stats['total_challenges'] = await conn.fetchval('SELECT COUNT(*) FROM ctf_public_challenges WHERE "isPublished" = true')
        stats['total_enrollments'] = await conn.fetchval('SELECT COUNT(*) FROM ctf_enrollments')
        stats['completed_challenges'] = await conn.fetchval(
            'SELECT COUNT(*) FROM ctf_progress WHERE "isCompleted" = true'
        )
        
        # Categories count (from public challenges)
        stats['total_categories'] = await conn.fetchval(
            'SELECT COUNT(DISTINCT "categoryId") FROM ctf_public_challenges WHERE "isPublished" = true'
        ) or 0
        
        # Submissions stats (from public challenge progress)
        stats['total_submissions'] = await conn.fetchval(
            'SELECT COUNT(*) FROM ctf_public_progress'
        ) or 0
        stats['correct_submissions'] = await conn.fetchval(
            'SELECT COUNT(*) FROM ctf_public_progress WHERE solved = true'
        ) or 0
        
        # Top users by score (leaderboard style)
        top_users = await conn.fetch('''
            SELECT u.id, u.name as username, u.email, u."ctfScore" as score
            FROM users u
            WHERE u."ctfScore" > 0
            ORDER BY u."ctfScore" DESC
            LIMIT 5
        ''')
        stats['top_users'] = [dict(u) for u in top_users]
        
        # Recent solves (from public challenge progress)
        recent_solves = await conn.fetch('''
            SELECT p.id, p."solvedAt" as solved_at, p."scoreEarned" as score_earned,
                   u.name as username, c.title as challenge_title
            FROM ctf_public_progress p
            JOIN users u ON p."userId" = u.id
            JOIN ctf_public_challenges c ON p."challengeId" = c.id
            WHERE p.solved = true
            ORDER BY p."solvedAt" DESC NULLS LAST
            LIMIT 5
        ''')
        stats['recent_solves'] = [dict(r) for r in recent_solves]
        
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
        
        # Active containers from Nexus Engine
        try:
            nexus_url = os.getenv("NEXUS_ENGINE_URL", "http://localhost:8081")
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{nexus_url}/api/v1/admin/stats")
                if resp.status_code == 200:
                    nexus_stats = resp.json()
                    stats['active_containers'] = nexus_stats.get('active_sessions', 0)
                else:
                    stats['active_containers'] = 0
        except Exception:
            stats['active_containers'] = 0
        
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
                'SELECT id, title FROM courses WHERE id::text = $1', data.lms_course_id
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
            'SELECT "lmsCourseId" FROM ctf_courses WHERE id::text = $1', course_id
        )
        if not ctf_course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Update LMS course
        if data.name:
            await conn.execute(
                'UPDATE courses SET title = $1, "updatedAt" = NOW() WHERE id::text = $2',
                data.name, ctf_course['lmsCourseId']
            )
        if data.code:
            await conn.execute(
                'UPDATE courses SET "courseCode" = $1, slug = $2, "updatedAt" = NOW() WHERE id::text = $3',
                data.code, data.code.lower(), ctf_course['lmsCourseId']
            )
        if data.description:
            await conn.execute(
                'UPDATE courses SET description = $1, "updatedAt" = NOW() WHERE id::text = $2',
                data.description, ctf_course['lmsCourseId']
            )
        
        # Update CTF course color
        if data.color:
            await conn.execute(
                'UPDATE ctf_courses SET color = $1, "updatedAt" = NOW() WHERE id::text = $2',
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
            'SELECT "lmsCourseId" FROM ctf_courses WHERE id::text = $1', course_id
        )
        if not ctf_course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Delete CTF course (cascades to modules, challenges, etc.)
        await conn.execute('DELETE FROM ctf_courses WHERE id::text = $1', course_id)
        
        # Optionally delete LMS course too
        await conn.execute('DELETE FROM courses WHERE id::text = $1', ctf_course['lmsCourseId'])
        
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
        await conn.execute('DELETE FROM ctf_modules WHERE id::text = $1', module_id)
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
        await conn.execute('DELETE FROM ctf_challenges WHERE id::text = $1', challenge_id)
        return {'success': True}


# ===========================================
# ADMIN: MODULE QUIZ MANAGEMENT
# ===========================================

@api_router.get("/admin/lms-modules/{course_id}")
async def admin_get_lms_modules(course_id: str, admin: dict = Depends(require_admin)):
    """Get all LMS modules for a course (for quiz management)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        modules = await conn.fetch('''
            SELECT m.id, m.title, m."orderIndex", m."isPublished",
                   mq.id as quiz_id, mq.title as quiz_title, mq.is_published as quiz_published,
                   (SELECT COUNT(*) FROM module_quiz_questions WHERE quiz_id = mq.id) as question_count
            FROM modules m
            LEFT JOIN module_quizzes mq ON mq.module_id = m.id::text AND mq.is_final_quiz = FALSE
            WHERE m."courseId" = $1
            ORDER BY m."orderIndex"
        ''', course_id)
        return [dict(m) for m in modules]


@api_router.get("/admin/all-quizzes")
async def admin_get_all_quizzes(admin: dict = Depends(require_admin)):
    """Get all quizzes across all courses"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        quizzes = await conn.fetch('''
            SELECT mq.*, m.title as module_title, c.title as course_title,
                   (SELECT COUNT(*) FROM module_quiz_questions WHERE quiz_id = mq.id) as question_count
            FROM module_quizzes mq
            LEFT JOIN modules m ON m.id::text = mq.module_id
            LEFT JOIN courses c ON c.id::text = mq.course_id
            ORDER BY mq.created_at DESC
        ''')
        return [{**dict(q), 'id': str(q['id'])} for q in quizzes]


@api_router.post("/admin/modules/{module_id}/quiz")
async def admin_create_or_update_quiz(module_id: str, data: dict, admin: dict = Depends(require_admin)):
    """Create or update a module quiz"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            'SELECT id FROM module_quizzes WHERE module_id = $1 AND is_final_quiz = FALSE', module_id
        )
        if existing:
            await conn.execute('''
                UPDATE module_quizzes SET title = $1, description = $2, time_limit = $3,
                    passing_percentage = $4, is_published = $5, updated_at = NOW()
                WHERE id::text = $6
            ''', data.get('title', 'Module Quiz'), data.get('description', ''),
                data.get('time_limit', 3600), data.get('passing_percentage', 80),
                data.get('is_published', False), existing['id'])
            return {'id': str(existing['id']), 'updated': True}
        else:
            # Get course_id from LMS modules table
            module = await conn.fetchrow('SELECT "courseId" FROM modules WHERE id::text = $1', module_id)
            course_id = str(module['courseId']) if module else data.get('course_id')
            quiz = await conn.fetchrow('''
                INSERT INTO module_quizzes (module_id, course_id, title, description, time_limit,
                    passing_percentage, is_published)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            ''', module_id, course_id, data.get('title', 'Module Quiz'),
                data.get('description', ''), data.get('time_limit', 3600),
                data.get('passing_percentage', 80), data.get('is_published', False))
            return {'id': str(quiz['id']), 'created': True}


@api_router.get("/admin/modules/{module_id}/quiz")
async def admin_get_module_quiz(module_id: str, admin: dict = Depends(require_admin)):
    """Get module quiz with questions"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        quiz = await conn.fetchrow(
            'SELECT * FROM module_quizzes WHERE module_id = $1 AND is_final_quiz = FALSE', module_id
        )
        if not quiz:
            return {'quiz': None, 'questions': []}

        questions = await conn.fetch(
            'SELECT * FROM module_quiz_questions WHERE quiz_id = $1 ORDER BY order_index', quiz['id']
        )
        return {
            'quiz': {**dict(quiz), 'id': str(quiz['id'])},
            'questions': [{**dict(q), 'id': str(q['id']), 'quiz_id': str(q['quiz_id']),
                          'options': json.loads(q['options']) if isinstance(q['options'], str) else q['options']}
                         for q in questions]
        }


@api_router.post("/admin/quizzes/{quiz_id}/questions")
async def admin_add_question(quiz_id: str, data: dict, admin: dict = Depends(require_admin)):
    """Add a question to a quiz"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        max_order = await conn.fetchval(
            'SELECT COALESCE(MAX(order_index), 0) FROM module_quiz_questions WHERE quiz_id = $1', uuid.UUID(quiz_id)
        )
        question = await conn.fetchrow('''
            INSERT INTO module_quiz_questions (quiz_id, question_type, question_text, options,
                correct_answer, explanation, order_index)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        ''', uuid.UUID(quiz_id), data.get('question_type', 'multiple_choice'),
            data['question_text'], json.dumps(data.get('options', [])),
            data['correct_answer'], data.get('explanation', ''), max_order + 1)
        return {'id': str(question['id'])}


@api_router.put("/admin/quizzes/{quiz_id}/questions/{question_id}")
async def admin_update_question(quiz_id: str, question_id: str, data: dict, admin: dict = Depends(require_admin)):
    """Update a quiz question"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        updates = []
        values = []
        idx = 1
        field_mapping = {
            'question_type': 'question_type',
            'question_text': 'question_text',
            'correct_answer': 'correct_answer',
            'explanation': 'explanation',
            'order_index': 'order_index',
        }
        for key, col in field_mapping.items():
            if key in data:
                updates.append(f'{col} = ${idx}')
                values.append(data[key])
                idx += 1
        if 'options' in data:
            updates.append(f'options = ${idx}')
            values.append(json.dumps(data['options']))
            idx += 1
        if updates:
            values.append(uuid.UUID(question_id))
            await conn.execute(
                f'UPDATE module_quiz_questions SET {", ".join(updates)} WHERE id = ${idx}', *values
            )
        return {'success': True}


@api_router.delete("/admin/quizzes/{quiz_id}/questions/{question_id}")
async def admin_delete_question(quiz_id: str, question_id: str, admin: dict = Depends(require_admin)):
    """Delete a quiz question"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM module_quiz_questions WHERE id::text = $1', uuid.UUID(question_id))
        return {'success': True}


@api_router.patch("/admin/quizzes/{quiz_id}/publish")
async def admin_toggle_quiz_publish(quiz_id: str, admin: dict = Depends(require_admin)):
    """Toggle quiz publish status"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE module_quizzes SET is_published = NOT is_published, updated_at = NOW() WHERE id::text = $1',
            uuid.UUID(quiz_id)
        )
        return {'success': True}


# ===========================================
# STUDENT: QUIZ TAKING
# ===========================================

@api_router.get("/student/modules/{module_id}/quiz")
async def student_get_module_quiz(module_id: str, current_user: dict = Depends(get_current_user)):
    """Get quiz for a module (without correct answers)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        quiz = await conn.fetchrow(
            'SELECT * FROM module_quizzes WHERE module_id = $1 AND is_published = TRUE AND is_final_quiz = FALSE',
            module_id
        )
        if not quiz:
            return {'quiz': None}

        questions = await conn.fetch(
            'SELECT id, question_type, question_text, options, order_index FROM module_quiz_questions WHERE quiz_id = $1 ORDER BY order_index',
            quiz['id']
        )

        # Get user's previous attempts
        attempts = await conn.fetch(
            'SELECT attempt_number, score, max_score, percentage, passed, completed_at, time_spent FROM module_quiz_attempts WHERE quiz_id = $1 AND user_id = $2 ORDER BY attempt_number',
            quiz['id'], current_user['id']
        )

        # Calculate points per question (equally divided)
        total_questions = len(questions)
        points_per_question = round(100 / total_questions, 2) if total_questions > 0 else 0

        return {
            'quiz': {
                'id': str(quiz['id']),
                'title': quiz['title'],
                'description': quiz['description'],
                'time_limit': quiz['time_limit'],
                'passing_percentage': quiz['passing_percentage'],
                'total_questions': total_questions,
                'points_per_question': points_per_question,
            },
            'questions': [{
                'id': str(q['id']),
                'question_type': q['question_type'],
                'question_text': q['question_text'],
                'options': json.loads(q['options']) if isinstance(q['options'], str) else q['options'],
                'order_index': q['order_index'],
            } for q in questions],
            'attempts': [dict(a) for a in attempts],
        }


@api_router.post("/student/quizzes/{quiz_id}/start")
async def student_start_quiz(quiz_id: str, current_user: dict = Depends(get_current_user)):
    """Start a quiz attempt"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        quiz = await conn.fetchrow('SELECT * FROM module_quizzes WHERE id::text = $1', uuid.UUID(quiz_id))
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        # Check cooldown for final quiz
        if quiz['is_final_quiz']:
            last_attempt = await conn.fetchrow('''
                SELECT cooldown_until, attempt_number FROM module_quiz_attempts
                WHERE quiz_id = $1 AND user_id = $2
                ORDER BY attempt_number DESC LIMIT 1
            ''', uuid.UUID(quiz_id), current_user['id'])

            if last_attempt and last_attempt['cooldown_until']:
                from datetime import datetime
                if datetime.now() < last_attempt['cooldown_until']:
                    raise HTTPException(
                        status_code=429,
                        detail=f"Cooldown active until {last_attempt['cooldown_until'].isoformat()}"
                    )

            if last_attempt and last_attempt['attempt_number'] >= 3:
                # Check if cooldown has passed (3 retries used, 8hr cooldown)
                if last_attempt['cooldown_until'] and datetime.now() >= last_attempt['cooldown_until']:
                    # Reset: allow retries again by treating it as a fresh set
                    pass
                elif last_attempt['cooldown_until']:
                    raise HTTPException(status_code=429, detail="Maximum retries reached. Wait for cooldown.")

        # Get next attempt number
        max_attempt = await conn.fetchval(
            'SELECT COALESCE(MAX(attempt_number), 0) FROM module_quiz_attempts WHERE quiz_id = $1 AND user_id = $2',
            uuid.UUID(quiz_id), current_user['id']
        )

        total_questions = await conn.fetchval(
            'SELECT COUNT(*) FROM module_quiz_questions WHERE quiz_id = $1', uuid.UUID(quiz_id)
        )
        max_score = 30 if quiz['is_final_quiz'] else 100

        attempt = await conn.fetchrow('''
            INSERT INTO module_quiz_attempts (quiz_id, user_id, attempt_number, max_score, started_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id, started_at
        ''', uuid.UUID(quiz_id), current_user['id'], max_attempt + 1, max_score)

        return {
            'attempt_id': str(attempt['id']),
            'attempt_number': max_attempt + 1,
            'started_at': attempt['started_at'].isoformat(),
            'time_limit': quiz['time_limit'],
        }


@api_router.post("/student/quizzes/{quiz_id}/submit")
async def student_submit_quiz(quiz_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Submit quiz answers and get score"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        attempt_id = data.get('attempt_id')
        answers = data.get('answers', {})  # {question_id: selected_answer}

        attempt = await conn.fetchrow(
            'SELECT * FROM module_quiz_attempts WHERE id::text = $1 AND user_id = $2',
            uuid.UUID(attempt_id), current_user['id']
        )
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")
        if attempt['completed_at']:
            raise HTTPException(status_code=400, detail="Attempt already submitted")

        quiz = await conn.fetchrow('SELECT * FROM module_quizzes WHERE id::text = $1', uuid.UUID(quiz_id))
        questions = await conn.fetch(
            'SELECT id, correct_answer FROM module_quiz_questions WHERE quiz_id = $1', uuid.UUID(quiz_id)
        )

        total_questions = len(questions)
        if total_questions == 0:
            raise HTTPException(status_code=400, detail="No questions in quiz")

        max_score = 30 if quiz['is_final_quiz'] else 100
        points_per_question = max_score / total_questions
        correct_count = 0
        results = {}

        for q in questions:
            q_id = str(q['id'])
            user_answer = answers.get(q_id, '')
            is_correct = user_answer.strip().lower() == q['correct_answer'].strip().lower()
            if is_correct:
                correct_count += 1
            results[q_id] = {'correct': is_correct, 'user_answer': user_answer}

        score = round(correct_count * points_per_question, 2)
        percentage = round((correct_count / total_questions) * 100, 2)
        passed = percentage >= quiz['passing_percentage']

        from datetime import datetime, timedelta
        time_spent = int((datetime.now() - attempt['started_at']).total_seconds())

        # Set cooldown for final quiz if attempt #3 fails
        cooldown_until = None
        if quiz['is_final_quiz'] and not passed and attempt['attempt_number'] >= 3:
            cooldown_until = datetime.now() + timedelta(hours=8)

        await conn.execute('''
            UPDATE module_quiz_attempts SET
                answers = $1, score = $2, max_score = $3, percentage = $4,
                passed = $5, completed_at = NOW(), time_spent = $6, cooldown_until = $7
            WHERE id::text = $8
        ''', json.dumps(answers), int(score), max_score, percentage,
            passed, time_spent, cooldown_until, uuid.UUID(attempt_id))

        return {
            'score': score,
            'max_score': max_score,
            'percentage': percentage,
            'passed': passed,
            'correct_count': correct_count,
            'total_questions': total_questions,
            'time_spent': time_spent,
            'results': results,
            'cooldown_until': cooldown_until.isoformat() if cooldown_until else None,
        }


@api_router.get("/student/quizzes/{quiz_id}/results")
async def student_get_quiz_results(quiz_id: str, current_user: dict = Depends(get_current_user)):
    """Get past attempt results"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        attempts = await conn.fetch('''
            SELECT * FROM module_quiz_attempts
            WHERE quiz_id = $1 AND user_id = $2
            ORDER BY attempt_number
        ''', uuid.UUID(quiz_id), current_user['id'])

        return {
            'attempts': [{
                'id': str(a['id']),
                'attempt_number': a['attempt_number'],
                'score': a['score'],
                'max_score': a['max_score'],
                'percentage': float(a['percentage']),
                'passed': a['passed'],
                'time_spent': a['time_spent'],
                'started_at': a['started_at'].isoformat() if a['started_at'] else None,
                'completed_at': a['completed_at'].isoformat() if a['completed_at'] else None,
                'cooldown_until': a['cooldown_until'].isoformat() if a['cooldown_until'] else None,
            } for a in attempts]
        }


@api_router.get("/student/courses/{course_id}/final-quiz")
async def student_get_final_quiz(course_id: str, current_user: dict = Depends(get_current_user)):
    """Get or generate the final quiz for a course (pulls random questions from all modules)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Check if final quiz already exists
        final_quiz = await conn.fetchrow(
            'SELECT * FROM module_quizzes WHERE course_id = $1 AND is_final_quiz = TRUE', course_id
        )

        if not final_quiz:
            # Auto-generate final quiz from all module quiz questions
            module_quizzes = await conn.fetch(
                'SELECT id FROM module_quizzes WHERE course_id = $1 AND is_final_quiz = FALSE AND is_published = TRUE',
                course_id
            )
            if not module_quizzes:
                return {'quiz': None, 'message': 'No module quizzes available yet'}

            quiz_ids = [q['id'] for q in module_quizzes]
            all_questions = await conn.fetch('''
                SELECT * FROM module_quiz_questions WHERE quiz_id = ANY($1) ORDER BY random()
            ''', quiz_ids)

            if len(all_questions) < 5:
                return {'quiz': None, 'message': 'Not enough questions across modules for a final quiz'}

            # Create the final quiz
            final_quiz = await conn.fetchrow('''
                INSERT INTO module_quizzes (module_id, course_id, title, description, time_limit,
                    passing_percentage, max_attempts, is_final_quiz, is_published)
                VALUES ($1, $2, $3, $4, 3600, 80, 3, TRUE, TRUE)
                RETURNING *
            ''', 'final', course_id, 'Final Assessment',
                'Comprehensive assessment covering all modules. You need 80% to pass.')

            # Copy random questions into the final quiz
            for idx, q in enumerate(all_questions):
                await conn.execute('''
                    INSERT INTO module_quiz_questions (quiz_id, question_type, question_text,
                        options, correct_answer, explanation, order_index)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                ''', final_quiz['id'], q['question_type'], q['question_text'],
                    q['options'] if isinstance(q['options'], str) else json.dumps(q['options']),
                    q['correct_answer'], q['explanation'], idx + 1)

        # Fetch questions (without answers)
        questions = await conn.fetch(
            'SELECT id, question_type, question_text, options, order_index FROM module_quiz_questions WHERE quiz_id = $1 ORDER BY order_index',
            final_quiz['id']
        )

        # Get attempts
        attempts = await conn.fetch(
            'SELECT attempt_number, score, max_score, percentage, passed, completed_at, time_spent, cooldown_until FROM module_quiz_attempts WHERE quiz_id = $1 AND user_id = $2 ORDER BY attempt_number',
            final_quiz['id'], current_user['id']
        )

        total_questions = len(questions)
        points_per_question = round(30 / total_questions, 2) if total_questions > 0 else 0

        return {
            'quiz': {
                'id': str(final_quiz['id']),
                'title': final_quiz['title'],
                'description': final_quiz['description'],
                'time_limit': final_quiz['time_limit'],
                'passing_percentage': final_quiz['passing_percentage'],
                'max_attempts': final_quiz['max_attempts'],
                'total_questions': total_questions,
                'points_per_question': points_per_question,
                'is_final_quiz': True,
            },
            'questions': [{
                'id': str(q['id']),
                'question_type': q['question_type'],
                'question_text': q['question_text'],
                'options': json.loads(q['options']) if isinstance(q['options'], str) else q['options'],
                'order_index': q['order_index'],
            } for q in questions],
            'attempts': [dict(a) for a in attempts],
        }


# ===========================================
# STUDENT: CERTIFICATION EXAMS
# ===========================================

class CertificationFlagSubmit(BaseModel):
    """Submit a flag/task answer for a certification exam challenge"""
    challenge_id: str
    flag: str
    question_index: Optional[int] = None  # None = main flag; 0,1,2... = task index


def calculate_time_remaining(expires_at: datetime) -> int:
    """Calculate seconds remaining until expiration"""
    if not expires_at:
        return 0
    now = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    diff = (expires_at - now).total_seconds()
    return max(0, int(diff))


@api_router.get("/student/certification-exams")
async def student_get_certification_exams(current_user: dict = Depends(get_current_user)):
    """
    Get all certification exams the student is enrolled in.
    Returns exam status, timing info, and component scores.
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get all attempts for this user
        attempts = await conn.fetch('''
            SELECT cea.*, cec.name as exam_name, cec."examType" as exam_type,
                   cec."isPublished" as is_published,
                   cec."globalDurationHours", cec."ctfDurationHours", cec."reportDurationHours",
                   cec."labUnlockReportThreshold"
            FROM certification_exam_attempts cea
            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
            WHERE cea."userId"::text = $1
            ORDER BY cea."redeemedAt" DESC
        ''', current_user['id'])
        
        result = []
        for a in attempts:
            # Calculate time remaining for each timer
            global_remaining = calculate_time_remaining(a['globalExpiresAt'])
            lab_remaining = calculate_time_remaining(a['labExpiresAt']) if a['labExpiresAt'] else None
            report_remaining = calculate_time_remaining(a['reportExpiresAt']) if a['reportExpiresAt'] else None
            
            # Determine component states
            mcq_completed = a['status'] not in ('MCQ_PENDING',)
            lab_started = a['labStartedAt'] is not None
            lab_completed = a['status'] in ('LAB_COMPLETED', 'REPORT_PENDING', 'REPORT_UPLOADED', 'PENDING_REVIEW', 'GRADED')
            report_unlocked = a['reportUnlockedAt'] is not None
            report_uploaded = a['reportUploadedAt'] is not None
            
            result.append({
                'id': str(a['examConfigId']),
                'attempt_id': str(a['id']),
                'name': a['exam_name'],
                'exam_type': a['exam_type'],
                'status': a['status'],
                'is_published': a['is_published'],
                'time_remaining': {
                    'global': global_remaining,
                    'lab': lab_remaining,
                    'report': report_remaining
                },
                'components': {
                    'mcq': {
                        'completed': mcq_completed,
                        'score': float(a['mcqScore']) if a['mcqScore'] else None,
                        'correct': a['mcqCorrect'],
                        'total': a['mcqTotal']
                    },
                    'lab': {
                        'started': lab_started,
                        'completed': lab_completed,
                        'score': float(a['labScore']) if a['labScore'] else None,
                        'points_earned': a['labPointsEarned'],
                        'total_points': a['labTotalPoints']
                    },
                    'report': {
                        'unlocked': report_unlocked,
                        'unlock_threshold': float(a['labUnlockReportThreshold']),
                        'uploaded': report_uploaded,
                        'score': float(a['reportTotalScore']) if a['reportTotalScore'] else None
                    }
                },
                'final_score': float(a['finalScore']) if a['finalScore'] else None,
                'passed': a['passed'],
                'certification_level': a['certificationLevel'],
                'redeemed_at': a['redeemedAt'].isoformat() if a['redeemedAt'] else None
            })
        
        return result


@api_router.post("/student/certification-exams/{exam_config_id}/start-lab")
async def student_start_certification_lab(exam_config_id: str, current_user: dict = Depends(get_current_user)):
    """
    Start the lab component of a certification exam.
    - Assigns a random pool (A, B, or C)
    - Randomizes challenge order within the pool
    - Starts the CTF timer (12h or remaining global time, whichever is less)
    - Returns challenges WITHOUT revealing pool assignment
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get the attempt
        attempt = await conn.fetchrow('''
            SELECT cea.*, cec."poolAChallengeIds", cec."poolBChallengeIds", cec."poolCChallengeIds",
                   cec."ctfDurationHours", cec."isPublished"
            FROM certification_exam_attempts cea
            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
            WHERE cea."examConfigId"::text = $1 AND cea."userId" = $2
        ''', exam_config_id, current_user['id'])
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Certification exam attempt not found")
        
        if not attempt['isPublished']:
            raise HTTPException(status_code=400, detail="This certification exam is not yet published")
        
        # Check if MCQ is completed
        if attempt['status'] == 'MCQ_PENDING':
            raise HTTPException(status_code=400, detail="You must complete the MCQ component first")
        
        # Check if lab already started
        if attempt['labStartedAt'] is not None:
            raise HTTPException(status_code=400, detail="Lab has already been started")
        
        # Check if global timer expired
        now = datetime.utcnow()  # offset-naive to match TIMESTAMP columns
        global_expires = attempt['globalExpiresAt']
        # Normalize to offset-naive (DB stores plain TIMESTAMP)
        if hasattr(global_expires, 'tzinfo') and global_expires.tzinfo is not None:
            global_expires = global_expires.replace(tzinfo=None)
        
        if now >= global_expires:
            # Mark as expired
            await conn.execute(
                'UPDATE certification_exam_attempts SET status = $1, "updatedAt" = NOW() WHERE id::text = $2',
                'EXPIRED', attempt['id']
            )
            raise HTTPException(status_code=400, detail="Your 48-hour window has expired")
        
        # RANDOM POOL ASSIGNMENT
        assigned_pool = random.choice(['A', 'B', 'C'])
        
        # Get challenge IDs for assigned pool
        if assigned_pool == 'A':
            challenge_ids = attempt['poolAChallengeIds']
        elif assigned_pool == 'B':
            challenge_ids = attempt['poolBChallengeIds']
        else:
            challenge_ids = attempt['poolCChallengeIds']
        
        # RANDOMIZE ORDER within pool (0-6 indices)
        randomized_order = list(range(len(challenge_ids)))
        random.shuffle(randomized_order)
        
        # Calculate lab expiration (12h OR global remaining, whichever is less)
        ctf_hours = attempt['ctfDurationHours'] or 12
        ctf_expiry = now + timedelta(hours=ctf_hours)
        lab_expires_at = min(ctf_expiry, global_expires)
        
        # Update the attempt
        await conn.execute('''
            UPDATE certification_exam_attempts SET
                "assignedPool" = $1,
                "labStartedAt" = $2,
                "labExpiresAt" = $3,
                "labChallengeOrder" = $4,
                status = 'LAB_IN_PROGRESS',
                "updatedAt" = NOW()
            WHERE id::text = $5
        ''', assigned_pool, now, lab_expires_at, randomized_order, str(attempt['id']))
        
        # Fetch challenge details (in randomized order)
        challenges = await conn.fetch('''
            SELECT c.id, c.title, c.description, c.difficulty, c.hints,
                   c."dockerImage", c."hasDocker" as has_docker,
                   cat.name as category
            FROM ctf_public_challenges c
            LEFT JOIN ctf_categories cat ON c."categoryId" = cat.id
            WHERE c.id::text = ANY($1)
        ''', challenge_ids)
        
        # Map challenges by ID
        id_to_challenge = {str(c['id']): c for c in challenges}
        
        # Compute total possible lab points from difficulty
        total_lab_points = 0
        for idx in randomized_order:
            cid = challenge_ids[idx]
            c = id_to_challenge.get(cid)
            if c:
                difficulty = c['difficulty'].upper() if c['difficulty'] else 'MEDIUM'
                total_lab_points += CERTIFICATION_DIFFICULTY_POINTS.get(difficulty, 20)

        # Persist labTotalPoints so score calculation never divides by zero
        await conn.execute(
            'UPDATE certification_exam_attempts SET "labTotalPoints" = $1, "labPointsEarned" = 0, "labScore" = 0, "updatedAt" = NOW() WHERE id::text = $2',
            total_lab_points, str(attempt['id'])
        )

        # Return challenges in randomized order (using indices)
        ordered_challenges = []
        for idx in randomized_order:
            cid = challenge_ids[idx]
            c = id_to_challenge.get(cid)
            if c:
                difficulty = c['difficulty'].upper() if c['difficulty'] else 'MEDIUM'
                cert_points = CERTIFICATION_DIFFICULTY_POINTS.get(difficulty, 20)
                hints = json.loads(c['hints']) if isinstance(c['hints'], str) else (c['hints'] or [])
                
                ordered_challenges.append({
                    'id': str(c['id']),
                    'title': c['title'],
                    'description': c['description'],
                    'difficulty': difficulty,
                    'points': cert_points,
                    'total_points': cert_points,
                    'category': c['category'] or 'Uncategorized',
                    'has_docker': c['has_docker'] or bool(c['dockerImage']),
                    'hints': [{'index': i, 'cost': h.get('cost', 10)} for i, h in enumerate(hints)],
                    'solved': False
                })
        
        return {
            'attempt_id': str(attempt['id']),
            'challenges': ordered_challenges,
            'time_remaining': calculate_time_remaining(lab_expires_at),
            'lab_expires_at': lab_expires_at.isoformat(),
            'total_points': total_lab_points
        }



@api_router.get("/student/certification-exams/{exam_config_id}/lab")
async def student_get_lab_by_config(exam_config_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get lab details for a certification exam (by config ID).
    Called by the frontend StudentCertificationLab page.
    Returns 404 if lab not started yet (frontend shows 'Start Lab' button).
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        attempt = await conn.fetchrow('''
            SELECT cea.*, cec.name, cec."poolAChallengeIds", cec."poolBChallengeIds",
                   cec."poolCChallengeIds", cec."labUnlockReportThreshold"
            FROM certification_exam_attempts cea
            JOIN certification_exam_configs cec ON cea."examConfigId"::text = $1
            WHERE cea."userId"::text = $2
        ''', exam_config_id, str(current_user['id']))

        if not attempt:
            raise HTTPException(status_code=404, detail="Certification exam attempt not found")

        if attempt['labStartedAt'] is None:
            raise HTTPException(status_code=404, detail="Lab not started yet")

        # Get challenge IDs for assigned pool
        assigned_pool = attempt['assignedPool']
        if assigned_pool == 'A':
            challenge_ids = attempt['poolAChallengeIds']
        elif assigned_pool == 'B':
            challenge_ids = attempt['poolBChallengeIds']
        else:
            challenge_ids = attempt['poolCChallengeIds']

        # Solved challenge IDs
        solved_challenges = attempt['labCompletedChallenges'] or []
        if isinstance(solved_challenges, str):
            solved_challenges = json.loads(solved_challenges)
        solved_map = {str(c['challenge_id']): c for c in solved_challenges}

        # Fetch challenge details including tasks (questions) and docker info
        challenges_raw = await conn.fetch('''
            SELECT c.id, c.title, c.description, c.difficulty, c.points,
                   c.questions, c."dockerImage", c."hasDocker", c."isMultiContainer",
                   cat.name as category
            FROM ctf_public_challenges c
            LEFT JOIN ctf_categories cat ON c."categoryId" = cat.id
            WHERE c.id::text = ANY($1)
        ''', challenge_ids)

        id_to_challenge = {str(c['id']): c for c in challenges_raw}

        # Respect randomized order
        randomized_order = attempt['labChallengeOrder'] or list(range(len(challenge_ids)))
        ordered_challenges = []
        total_points = 0
        earned_points = 0

        for idx in randomized_order:
            if idx >= len(challenge_ids):
                continue
            cid = challenge_ids[idx]
            c = id_to_challenge.get(cid)
            if not c:
                continue
            difficulty = (c['difficulty'] or 'MEDIUM').upper()
            cert_points = CERTIFICATION_DIFFICULTY_POINTS.get(difficulty, 20)

            # Parse tasks (questions) — strip flags from response
            # Cert scoring: purely difficulty-based (EASY=10, MEDIUM=20, HARD=30)
            # Tasks split the cert_points evenly; no raw CTF task points used
            tasks_raw = json.loads(c['questions']) if isinstance(c['questions'], str) else (c['questions'] or [])
            num_tasks = len(tasks_raw)
            if num_tasks > 0:
                # Distribute cert_points evenly across tasks (integer split)
                pts_per_task = cert_points // num_tasks
                remainder = cert_points % num_tasks
                tasks = [
                    {'question': t.get('question', ''), 'points': pts_per_task + (1 if i < remainder else 0)}
                    for i, t in enumerate(tasks_raw)
                ]
            else:
                tasks = []

            # Challenge progress from solved_map
            solved_entry = solved_map.get(cid)
            is_solved = solved_entry is not None
            solved_at = solved_entry.get('solved_at') if is_solved else None
            tasks_solved = solved_entry.get('tasks_solved', []) if solved_entry else []

            # Total challenge points = cert_points (difficulty only)
            challenge_total_pts = cert_points
            total_points += challenge_total_pts
            if is_solved:
                earned_points += challenge_total_pts
            else:
                # Partial credit for solved tasks (using cert-based task points)
                for ti in tasks_solved:
                    if ti < len(tasks):
                        earned_points += tasks[ti]['points']

            ordered_challenges.append({
                'challenge_id': cid,
                'title': c['title'],
                'description': c['description'],
                'difficulty': difficulty,
                'points': cert_points,
                'task_points': cert_points if num_tasks > 0 else 0,
                'total_points': challenge_total_pts,
                'category': c['category'] or 'Uncategorized',
                'has_docker': bool(c['hasDocker'] or c['dockerImage'] or c['isMultiContainer']),
                'docker_image': c['dockerImage'],
                'is_multi_container': bool(c['isMultiContainer']),
                'tasks': tasks,
                'tasks_solved': tasks_solved,
                'is_solved': is_solved,
                'solved_at': solved_at,
            })

        lab_score = round((earned_points / total_points * 100) if total_points > 0 else 0, 1)
        threshold = attempt['labUnlockReportThreshold'] or 80
        can_upload_report = attempt['reportUnlockedAt'] is not None or lab_score >= threshold

        lab_expires = attempt['labExpiresAt']
        lab_timer_end = lab_expires.isoformat() if lab_expires else None

        return {
            'exam_id': exam_config_id,
            'exam_title': attempt['name'],
            'attempt_id': str(attempt['id']),
            'status': attempt['status'],
            'challenges': ordered_challenges,
            'lab_score': lab_score,
            'total_points': total_points,
            'earned_points': earned_points,
            'lab_timer_end': lab_timer_end,
            'can_upload_report': can_upload_report,
        }


@api_router.get("/student/certification-exams/attempts/{attempt_id}/challenges")
async def student_get_certification_challenges(attempt_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get the challenges for an in-progress certification lab exam.
    Returns challenges in the randomized order with solve status.
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get the attempt
        attempt = await conn.fetchrow('''
            SELECT cea.*, cec."poolAChallengeIds", cec."poolBChallengeIds", cec."poolCChallengeIds"
            FROM certification_exam_attempts cea
            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
            WHERE cea.id = $1 AND cea."userId" = $2
        ''', attempt_id, current_user['id'])
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Certification exam attempt not found")
        
        if attempt['labStartedAt'] is None:
            raise HTTPException(status_code=400, detail="Lab has not been started yet")
        
        # Get challenge IDs for assigned pool
        assigned_pool = attempt['assignedPool']
        if assigned_pool == 'A':
            challenge_ids = attempt['poolAChallengeIds']
        elif assigned_pool == 'B':
            challenge_ids = attempt['poolBChallengeIds']
        else:
            challenge_ids = attempt['poolCChallengeIds']
        
        # Get solved challenge IDs
        solved_challenges = attempt['labCompletedChallenges'] or []
        if isinstance(solved_challenges, str):
            solved_challenges = json.loads(solved_challenges)
        solved_ids = {c['challenge_id'] for c in solved_challenges}
        
        # Fetch challenge details
        challenges = await conn.fetch('''
            SELECT c.id, c.title, c.description, c.difficulty, c.hints,
                   c."dockerImage", c."hasDocker" as has_docker,
                   cat.name as category
            FROM ctf_public_challenges c
            LEFT JOIN ctf_categories cat ON c."categoryId" = cat.id
            WHERE c.id::text = ANY($1)
        ''', challenge_ids)
        
        # Map challenges by ID
        id_to_challenge = {str(c['id']): c for c in challenges}
        
        # Get randomized order
        randomized_order = attempt['labChallengeOrder'] or list(range(len(challenge_ids)))
        
        # Return challenges in randomized order
        ordered_challenges = []
        for idx in randomized_order:
            cid = challenge_ids[idx]
            c = id_to_challenge.get(cid)
            if c:
                difficulty = c['difficulty'].upper() if c['difficulty'] else 'MEDIUM'
                cert_points = CERTIFICATION_DIFFICULTY_POINTS.get(difficulty, 20)
                hints = json.loads(c['hints']) if isinstance(c['hints'], str) else (c['hints'] or [])
                
                ordered_challenges.append({
                    'id': str(c['id']),
                    'title': c['title'],
                    'description': c['description'],
                    'difficulty': difficulty,
                    'points': cert_points,
                    'total_points': cert_points,
                    'category': c['category'] or 'Uncategorized',
                    'has_docker': c['has_docker'] or bool(c['dockerImage']),
                    'hints': [{'index': i, 'cost': h.get('cost', 10)} for i, h in enumerate(hints)],
                    'solved': str(c['id']) in solved_ids
                })
        
        # Calculate time remaining
        lab_remaining = calculate_time_remaining(attempt['labExpiresAt'])
        report_remaining = calculate_time_remaining(attempt['reportExpiresAt']) if attempt['reportExpiresAt'] else None
        
        return {
            'attempt_id': str(attempt['id']),
            'status': attempt['status'],
            'challenges': ordered_challenges,
            'lab_points_earned': attempt['labPointsEarned'],
            'lab_total_points': attempt['labTotalPoints'],
            'lab_score': float(attempt['labScore']) if attempt['labScore'] else 0,
            'report_unlocked': attempt['reportUnlockedAt'] is not None,
            'time_remaining': {
                'lab': lab_remaining,
                'report': report_remaining
            }
        }


@api_router.post("/student/certification-exams/attempts/{attempt_id}/submit")
async def student_submit_certification_flag(
    attempt_id: str, 
    data: CertificationFlagSubmit, 
    current_user: dict = Depends(get_current_user)
):
    """
    Submit a flag for a certification exam challenge.
    - Auto-scores based on certification difficulty points
    - Unlocks report upload when lab score >= 80%
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get the attempt with exam config
        attempt = await conn.fetchrow('''
            SELECT cea.*, cec."poolAChallengeIds", cec."poolBChallengeIds", cec."poolCChallengeIds",
                   cec."labUnlockReportThreshold", cec."reportDurationHours"
            FROM certification_exam_attempts cea
            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
            WHERE cea.id = $1 AND cea."userId" = $2
        ''', attempt_id, current_user['id'])
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Certification exam attempt not found")
        
        # Check status
        if attempt['status'] not in ('LAB_IN_PROGRESS',):
            raise HTTPException(status_code=400, detail=f"Cannot submit flags in status: {attempt['status']}")
        
        # Check if lab timer expired (all comparisons use naive UTC)
        now = datetime.utcnow()
        lab_expires = attempt['labExpiresAt']
        if lab_expires:
            # Normalize to naive UTC
            if lab_expires.tzinfo is not None:
                lab_expires = lab_expires.replace(tzinfo=None)
            if now >= lab_expires:
                await conn.execute(
                    'UPDATE certification_exam_attempts SET status = $1, "labCompletedAt" = $2, "updatedAt" = NOW() WHERE id::text = $3',
                    'LAB_COMPLETED', now, attempt['id']
                )
                raise HTTPException(status_code=400, detail="Your lab time has expired")
        
        # Get challenge IDs for assigned pool
        assigned_pool = attempt['assignedPool']
        if assigned_pool == 'A':
            challenge_ids = attempt['poolAChallengeIds']
        elif assigned_pool == 'B':
            challenge_ids = attempt['poolBChallengeIds']
        else:
            challenge_ids = attempt['poolCChallengeIds']
        
        # Verify challenge is in the pool
        if data.challenge_id not in challenge_ids:
            raise HTTPException(status_code=400, detail="Challenge is not in your assigned pool")
        
        # Check if already solved
        solved_challenges = attempt['labCompletedChallenges'] or []
        if isinstance(solved_challenges, str):
            solved_challenges = json.loads(solved_challenges)
        
        if any(c['challenge_id'] == data.challenge_id for c in solved_challenges):
            return {
                'correct': False,
                'message': 'Challenge already solved',
                'points': 0,
                'lab_points_earned': attempt['labPointsEarned'],
                'lab_score': float(attempt['labScore']) if attempt['labScore'] else 0,
                'report_unlocked': attempt['reportUnlockedAt'] is not None
            }
        
        # Get challenge and verify flag/task answer
        challenge = await conn.fetchrow('''
            SELECT id, title, difficulty, flag, questions FROM ctf_public_challenges WHERE id::text = $1
        ''', data.challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")

        # Parse tasks
        tasks_raw = json.loads(challenge['questions']) if isinstance(challenge['questions'], str) else (challenge['questions'] or [])

        # Determine if this is a task submission or main flag submission
        is_task_submission = data.question_index is not None

        if is_task_submission:
            qi = data.question_index
            if qi < 0 or qi >= len(tasks_raw):
                raise HTTPException(status_code=400, detail="Invalid task index")
            task = tasks_raw[qi]
            correct_answer = task.get('flag') or task.get('answer') or ''
            correct = data.flag.strip().lower() == correct_answer.strip().lower()
        else:
            correct = data.flag.strip().lower() == (challenge['flag'] or '').strip().lower()

        if not correct:
            return {
                'correct': False,
                'message': 'Incorrect answer' if is_task_submission else 'Incorrect flag',
                'points': 0,
                'lab_points_earned': attempt['labPointsEarned'],
                'lab_score': float(attempt['labScore']) if attempt['labScore'] else 0,
                'report_unlocked': attempt['reportUnlockedAt'] is not None
            }
        
        # Calculate points
        difficulty = challenge['difficulty'].upper() if challenge['difficulty'] else 'MEDIUM'
        cert_points = CERTIFICATION_DIFFICULTY_POINTS.get(difficulty, 20)

        # Find or create the solved entry for this challenge
        existing_entry = next((c for c in solved_challenges if c['challenge_id'] == data.challenge_id), None)
        if existing_entry is None:
            existing_entry = {
                'challenge_id': data.challenge_id,
                'title': challenge['title'],
                'difficulty': difficulty,
                'tasks_solved': [],
                'solved_at': None,
            }
            solved_challenges.append(existing_entry)

        if is_task_submission:
            qi = data.question_index
            task_points = tasks_raw[qi].get('points', 0)
            # Check not already solved
            if qi in existing_entry.get('tasks_solved', []):
                return {
                    'correct': False,
                    'message': 'Task already solved',
                    'points': 0,
                    'lab_points_earned': attempt['labPointsEarned'],
                    'lab_score': float(attempt['labScore']) if attempt['labScore'] else 0,
                    'report_unlocked': attempt['reportUnlockedAt'] is not None
                }
            existing_entry.setdefault('tasks_solved', []).append(qi)
            points = task_points

            # Auto-complete challenge when all tasks done (no separate flag submission needed)
            all_tasks_done = set(existing_entry["tasks_solved"]) == set(range(len(tasks_raw)))
            if all_tasks_done:
                existing_entry["solved_at"] = now.isoformat()
                points += cert_points  # Award base cert points on completion
        else:
            # Main flag submission
            if existing_entry.get('main_flag_solved'):
                return {
                    'correct': False,
                    'message': 'Flag already submitted',
                    'points': 0,
                    'lab_points_earned': attempt['labPointsEarned'],
                    'lab_score': float(attempt['labScore']) if attempt['labScore'] else 0,
                    'report_unlocked': attempt['reportUnlockedAt'] is not None
                }
            existing_entry['main_flag_solved'] = True
            points = cert_points

            # If no tasks, challenge is complete
            if len(tasks_raw) == 0:
                existing_entry['solved_at'] = now.isoformat()
            else:
                # Still needs tasks
                all_tasks_done = set(existing_entry.get('tasks_solved', [])) == set(range(len(tasks_raw)))
                if all_tasks_done:
                    existing_entry['solved_at'] = now.isoformat()

        # Calculate new totals (guard against zero total points after reset)
        new_points_earned = (attempt['labPointsEarned'] or 0) + points
        total_pts = attempt['labTotalPoints'] or 0
        if total_pts == 0:
            # Recompute from current challenges list to avoid div-by-zero
            total_pts = sum(ch.get('points', 0) for ch in solved_challenges) or 1
        new_score = (new_points_earned / total_pts) * 100
        
        # Prepare update data
        update_data = {
            'labPointsEarned': new_points_earned,
            'labScore': new_score,
            'labCompletedChallenges': json.dumps(solved_challenges)
        }
        
        # Check if report should be unlocked (at threshold, e.g., 80%)
        unlock_threshold = float(attempt['labUnlockReportThreshold'] or 80)
        report_unlocked = attempt['reportUnlockedAt'] is not None
        
        if new_score >= unlock_threshold and not report_unlocked:
            # Unlock report upload
            report_hours = attempt['reportDurationHours'] or 3
            global_expires = attempt['globalExpiresAt']
            if global_expires.tzinfo is not None:
                global_expires = global_expires.replace(tzinfo=None)
            
            report_expiry = now + timedelta(hours=report_hours)
            report_expires_at = min(report_expiry, global_expires)
            
            update_data['reportUnlockedAt'] = now
            update_data['reportExpiresAt'] = report_expires_at
            update_data['status'] = 'REPORT_PENDING'
            report_unlocked = True
        
        # Check if all challenges are fully solved (have a solved_at)
        all_solved = all(c.get('solved_at') is not None for c in solved_challenges) and len(solved_challenges) == len(challenge_ids)
        if all_solved and 'status' not in update_data:
            update_data['labCompletedAt'] = now
            if new_score >= unlock_threshold:
                update_data['status'] = 'REPORT_PENDING'
            else:
                update_data['status'] = 'LAB_COMPLETED'
        
        # Build update query
        set_clauses = []
        params = []
        param_idx = 1
        
        for key, value in update_data.items():
            # Convert camelCase to snake_case for DB columns
            db_column = f'"{key}"'
            set_clauses.append(f'{db_column} = ${param_idx}')
            params.append(value)
            param_idx += 1
        
        set_clauses.append('"updatedAt" = NOW()')
        params.append(attempt['id'])
        
        query = f'UPDATE certification_exam_attempts SET {", ".join(set_clauses)} WHERE id::text = ${param_idx}'
        await conn.execute(query, *params)
        
        return {
            'correct': True,
            'message': 'Flag correct!',
            'points': points,
            'challenge_title': challenge['title'],
            'lab_points_earned': new_points_earned,
            'lab_score': round(new_score, 2),
            'challenges_solved': len(solved_challenges),
            'challenges_total': 7,
            'report_unlocked': report_unlocked,
            'all_solved': all_solved
        }


# ===========================================
# STUDENT: END LAB (FINALIZE EARLY)
# ===========================================

@api_router.post("/student/certification-exams/attempts/{attempt_id}/end-lab")
async def student_end_certification_lab(attempt_id: str, current_user: dict = Depends(get_current_user)):
    """
    Finalise the lab component early (before timer expires).
    Calculates final lab score, updates status to LAB_COMPLETED or
    REPORT_UNLOCKED if score >= threshold.
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        attempt = await conn.fetchrow('''
            SELECT cea.*, cec."labUnlockReportThreshold", cec."reportDurationHours"
            FROM certification_exam_attempts cea
            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
            WHERE cea.id::text = $1 AND cea."userId"::text = $2
        ''', attempt_id, str(current_user['id']))

        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")

        if attempt['status'] not in ('LAB_IN_PROGRESS',):
            raise HTTPException(status_code=400, detail=f"Lab cannot be ended in status: {attempt['status']}")

        now = datetime.now(timezone.utc)
        lab_score = float(attempt['labScore']) if attempt['labScore'] else 0.0
        threshold = float(attempt['labUnlockReportThreshold'] or 80)

        new_status = 'LAB_COMPLETED'
        update_extra = ''
        params = [attempt_id]

        if lab_score >= threshold and attempt['reportUnlockedAt'] is None:
            report_hours = attempt['reportDurationHours'] or 3
            global_expires = attempt['globalExpiresAt']
            if global_expires.tzinfo is None:
                global_expires = global_expires.replace(tzinfo=timezone.utc)
            report_expiry = min(now + timedelta(hours=report_hours), global_expires)
            new_status = 'REPORT_UNLOCKED'
            update_extra = f', "reportUnlockedAt" = \'{now.isoformat()}\', "reportExpiresAt" = \'{report_expiry.isoformat()}\''

        await conn.execute(f'''
            UPDATE certification_exam_attempts
            SET status = \'{new_status}\', "labCompletedAt" = NOW(), "updatedAt" = NOW(){update_extra}
            WHERE id::text = $1
        ''', *params)

        return {
            'success': True,
            'lab_score': round(lab_score, 1),
            'status': new_status,
            'report_unlocked': new_status == 'REPORT_UNLOCKED'
        }


# ===========================================
# STUDENT: EXAM STATUS DETAILS
# ===========================================

@api_router.get("/student/certification-exams/{exam_config_id}/status")
async def student_get_certification_exam_status(exam_config_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get detailed status for a specific certification exam attempt.
    Used by the StudentCertificationStatus page.
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        attempt = await conn.fetchrow('''
            SELECT cea.*, cec.name as exam_name,
                   cec."labUnlockReportThreshold", cec."reportDurationHours"
            FROM certification_exam_attempts cea
            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
            WHERE cea."examConfigId"::text = $1 AND cea."userId"::text = $2
            ORDER BY cea."redeemedAt" DESC
            LIMIT 1
        ''', exam_config_id, str(current_user['id']))

        if not attempt:
            raise HTTPException(status_code=404, detail="Exam attempt not found")

        return {
            'exam_id': str(attempt['examConfigId']),
            'exam_title': attempt['exam_name'],
            'exam_description': '',
            'status': attempt['status'],
            'mcq_score': float(attempt['mcqScore']) if attempt['mcqScore'] else None,
            'mcq_correct': attempt['mcqCorrect'],
            'mcq_wrong': (attempt['mcqTotal'] or 0) - (attempt['mcqCorrect'] or 0) if attempt['mcqTotal'] else None,
            'lab_score': float(attempt['labScore']) if attempt['labScore'] else None,
            'earned_points': attempt['labPointsEarned'],
            'total_points': attempt['labTotalPoints'],
            'report_score': float(attempt['reportTotalScore']) if attempt['reportTotalScore'] else None,
            'final_score': float(attempt['finalScore']) if attempt['finalScore'] else None,
            'certification_level': attempt['certificationLevel'],
            'global_timer_end': attempt['globalExpiresAt'].isoformat() if attempt['globalExpiresAt'] else None,
            'lab_timer_end': attempt['labExpiresAt'].isoformat() if attempt['labExpiresAt'] else None,
            'report_timer_end': attempt['reportExpiresAt'].isoformat() if attempt['reportExpiresAt'] else None,
            'report_uploaded_at': attempt['reportUploadedAt'].isoformat() if attempt['reportUploadedAt'] else None,
            'graded_at': attempt['reportGradedAt'].isoformat() if attempt['reportGradedAt'] else None,
            'grader_comments': attempt['reportFeedback'] if attempt['reportFeedback'] else None,
            'created_at': attempt['redeemedAt'].isoformat() if attempt['redeemedAt'] else None
        }


# ===========================================
# STUDENT: REPORT STATUS
# ===========================================

@api_router.get("/student/certification-exams/{exam_config_id}/report-status")
async def student_get_report_status(exam_config_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get report upload status for this exam.
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        attempt = await conn.fetchrow('''
            SELECT cea.*, cec.name as exam_name, cec."labUnlockReportThreshold"
            FROM certification_exam_attempts cea
            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
            WHERE cea."examConfigId"::text = $1 AND cea."userId"::text = $2
            ORDER BY cea."redeemedAt" DESC
            LIMIT 1
        ''', exam_config_id, str(current_user['id']))

        if not attempt:
            raise HTTPException(status_code=404, detail="Exam attempt not found")

        report_unlocked = attempt['reportUnlockedAt'] is not None

        return {
            'exam_id': str(attempt['examConfigId']),
            'exam_title': attempt['exam_name'],
            'attempt_id': str(attempt['id']),
            'lab_score': float(attempt['labScore']) if attempt['labScore'] else 0,
            'can_upload_report': report_unlocked and attempt['reportUploadedAt'] is None,
            'report_uploaded_at': attempt['reportUploadedAt'].isoformat() if attempt['reportUploadedAt'] else None,
            'report_filename': attempt['reportFileUrl'] if attempt['reportFileUrl'] else None,
            'report_timer_end': attempt['reportExpiresAt'].isoformat() if attempt['reportExpiresAt'] else None,
            'status': attempt['status']
        }


# ===========================================
# ADMIN: RESET STUDENT LAB ATTEMPT
# ===========================================

@api_router.post("/admin/certification-exams/attempts/{attempt_id}/reset")
async def admin_reset_certification_attempt(attempt_id: str, current_user: dict = Depends(get_current_user)):
    """
    Admin only: Reset a student's lab progress so they can restart the lab.
    Clears all lab fields but keeps MCQ score and attempt record.
    """
    if current_user.get('role') not in ('admin', 'superadmin'):
        raise HTTPException(status_code=403, detail="Admin access required")

    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        attempt = await conn.fetchrow(
            'SELECT id, status FROM certification_exam_attempts WHERE id::text = $1',
            attempt_id
        )
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")

        await conn.execute('''
            UPDATE certification_exam_attempts SET
                status = 'MCQ_COMPLETED',
                "labStartedAt" = NULL,
                "labExpiresAt" = NULL,
                "labCompletedAt" = NULL,
                "labChallengeOrder" = NULL,
                "labCompletedChallenges" = '[]',
                "labPointsEarned" = 0,
                "labTotalPoints" = 0,
                "labScore" = 0,
                "reportUnlockedAt" = NULL,
                "reportExpiresAt" = NULL,
                "reportUploadedAt" = NULL,
                "reportFileUrl" = NULL,
                "reportClarityScore" = NULL,
                "reportTechnicalScore" = NULL,
                "reportReproducibilityScore" = NULL,
                "reportImpactScore" = NULL,
                "reportRemediationScore" = NULL,
                "reportTotalScore" = NULL,
                "reportGradedAt" = NULL,
                "reportGradedById" = NULL,
                "reportFeedback" = NULL,
                "finalScore" = NULL,
                "passed" = NULL,
                "certificationLevel" = NULL,
                "updatedAt" = NOW()
            WHERE id::text = $1
        ''', attempt_id)

        return {'success': True, 'message': 'Attempt reset to post-MCQ state. Student can now restart the lab.'}


# ===========================================
# STUDENT: CERTIFICATION REPORT UPLOAD
# ===========================================

@api_router.post("/student/certification-exams/attempts/{attempt_id}/report")
async def student_upload_certification_report(
    attempt_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a report for a certification exam.
    - Only allowed when report is unlocked (lab score >= 80%)
    - Only allowed within report deadline
    - Accepts PDF and DOCX files (max 50MB)
    """
    import mimetypes
    
    # Validate file type
    allowed_types = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    allowed_extensions = ['.pdf', '.docx']
    
    content_type = file.content_type
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    
    if content_type not in allowed_types and ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")
    
    # 50MB Limit
    MAX_SIZE = 50 * 1024 * 1024
    
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get the attempt
        attempt = await conn.fetchrow('''
            SELECT cea.*, cec.name as exam_name
            FROM certification_exam_attempts cea
            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
            WHERE cea.id = $1 AND cea."userId" = $2
        ''', attempt_id, current_user['id'])
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Certification exam attempt not found")
        
        # Check if report upload is unlocked
        if attempt['reportUnlockedAt'] is None:
            raise HTTPException(status_code=400, detail="Report upload is not unlocked. You need at least 80% lab score.")
        
        # Check status
        if attempt['status'] not in ('REPORT_PENDING', 'LAB_IN_PROGRESS', 'LAB_COMPLETED'):
            raise HTTPException(status_code=400, detail=f"Cannot upload report in status: {attempt['status']}")
        
        # Check if report deadline expired
        now = datetime.now(timezone.utc)
        report_expires = attempt['reportExpiresAt']
        if report_expires:
            if report_expires.tzinfo is None:
                report_expires = report_expires.replace(tzinfo=timezone.utc)
            if now >= report_expires:
                await conn.execute(
                    'UPDATE certification_exam_attempts SET status = $1, "updatedAt" = NOW() WHERE id::text = $2',
                    'PENDING_REVIEW', attempt['id']
                )
                raise HTTPException(status_code=400, detail="Your report upload deadline has expired")
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        if file_size > MAX_SIZE:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")
        
        # Create uploads directory if it doesn't exist
        upload_dir = ROOT_DIR / "uploads" / "certification-reports"
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        clean_filename = "".join(c for c in filename if c.isalnum() or c in "._- ").strip()
        if not clean_filename:
            clean_filename = f"report{ext}"
        
        storage_name = f"{attempt_id}_{clean_filename}"
        file_path = upload_dir / storage_name
        
        # Delete old file if exists
        if attempt['reportFileUrl']:
            old_file = ROOT_DIR / attempt['reportFileUrl'].lstrip('/')
            if old_file.exists():
                old_file.unlink()
        
        # Save file
        try:
            with open(file_path, "wb") as f:
                f.write(content)
        except Exception as e:
            logger.error(f"Report upload failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to save report file")
        
        # Update attempt with report info
        report_url = f"/uploads/certification-reports/{storage_name}"
        await conn.execute('''
            UPDATE certification_exam_attempts SET
                "reportFileUrl" = $1,
                "reportUploadedAt" = $2,
                status = 'REPORT_UPLOADED',
                "updatedAt" = NOW()
            WHERE id::text = $3
        ''', report_url, now, attempt['id'])
        
        return {
            'success': True,
            'report_url': report_url,
            'uploaded_at': now.isoformat(),
            'file_size': file_size,
            'filename': clean_filename
        }


# ===========================================
# ADMIN: CERTIFICATION REPORT GRADING
# ===========================================

@api_router.get("/admin/certification-exams/reports/pending")
async def admin_get_pending_reports(admin: dict = Depends(require_admin)):
    """Get all certification exam reports pending review"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        reports = await conn.fetch('''
            SELECT cea.id, cea."userId", cea."examConfigId", cea.status,
                   cea."mcqScore", cea."labScore", cea."labPointsEarned", cea."labTotalPoints",
                   cea."reportFileUrl", cea."reportUploadedAt",
                   u.name as student_name, u.email as student_email,
                   cec.name as exam_name
            FROM certification_exam_attempts cea
            JOIN users u ON cea."userId" = u.id
            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
            WHERE cea.status IN ('REPORT_UPLOADED', 'PENDING_REVIEW')
            ORDER BY cea."reportUploadedAt" ASC
        ''')
        
        return [{
            'attempt_id': str(r['id']),
            'user_id': str(r['userId']),
            'student_name': r['student_name'] or 'Unknown',
            'student_email': r['student_email'],
            'exam_name': r['exam_name'],
            'exam_config_id': str(r['examConfigId']),
            'status': r['status'],
            'mcq_score': float(r['mcqScore']) if r['mcqScore'] else None,
            'lab_score': float(r['labScore']) if r['labScore'] else None,
            'lab_points_earned': r['labPointsEarned'],
            'lab_total_points': r['labTotalPoints'],
            'report_file_url': r['reportFileUrl'],
            'report_uploaded_at': r['reportUploadedAt'].isoformat() if r['reportUploadedAt'] else None
        } for r in reports]


@api_router.get("/admin/certification-exams/reports/{attempt_id}")
async def admin_get_report_details(attempt_id: str, admin: dict = Depends(require_admin)):
    """Get detailed information about a certification exam attempt for grading"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        attempt = await conn.fetchrow('''
            SELECT cea.*, u.name as student_name, u.email as student_email,
                   cec.name as exam_name, cec."examType",
                   cec."mcqWeight", cec."labWeight", cec."reportWeight",
                   cec."passThreshold", cec."labMinThreshold", cec."reportMinThreshold",
                   cec."associateMin", cec."professionalMin", cec."eliteMin"
            FROM certification_exam_attempts cea
            JOIN users u ON cea."userId" = u.id
            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
            WHERE cea.id = $1
        ''', attempt_id)
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Certification exam attempt not found")
        
        return {
            'attempt_id': str(attempt['id']),
            'user_id': str(attempt['userId']),
            'student_name': attempt['student_name'] or 'Unknown',
            'student_email': attempt['student_email'],
            'exam_name': attempt['exam_name'],
            'exam_type': attempt['examType'],
            'assigned_pool': attempt['assignedPool'],
            'status': attempt['status'],
            # MCQ Component
            'mcq': {
                'score': float(attempt['mcqScore']) if attempt['mcqScore'] else None,
                'correct': attempt['mcqCorrect'],
                'wrong': attempt['mcqWrong'],
                'total': attempt['mcqTotal'],
                'weight': float(attempt['mcqWeight'])
            },
            # Lab Component
            'lab': {
                'score': float(attempt['labScore']) if attempt['labScore'] else None,
                'points_earned': attempt['labPointsEarned'],
                'total_points': attempt['labTotalPoints'],
                'weight': float(attempt['labWeight']),
                'completed_challenges': attempt['labCompletedChallenges']
            },
            # Report Component
            'report': {
                'file_url': attempt['reportFileUrl'],
                'uploaded_at': attempt['reportUploadedAt'].isoformat() if attempt['reportUploadedAt'] else None,
                'weight': float(attempt['reportWeight']),
                'grading': {
                    'clarity': attempt['reportClarityScore'],
                    'technical': attempt['reportTechnicalScore'],
                    'reproducibility': attempt['reportReproducibilityScore'],
                    'impact': attempt['reportImpactScore'],
                    'remediation': attempt['reportRemediationScore'],
                    'total': float(attempt['reportTotalScore']) if attempt['reportTotalScore'] else None,
                    'feedback': attempt['reportFeedback']
                } if attempt['reportGradedAt'] else None
            },
            # Thresholds
            'thresholds': {
                'pass': float(attempt['passThreshold']),
                'lab_min': float(attempt['labMinThreshold']),
                'report_min': float(attempt['reportMinThreshold']),
                'associate_min': float(attempt['associateMin']),
                'professional_min': float(attempt['professionalMin']),
                'elite_min': float(attempt['eliteMin'])
            },
            # Final Result (if graded)
            'result': {
                'final_score': float(attempt['finalScore']) if attempt['finalScore'] else None,
                'passed': attempt['passed'],
                'certification_level': attempt['certificationLevel'],
                'graded_at': attempt['reportGradedAt'].isoformat() if attempt['reportGradedAt'] else None
            } if attempt['reportGradedAt'] else None,
            # Timing
            'timing': {
                'redeemed_at': attempt['redeemedAt'].isoformat() if attempt['redeemedAt'] else None,
                'global_expires_at': attempt['globalExpiresAt'].isoformat() if attempt['globalExpiresAt'] else None,
                'lab_started_at': attempt['labStartedAt'].isoformat() if attempt['labStartedAt'] else None,
                'lab_completed_at': attempt['labCompletedAt'].isoformat() if attempt['labCompletedAt'] else None,
                'report_unlocked_at': attempt['reportUnlockedAt'].isoformat() if attempt['reportUnlockedAt'] else None,
                'report_expires_at': attempt['reportExpiresAt'].isoformat() if attempt['reportExpiresAt'] else None
            }
        }


@api_router.post("/admin/certification-exams/reports/{attempt_id}/grade")
async def admin_grade_certification_report(
    attempt_id: str, 
    data: ReportGradeRequest, 
    admin: dict = Depends(require_admin)
):
    """
    Grade a certification exam report and calculate final score.
    - Calculates report total (sum of 5 criteria, max 100)
    - Calculates final weighted score
    - Determines pass/fail and certification level
    """
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Get attempt with config
        attempt = await conn.fetchrow('''
            SELECT cea.*, cec."mcqWeight", cec."labWeight", cec."reportWeight",
                   cec."passThreshold", cec."labMinThreshold", cec."reportMinThreshold",
                   cec."associateMin", cec."professionalMin", cec."eliteMin"
            FROM certification_exam_attempts cea
            JOIN certification_exam_configs cec ON cea."examConfigId" = cec.id
            WHERE cea.id = $1
        ''', attempt_id)
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Certification exam attempt not found")
        
        # Check if report was uploaded
        if not attempt['reportFileUrl']:
            raise HTTPException(status_code=400, detail="No report uploaded for this attempt")
        
        # Calculate report total (max 100)
        report_total = data.clarity + data.technical + data.reproducibility + data.impact + data.remediation
        
        # Get scores
        mcq_score = float(attempt['mcqScore']) if attempt['mcqScore'] else 0
        lab_score = float(attempt['labScore']) if attempt['labScore'] else 0
        
        # Calculate weighted contributions
        mcq_weight = float(attempt['mcqWeight'])
        lab_weight = float(attempt['labWeight'])
        report_weight = float(attempt['reportWeight'])
        
        mcq_contribution = mcq_score * mcq_weight
        lab_contribution = lab_score * lab_weight
        report_contribution = report_total * report_weight
        
        final_score = mcq_contribution + lab_contribution + report_contribution
        
        # Get thresholds
        pass_threshold = float(attempt['passThreshold'])
        lab_min = float(attempt['labMinThreshold'])
        report_min = float(attempt['reportMinThreshold'])
        associate_min = float(attempt['associateMin'])
        professional_min = float(attempt['professionalMin'])
        elite_min = float(attempt['eliteMin'])
        
        # Determine pass/fail
        passed = (
            final_score >= pass_threshold and
            lab_score >= lab_min and
            report_total >= report_min
        )
        
        # Determine certification level
        certification_level = None
        if passed:
            if final_score >= elite_min:
                certification_level = 'Elite'
            elif final_score >= professional_min:
                certification_level = 'Professional'
            else:  # 70-79.99
                certification_level = 'Associate'
        
        now = datetime.now(timezone.utc)
        
        # Update attempt with grading results
        await conn.execute('''
            UPDATE certification_exam_attempts SET
                "reportClarityScore" = $1,
                "reportTechnicalScore" = $2,
                "reportReproducibilityScore" = $3,
                "reportImpactScore" = $4,
                "reportRemediationScore" = $5,
                "reportTotalScore" = $6,
                "reportFeedback" = $7,
                "reportGradedAt" = $8,
                "reportGradedById" = $9,
                "finalScore" = $10,
                passed = $11,
                "certificationLevel" = $12,
                status = 'GRADED',
                "updatedAt" = NOW()
            WHERE id::text = $13
        ''', data.clarity, data.technical, data.reproducibility, data.impact, data.remediation,
             report_total, data.feedback, now, admin['id'],
             round(final_score, 2), passed, certification_level, attempt['id'])
        
        return {
            'success': True,
            'report_score': report_total,
            'final_score': round(final_score, 2),
            'passed': passed,
            'certification_level': certification_level,
            'breakdown': {
                'mcq': f"{mcq_score:.1f}% × {mcq_weight:.2f} = {mcq_contribution:.1f}%",
                'lab': f"{lab_score:.1f}% × {lab_weight:.2f} = {lab_contribution:.1f}%",
                'report': f"{report_total}% × {report_weight:.2f} = {report_contribution:.1f}%"
            },
            'thresholds': {
                'overall': f"≥{pass_threshold}% (got {round(final_score, 2)}%)",
                'lab': f"≥{lab_min}% (got {lab_score:.1f}%)",
                'report': f"≥{report_min}% (got {report_total}%)"
            }
        }


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
        await conn.execute('DELETE FROM ctf_enrollment_codes WHERE id::text = $1', code_id)
        return {'success': True}


@api_router.post("/admin/enroll-user")
async def admin_enroll_user(data: EnrollUserRequest, admin: dict = Depends(require_admin)):
    """Directly enroll a user in a course"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Check if already enrolled
        existing = await conn.fetchrow('''
            SELECT id FROM ctf_enrollments 
            WHERE "userId"::text = $1 AND "ctfCourseId" = $2
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
            WHERE "userId"::text = $1 AND "ctfCourseId" = $2
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
            WHERE "userId"::text = $1 AND read = false
        ''', current_user['id'])
        return {'success': True}


@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('''
            UPDATE ctf_user_notifications SET read = true
            WHERE id::text = $1 AND "userId" = $2
        ''', notification_id, current_user['id'])
        return {'success': True}


# ===========================================
# NEXUS ENGINE INTEGRATION
# (Container orchestration for CTF challenges)
# ===========================================

NEXUS_ENGINE_URL = os.environ.get('NEXUS_ENGINE_URL', 'http://65.21.191.184:8081')

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
            SELECT id, title, "dockerImage" as docker_image, ports, 
                   "hasDocker", "challengePackId", "isMultiContainer"
            FROM ctf_public_challenges 
            WHERE id::text = $1 OR slug = $1
        ''', challenge_id)
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Use the actual UUID for all subsequent operations
        challenge_id = str(challenge['id'])
        
        # Check if it has any docker configuration (single or multi)
        if not challenge['docker_image'] and not challenge['challengePackId']:
            raise HTTPException(status_code=400, detail="This challenge does not have a container")
        
        # If multi-container, fetch the pack details
        challenge_pack = None
        if challenge['isMultiContainer'] and challenge['challengePackId']:
            challenge_pack = await conn.fetchrow('''
                SELECT id, pack_name, display_name, images, combined_ports
                FROM challenge_packs WHERE id::text = $1
            ''', challenge['challengePackId'])
            
            if not challenge_pack:
                raise HTTPException(status_code=404, detail="Challenge pack not found")
        
        # Convert to strings for consistent storage/lookup
        user_id = str(current_user['id'])
        challenge_id = str(challenge_id)
        
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
                            # Support both pod_ip (v3.0 VPN mode) and target_ip (legacy)
                            instance_ip = data.get('pod_ip') or data.get('target_ip')
                            return {
                                "session_id": data['session_id'],
                                "target_ip": instance_ip,
                                "pod_ip": instance_ip,
                                "expires_at": data['expires_at'],
                                "status": "running",
                                "message": "Existing instance found"
                            }
            except:
                pass
        
        # Get challenge-specific ports or use defaults
        challenge_ports = []
        if challenge.get('ports'):
            port_data = challenge['ports']
            if isinstance(port_data, str):
                challenge_ports = json.loads(port_data)
            elif isinstance(port_data, list):
                challenge_ports = port_data
        
        # Fallback to default ports if none configured
        if not challenge_ports:
            challenge_ports = [22, 80, 443, 3000, 8000, 8080]
        
        # Spawn new session via Nexus
        try:
            async with httpx.AsyncClient() as client:
                # Prepare nexus challenge config
                nexus_challenge = {
                    "name": challenge['title'],
                    "category": "CTF",
                    "difficulty": "Medium",
                    "description": f"Challenge: {challenge['title']}",
                    "max_score": 100,
                    "flag": "PLACEHOLDER",
                    "ttl_minutes": 60,
                    "ports": challenge_ports,
                }

                if challenge_pack:
                    nexus_challenge["is_multi_container"] = True
                    # Images in challenge_pack is a JSON list of objects with {name, image, ports}
                    pack_images = challenge_pack['images']
                    if isinstance(pack_images, str):
                        pack_images = json.loads(pack_images)
                    
                    nexus_challenge["containers"] = [
                        {
                            "name": img.get('name', f"container-{i}"),
                            "image": img.get('image'),
                            "ports": img.get('ports', [])
                        }
                        for i, img in enumerate(pack_images)
                    ]
                    
                    # Ensure we use combined ports from the pack for service reachability
                    if challenge_pack.get('combined_ports'):
                        pack_ports = challenge_pack['combined_ports']
                        if isinstance(pack_ports, str):
                            pack_ports = json.loads(pack_ports)
                        nexus_challenge["ports"] = pack_ports
                else:
                    nexus_challenge["image_url"] = challenge['docker_image']
                    nexus_challenge["is_multi_container"] = False
                
                # Try to delete existing challenge to force fresh config
                try:
                    await client.delete(
                        f"{NEXUS_ENGINE_URL}/api/v1/challenges/{challenge_id}",
                        timeout=5.0
                    )
                except:
                    pass  # Ignore if doesn't exist
                
                # Create challenge with current config
                create_resp = await client.post(
                    f"{NEXUS_ENGINE_URL}/api/v1/challenges",
                    json=nexus_challenge,
                    timeout=10.0
                )
                
                if create_resp.status_code == 201:
                    nexus_chal_id = create_resp.json().get('id', challenge_id)
                    logger.info(f"Created/updated Nexus challenge {nexus_chal_id} with ports: {challenge_ports}")
                else:
                    # Fallback to using the challenge_id directly
                    nexus_chal_id = challenge_id
                    logger.warning(f"Could not create Nexus challenge: {create_resp.status_code}")
                
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
                
                # Cache session for fast lookup
                if user_id not in nexus_sessions:
                    nexus_sessions[user_id] = {}
                nexus_sessions[user_id][challenge_id] = session_data['session_id']
                
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
                        logger.info(f"[NEXUS-INSERT] Saving session: user_id='{user_id}', challenge_id='{challenge_id}', session_id='{session_data['session_id']}'")
                        await conn.execute('''
                            INSERT INTO nexus_usage (
                                id, user_id, challenge_id, session_id, started_at, status
                            ) VALUES ($1, $2, $3, $4, NOW(), 'running')
                        ''', generate_uuid(), user_id, challenge_id, session_data['session_id'])
                        logger.info(f"[NEXUS-INSERT] Session saved successfully")
                except Exception as e:
                    logger.error(f"[NEXUS-INSERT] Failed to record usage: {e}")  # Don't fail the request
                
                # Support both pod_ip (v3.0 VPN mode) and target_ip (legacy)
                instance_ip = session_data.get('pod_ip') or session_data.get('target_ip')
                return {
                    "session_id": session_data['session_id'],
                    "target_ip": instance_ip,
                    "pod_ip": instance_ip,
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
                        # Calculate cost: ~$0.045/hour per instance (GKE Autopilot asia-south1)
                        # Pod (~$0.02/hr) + LoadBalancer (~$0.025/hr) = ~$0.045/hr
                        # Status 'stopped' = user manually stopped
                        await conn.execute('''
                            UPDATE nexus_usage SET 
                                ended_at = NOW(),
                                status = 'stopped',
                                pod_seconds = GREATEST(60, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER),
                                estimated_cost = GREATEST(0.0001, (EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600.0) * 0.045)
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
        # First, check remaining time from Nexus to enforce 30-minute rule
        async with httpx.AsyncClient() as client:
            # Get current session status first
            status_resp = await client.get(
                f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}",
                timeout=10.0
            )
            
            if status_resp.status_code == 404:
                raise HTTPException(status_code=404, detail="Session not found")
            
            if status_resp.status_code == 200:
                session_data = status_resp.json()
                expires_at_str = session_data.get('expires_at')
                
                if expires_at_str:
                    # Parse expires_at and check remaining time
                    try:
                        # Handle ISO format with or without Z
                        if expires_at_str.endswith('Z'):
                            expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
                        else:
                            expires_at = datetime.fromisoformat(expires_at_str)
                        
                        # Ensure timezone aware
                        if expires_at.tzinfo is None:
                            expires_at = expires_at.replace(tzinfo=timezone.utc)
                        
                        remaining_seconds = (expires_at - datetime.now(timezone.utc)).total_seconds()
                        remaining_minutes = remaining_seconds / 60
                        
                        logger.info(f"Extension check for {session_id}: {remaining_minutes:.1f} minutes remaining")
                        
                        # Only allow extension if less than 30 minutes remaining
                        if remaining_minutes > 30:
                            raise HTTPException(
                                status_code=403, 
                                detail=f"Extension available when less than 30 minutes remain. Currently {int(remaining_minutes)} minutes left."
                            )
                    except HTTPException:
                        raise
                    except Exception as e:
                        logger.warning(f"Could not parse expires_at '{expires_at_str}': {e}")
                        # Continue anyway if parsing fails
            
            # Now request extension from Nexus
            resp = await client.post(
                f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}/extend",
                json={"extra_minutes": 30},
                timeout=10.0
            )
            logger.info(f"Extend response for {session_id}: status={resp.status_code}")
            
            if resp.status_code == 200:
                result = resp.json()
                
                # Track extension in database for billing
                try:
                    pool = await Database.get_pool()
                    async with pool.acquire() as conn:
                        # Record extension event and add estimated cost for 30 min
                        # Cost: $0.045/hour = $0.0225 for 30 min
                        await conn.execute('''
                            UPDATE nexus_usage SET 
                                estimated_cost = COALESCE(estimated_cost, 0) + 0.0225,
                                pod_seconds = COALESCE(pod_seconds, 0) + 1800
                            WHERE session_id = $1
                        ''', session_id)
                except Exception as e:
                    logger.warning(f"Failed to record extension: {e}")
                
                return {
                    "session_id": session_id,
                    "expires_at": result.get('new_expires_at') or result.get('expires_at'),
                    "status": "running",
                    "extended_by": 30
                }
            elif resp.status_code == 403:
                raise HTTPException(status_code=403, detail="Extension not available yet")
            elif resp.status_code == 404:
                raise HTTPException(status_code=404, detail="Session not found")
            else:
                logger.warning(f"Extend failed: {resp.status_code} - {resp.text}")
                raise HTTPException(status_code=resp.status_code, detail=f"Nexus error: {resp.status_code}")
    except HTTPException:
        raise
    except httpx.RequestError as e:
        logger.error(f"Nexus connection error on extend: {e}")
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
    
    # Resolve challenge_id (slug support)
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            chal_row = await conn.fetchrow('''
                SELECT id FROM ctf_public_challenges 
                WHERE id::text = $1 OR slug = $1
            ''', challenge_id)
            if chal_row:
                challenge_id = str(chal_row['id'])
    except Exception as e:
        logger.error(f"Error resolving challenge ID: {e}")
        
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
                        # Support both pod_ip (v3.0 VPN mode) and target_ip (legacy)
                        instance_ip = data.get('pod_ip') or data.get('target_ip')
                        return {
                            "session_id": session_id,
                            "target_ip": instance_ip,
                            "pod_ip": instance_ip,
                            "expires_at": data.get('expires_at'),
                            "status": "running"
                        }
        except Exception as e:
            logger.warning(f"Error checking cache session {session_id}: {e}")
        
        # Session no longer valid, remove from cache
        del nexus_sessions[user_id][challenge_id]
    
    # Check database for running session - DATABASE IS SOURCE OF TRUTH
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            logger.info(f"[NEXUS-SELECT] Looking for session: user_id='{user_id}', challenge_id='{challenge_id}'")
            row = await conn.fetchrow('''
                SELECT session_id, started_at FROM nexus_usage
                WHERE user_id = $1 AND challenge_id = $2 AND status = 'running'
                AND started_at > NOW() - INTERVAL '4 hours'
                ORDER BY started_at DESC LIMIT 1
            ''', user_id, challenge_id)
            
            if row:
                session_id = row['session_id']
                logger.info(f"[NEXUS-SELECT] Found running session {session_id} in DB for user {user_id}")
                
                # Try to get details from Nexus, but trust DB if Nexus fails
                target_ip = None
                expires_at = None
                session_valid = True  # Assume valid unless Nexus explicitly says 404
                
                try:
                    async with httpx.AsyncClient() as client:
                        resp = await client.get(
                            f"{NEXUS_ENGINE_URL}/api/v1/sessions/{session_id}",
                            timeout=5.0  # Shorter timeout
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            # Support both pod_ip (v3.0 VPN mode) and target_ip (legacy)
                            target_ip = data.get('pod_ip') or data.get('target_ip')
                            expires_at = data.get('expires_at')
                            # Cache it
                            if user_id not in nexus_sessions:
                                nexus_sessions[user_id] = {}
                            nexus_sessions[user_id][challenge_id] = session_id
                        elif resp.status_code == 404:
                            # Nexus explicitly says session doesn't exist
                            logger.info(f"Session {session_id} not in Nexus (404) - marking expired")
                            # Calculate cost when marking as expired
                            await conn.execute("""
                                UPDATE nexus_usage SET 
                                    status = 'expired', 
                                    ended_at = NOW(),
                                    pod_seconds = GREATEST(60, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER),
                                    estimated_cost = GREATEST(0.0001, (EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600.0) * 0.045)
                                WHERE session_id = $1 AND status = 'running'
                            """, session_id)
                            session_valid = False
                        else:
                            # Other error - trust DB, session might still be running
                            logger.warning(f"Nexus returned {resp.status_code} for {session_id} - trusting DB")
                except Exception as e:
                    # Any error (timeout, connection, etc) - trust database
                    logger.warning(f"Nexus check failed for {session_id}: {e} - trusting DB")
                
                if session_valid:
                    return {
                        "session_id": session_id,
                        "target_ip": target_ip,
                        "pod_ip": target_ip,
                        "expires_at": expires_at,
                        "status": "running"
                    }
            else:
                logger.info(f"[NEXUS-SELECT] No running session found in DB for user {user_id}, challenge {challenge_id}")
    except Exception as e:
        logger.error(f"[NEXUS-SELECT] Database error: {e}")
    
    # No active session found
    logger.info(f"[NEXUS-SELECT] Returning status=none for user {user_id}, challenge {challenge_id}")
    return {"status": "none"}


# Nexus Admin Endpoints


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


@api_router.get("/admin/nexus/sessions")
async def admin_list_sessions(current_user: dict = Depends(require_admin)):
    """Admin-only: List all active sessions/pods with details"""
    sessions = []
    
    # 1. Get sessions from Nexus Engine (admin endpoint)
    nexus_sessions = {}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/admin/sessions", timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                for sess in data.get('sessions', []):
                    nexus_sessions[sess.get('id') or sess.get('session_id')] = sess
    except Exception as e:
        logger.warning(f"Failed to fetch Nexus sessions: {e}")
    
    # 2. Get sessions from database (source of truth)
    try:
        pool = await Database.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT 
                    nu.session_id, nu.challenge_id, nu.user_id, nu.status, 
                    nu.started_at, nu.ended_at,
                    COALESCE(nu.pod_seconds, 0) as pod_seconds,
                    COALESCE(nu.estimated_cost, 0) as estimated_cost,
                    c.title as challenge_title,
                    u.name as username
                FROM nexus_usage nu
                LEFT JOIN ctf_public_challenges c ON nu.challenge_id::text = c.id::text
                LEFT JOIN users u ON nu.user_id::text = u.id::text
                WHERE nu.status = 'running'
                ORDER BY nu.started_at DESC
                LIMIT 100
            ''')
            
            for row in rows:
                session_id = row['session_id']
                nexus_data = nexus_sessions.get(session_id, {})
                
                # Check if session is orphaned (in DB as running but not in Nexus)
                is_orphaned = row['status'] == 'running' and session_id not in nexus_sessions and len(nexus_sessions) > 0
                
                sessions.append({
                    'session_id': session_id,
                    'challenge_id': str(row['challenge_id']),
                    'challenge_title': row['challenge_title'] or 'Unknown',
                    'user_id': str(row['user_id']),
                    'username': row['username'] or 'Unknown',
                    'status': row['status'],
                    'target_ip': nexus_data.get('pod_ip') or nexus_data.get('target_ip'),  # Support v3.0 VPN mode
                    'spawn_mode': nexus_data.get('spawn_mode'), # From Nexus
                    'ports': nexus_data.get('ports'),           # From Nexus
                    'started_at': row['started_at'].isoformat() if row['started_at'] else None,
                    'ended_at': row['ended_at'].isoformat() if row['ended_at'] else None,
                    'pod_seconds': int(row['pod_seconds']),
                    'estimated_cost': float(row['estimated_cost']),
                    'is_orphaned': is_orphaned,
                    'in_nexus': session_id in nexus_sessions
                })
    except Exception as e:
        logger.error(f"Failed to fetch sessions from DB: {e}")
    
    return {
        'sessions': sessions,
        'nexus_connected': len(nexus_sessions) > 0 or len(sessions) == 0,
        'total_active': sum(1 for s in sessions if s['status'] == 'running'),
        'total_orphaned': sum(1 for s in sessions if s.get('is_orphaned'))
    }


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
                            estimated_cost = (EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600.0) * 0.045
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
                                # Calculate cost when marking as expired
                                await conn.execute("""
                                    UPDATE nexus_usage SET 
                                        status = 'expired', 
                                        ended_at = COALESCE(ended_at, NOW()),
                                        pod_seconds = GREATEST(60, EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::INTEGER),
                                        estimated_cost = GREATEST(0.0001, (EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 3600.0) * 0.045)
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
    - Total: ~$0.045/hour per instance
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


@api_router.get("/admin/nexus/bigquery-billing")
async def admin_nexus_bigquery_billing(
    days: int = 30,
    current_user: dict = Depends(require_admin)
):
    """
    Get real GCP billing data from BigQuery via Nexus Engine.
    Proxies to Nexus Engine /api/v1/admin/billing endpoint.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{NEXUS_ENGINE_URL}/api/v1/admin/billing",
                params={"days": days},
                timeout=30.0
            )
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 503:
                return {
                    "error": "BigQuery billing not configured on Nexus Engine",
                    "message": "Service account credentials may not be set up",
                    "summary": {"total_cost": 0, "net_cost": 0, "currency": "USD", "projected_monthly": 0},
                    "daily_breakdown": [],
                    "service_breakdown": [],
                    "top_skus": []
                }
            else:
                logger.warning(f"Nexus billing returned {resp.status_code}: {resp.text}")
                return {"error": f"Nexus Engine returned {resp.status_code}"}
    except httpx.TimeoutException:
        return {"error": "Nexus Engine billing request timed out"}
    except Exception as e:
        logger.error(f"BigQuery billing proxy error: {e}")
        return {"error": str(e)}



@api_router.get("/admin/nexus/nodes")
async def admin_nexus_nodes(current_user: dict = Depends(require_admin)):
    """
    Get cluster nodes with external IPs (for hostPort mode monitoring).
    Proxies to Nexus Engine /api/v1/admin/nodes endpoint.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/admin/nodes", timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
            else:
                return {"nodes": [], "count": 0, "error": f"Nexus returned {resp.status_code}"}
    except Exception as e:
        logger.warning(f"Failed to get nodes from Nexus: {e}")
        return {"nodes": [], "count": 0, "error": str(e)}


@api_router.get("/admin/nexus/ports")
async def admin_nexus_ports(current_user: dict = Depends(require_admin)):
    """
    Get port allocations per node (for hostPort mode monitoring).
    Proxies to Nexus Engine /api/v1/admin/ports endpoint.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/admin/ports", timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
            else:
                return {"port_allocations": [], "error": f"Nexus returned {resp.status_code}"}
    except Exception as e:
        logger.warning(f"Failed to get port allocations from Nexus: {e}")
        return {"port_allocations": [], "error": str(e)}


@api_router.get("/admin/nexus/config")
async def admin_nexus_config(current_user: dict = Depends(require_admin)):
    """
    Get Nexus Engine configuration including spawn mode and cluster info.
    Proxies to Nexus Engine /api/v1/admin/config endpoint.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/admin/config", timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
            else:
                # Return default config if Nexus endpoint not available
                return {
                    "default_spawn_mode": "hostport",
                    "available_modes": ["loadbalancer", "hostport"],
                    "clusters": [
                        {
                            "name": "nexus-standard",
                            "type": "GKE Standard",
                            "zone": "asia-south1-a",
                            "hostport": True,
                            "description": "Cost-optimized cluster with hostPort support"
                        },
                        {
                            "name": "nexus-cluster",
                            "type": "GKE Autopilot",
                            "region": "asia-south1",
                            "hostport": False,
                            "description": "Managed cluster with LoadBalancer only"
                        }
                    ]
                }
    except Exception as e:
        logger.warning(f"Failed to get config from Nexus: {e}")
        return {
            "default_spawn_mode": "hostport",
            "available_modes": ["loadbalancer", "hostport"],
            "clusters": [],
            "error": str(e)
        }


@api_router.get("/admin/nexus/vpn/status")
async def admin_nexus_vpn_status(current_user: dict = Depends(require_admin)):
    """
    Get WireGuard VPN status including total users and active connections.
    Proxies to Nexus Engine /api/v1/admin/vpn/stats endpoint.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/admin/vpn/stats", timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
            else:
                return {
                    "total_users": 0,
                    "active_connections": 0,
                    "server_ip": "10.8.0.1",
                    "error": f"Nexus returned {resp.status_code}"
                }
    except Exception as e:
        logger.warning(f"Failed to get VPN status from Nexus: {e}")
        return {
            "total_users": 0,
            "active_connections": 0,
            "server_ip": "10.8.0.1",
            "error": str(e)
        }


@api_router.get("/admin/nexus/cluster/health")
async def admin_nexus_cluster_health(current_user: dict = Depends(require_admin)):
    """
    Get K3s cluster health status including node counts and pod capacity.
    Proxies to Nexus Engine /api/v1/admin/cluster/health endpoint.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/admin/cluster/health", timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
            else:
                return {
                    "status": "unknown",
                    "nodes_ready": 0,
                    "nodes_total": 0,
                    "pod_capacity": 0,
                    "error": f"Nexus returned {resp.status_code}"
                }
    except Exception as e:
        logger.warning(f"Failed to get cluster health from Nexus: {e}")
        return {
            "status": "unknown",
            "nodes_ready": 0,
            "nodes_total": 0,
            "pod_capacity": 0,
            "error": str(e)
        }


@api_router.get("/admin/nexus/vpn/users")
async def admin_nexus_vpn_users(current_user: dict = Depends(require_admin)):
    """
    Get detailed list of all VPN users.
    Proxies to Nexus Engine /api/v1/admin/vpn/users endpoint.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/admin/vpn/users", timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
            else:
                return {"users": [], "total": 0, "error": f"Nexus returned {resp.status_code}"}
    except Exception as e:
        logger.warning(f"Failed to get VPN users from Nexus: {e}")
        return {"users": [], "total": 0, "error": str(e)}


@api_router.get("/admin/nexus/vpn/connections")
async def admin_nexus_vpn_connections(current_user: dict = Depends(require_admin)):
    """
    Get detailed list of active VPN connections.
    Proxies to Nexus Engine /api/v1/admin/vpn/connections endpoint.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/admin/vpn/connections", timeout=15.0)
            if resp.status_code == 200:
                return resp.json()
            else:
                return {"connections": [], "total": 0, "error": f"Nexus returned {resp.status_code}"}
    except Exception as e:
        logger.warning(f"Failed to get VPN connections from Nexus: {e}")
        return {"connections": [], "total": 0, "error": str(e)}


@api_router.get("/admin/nexus/cluster/nodes")
async def admin_nexus_cluster_nodes(current_user: dict = Depends(require_admin)):
    """
    Get detailed list of K3s cluster nodes.
    Proxies to Nexus Engine /api/v1/admin/cluster/nodes endpoint.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NEXUS_ENGINE_URL}/api/v1/admin/cluster/nodes", timeout=15.0)
            if resp.status_code == 200:
                return resp.json()
            else:
                return {"nodes": [], "total": 0, "error": f"Nexus returned {resp.status_code}"}
    except Exception as e:
        logger.warning(f"Failed to get cluster nodes from Nexus: {e}")
        return {"nodes": [], "total": 0, "error": str(e)}


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

            # Migration: Add ports column to challenges table for container port configuration
            try:
                await conn.execute('''
                    ALTER TABLE ctf_public_challenges 
                    ADD COLUMN IF NOT EXISTS ports JSONB DEFAULT '[]'::jsonb
                ''')
                logger.info("Ports column migration complete")
            except Exception as e:
                logger.debug(f"Ports column already exists or migration skipped: {e}")

            # Migration: Add multi-container pack support columns
            try:
                await conn.execute('''
                    ALTER TABLE ctf_public_challenges 
                    ADD COLUMN IF NOT EXISTS "hasDocker" BOOLEAN DEFAULT FALSE,
                    ADD COLUMN IF NOT EXISTS "challengePackId" TEXT,
                    ADD COLUMN IF NOT EXISTS "isMultiContainer" BOOLEAN DEFAULT FALSE
                ''')
                logger.info("Multi-container pack columns migration complete")
            except Exception as e:
                logger.debug(f"Multi-container pack columns already exist or migration skipped: {e}")

            # Migration: Add author column for challenge builder name
            try:
                await conn.execute('''
                    ALTER TABLE ctf_public_challenges 
                    ADD COLUMN IF NOT EXISTS author TEXT
                ''')
                logger.info("Author column migration complete")
            except Exception as e:
                logger.debug(f"Author column already exists or migration skipped: {e}")

            # Migration: Create Module Quiz tables for Coursera-style quiz module
            try:
                await conn.execute('''
                    CREATE TABLE IF NOT EXISTS module_quizzes (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        module_id TEXT NOT NULL,
                        course_id TEXT,
                        title TEXT NOT NULL,
                        description TEXT,
                        time_limit INTEGER NOT NULL DEFAULT 3600,
                        passing_percentage INTEGER NOT NULL DEFAULT 80,
                        max_attempts INTEGER,
                        is_final_quiz BOOLEAN DEFAULT FALSE,
                        is_published BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                ''')
                await conn.execute('''
                    CREATE TABLE IF NOT EXISTS module_quiz_questions (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        quiz_id UUID NOT NULL REFERENCES module_quizzes(id) ON DELETE CASCADE,
                        question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false')),
                        question_text TEXT NOT NULL,
                        options JSONB NOT NULL DEFAULT '[]'::jsonb,
                        correct_answer TEXT NOT NULL,
                        explanation TEXT,
                        order_index INTEGER NOT NULL DEFAULT 0,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                ''')
                await conn.execute('''
                    CREATE TABLE IF NOT EXISTS module_quiz_attempts (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        quiz_id UUID NOT NULL REFERENCES module_quizzes(id) ON DELETE CASCADE,
                        user_id TEXT NOT NULL,
                        attempt_number INTEGER NOT NULL DEFAULT 1,
                        answers JSONB NOT NULL DEFAULT '{}'::jsonb,
                        score INTEGER NOT NULL DEFAULT 0,
                        max_score INTEGER NOT NULL DEFAULT 100,
                        percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
                        passed BOOLEAN DEFAULT FALSE,
                        started_at TIMESTAMP DEFAULT NOW(),
                        completed_at TIMESTAMP,
                        time_spent INTEGER DEFAULT 0,
                        cooldown_until TIMESTAMP,
                        UNIQUE(quiz_id, user_id, attempt_number)
                    )
                ''')
                # Create indexes
                await conn.execute('''
                    CREATE INDEX IF NOT EXISTS idx_quiz_module ON module_quizzes(module_id);
                    CREATE INDEX IF NOT EXISTS idx_quiz_course ON module_quizzes(course_id);
                    CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON module_quiz_questions(quiz_id);
                    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON module_quiz_attempts(quiz_id);
                    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON module_quiz_attempts(user_id);
                ''')
                logger.info("Module quiz tables migration complete")
            except Exception as e:
                logger.debug(f"Module quiz tables already exist or migration skipped: {e}")

    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise
    
    # Start background janitor for Nexus
    asyncio.create_task(nexus_cleanup_janitor_task())


# ===========================================
# FEATURE FLAGS (Superadmin Only)
# ===========================================

class FeatureFlagCreate(BaseModel):
    key: str
    name: str
    description: str = ""
    status: str = "disabled"  # disabled | beta | enabled

class FeatureFlagUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # disabled | beta | enabled


async def ensure_feature_flags_table():
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS feature_flags (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled', 'beta', 'enabled')),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ''')


@api_router.get("/features")
async def get_active_features(current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Get features accessible to the current user.
    - Everyone sees 'enabled' features.
    - Only superadmin sees 'beta' features.
    - 'disabled' features are hidden from everyone.
    """
    await ensure_feature_flags_table()
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT key, name, description, status FROM feature_flags')

        is_superadmin = current_user and current_user.get('role') == 'superadmin'
        features = {}
        for row in rows:
            if row['status'] == 'enabled':
                features[row['key']] = {
                    'name': row['name'],
                    'description': row['description'],
                    'status': row['status'],
                    'beta': False
                }
            elif row['status'] == 'beta' and is_superadmin:
                features[row['key']] = {
                    'name': row['name'],
                    'description': row['description'],
                    'status': row['status'],
                    'beta': True
                }
            # 'disabled' features are never returned

        return features


@api_router.get("/admin/features")
async def list_feature_flags(admin: dict = Depends(require_superadmin)):
    """List all feature flags (superadmin only)"""
    await ensure_feature_flags_table()
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT id, key, name, description, status, created_at, updated_at FROM feature_flags ORDER BY created_at DESC'
        )
        return [dict(r) for r in rows]


@api_router.post("/admin/features")
async def create_feature_flag(flag: FeatureFlagCreate, admin: dict = Depends(require_superadmin)):
    """Create a new feature flag (superadmin only)"""
    if flag.status not in ('disabled', 'beta', 'enabled'):
        raise HTTPException(status_code=400, detail="Status must be: disabled, beta, or enabled")

    await ensure_feature_flags_table()
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow('SELECT id FROM feature_flags WHERE key = $1', flag.key)
        if existing:
            raise HTTPException(status_code=409, detail="Feature flag with this key already exists")

        row = await conn.fetchrow('''
            INSERT INTO feature_flags (key, name, description, status)
            VALUES ($1, $2, $3, $4)
            RETURNING id, key, name, description, status, created_at, updated_at
        ''', flag.key, flag.name, flag.description, flag.status)

        logger.info(f"Feature flag created: {flag.key} ({flag.status}) by {admin.get('username')}")
        return dict(row)


@api_router.put("/admin/features/{flag_key}")
async def update_feature_flag(flag_key: str, update: FeatureFlagUpdate, admin: dict = Depends(require_superadmin)):
    """Update a feature flag (superadmin only)"""
    if update.status and update.status not in ('disabled', 'beta', 'enabled'):
        raise HTTPException(status_code=400, detail="Status must be: disabled, beta, or enabled")

    await ensure_feature_flags_table()
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow('SELECT * FROM feature_flags WHERE key = $1', flag_key)
        if not existing:
            raise HTTPException(status_code=404, detail="Feature flag not found")

        new_name = update.name if update.name is not None else existing['name']
        new_desc = update.description if update.description is not None else existing['description']
        new_status = update.status if update.status is not None else existing['status']

        row = await conn.fetchrow('''
            UPDATE feature_flags SET name = $1, description = $2, status = $3, updated_at = NOW()
            WHERE key = $4
            RETURNING id, key, name, description, status, created_at, updated_at
        ''', new_name, new_desc, new_status, flag_key)

        logger.info(f"Feature flag updated: {flag_key} -> {new_status} by {admin.get('username')}")
        return dict(row)


@api_router.delete("/admin/features/{flag_key}")
async def delete_feature_flag(flag_key: str, admin: dict = Depends(require_superadmin)):
    """Delete a feature flag (superadmin only)"""
    await ensure_feature_flags_table()
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM feature_flags WHERE key = $1', flag_key)
        if result == 'DELETE 0':
            raise HTTPException(status_code=404, detail="Feature flag not found")

        logger.info(f"Feature flag deleted: {flag_key} by {admin.get('username')}")
        return {"message": f"Feature flag '{flag_key}' deleted"}



# ===========================================
# ADMIN: SESSION MANAGEMENT (Superadmin Only)
# ===========================================

@api_router.get("/admin/sessions/active")
async def get_all_active_sessions(admin: dict = Depends(require_superadmin)):
    """Get all active sessions across all users (superadmin only)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        # Clean up expired sessions first
        await conn.execute('''
            UPDATE ctf_active_sessions 
            SET is_active = false 
            WHERE expires_at < NOW() AND is_active = true
        ''')
        
        # Also clean up stale sessions (2+ hours inactive)
        await conn.execute('''
            UPDATE ctf_active_sessions 
            SET is_active = false 
            WHERE is_active = true 
            AND last_activity_at < NOW() - INTERVAL '2 hours'
        ''')
        
        sessions = await conn.fetch('''
            SELECT 
                s.id, s.user_id, s.ip_address, s.user_agent, 
                s.created_at, s.last_activity_at, s.expires_at,
                u.name as user_name, u.email as user_email, u.avatar_url
            FROM ctf_active_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.is_active = true
            ORDER BY s.last_activity_at DESC
        ''')
        
        # Helper to parse datetime
        def fmt(dt): return dt.isoformat() if dt else None
            
        return [
            {
                "id": str(s['id']),
                "user_id": str(s['user_id']),
                "user_name": s['user_name'],
                "user_email": s['user_email'],
                "user_avatar": s['avatar_url'],
                "ip_address": s['ip_address'],
                "user_agent": s['user_agent'],
                "created_at": fmt(s['created_at']),
                "last_activity_at": fmt(s['last_activity_at']),
                "expires_at": fmt(s['expires_at']),
            }
            for s in sessions
        ]


@api_router.delete("/admin/sessions/active/{session_id}")
async def force_logout_session(session_id: str, admin: dict = Depends(require_superadmin)):
    """Force logout a specific session (superadmin only)"""
    pool = await Database.get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute('UPDATE ctf_active_sessions SET is_active = false WHERE id::text = $1', session_id)
        
        if result == 'UPDATE 0':
            raise HTTPException(status_code=404, detail="Session not found or already inactive")
            
        logger.info(f"Superadmin {admin['username']} terminated session {session_id}")
        return {"success": True, "message": "Session terminated successfully"}


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
