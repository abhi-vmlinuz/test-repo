from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import docker
from docker.errors import DockerException

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'ctf-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Docker client
try:
    docker_client = docker.from_env()
except DockerException:
    docker_client = None
    logging.warning("Docker is not available. Container features will be disabled.")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    score: int = 0
    role: str = "user"  # user, admin, superadmin
    is_banned: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    icon: str

class Hint(BaseModel):
    text: str
    cost: int

class Challenge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: str
    title: str
    description: str
    difficulty: str  # easy, medium, hard
    points: int
    flag: Optional[str] = None  # Hidden from public listing
    docker_image: Optional[str] = None
    docker_command: Optional[str] = None
    hints: List[Hint] = []
    solves: int = 0

class FlagSubmit(BaseModel):
    challenge_id: str
    flag: str

class HintRequest(BaseModel):
    challenge_id: str
    hint_index: int

class UserProgress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    challenge_id: str
    solved: bool = False
    hints_used: List[int] = []
    score_earned: int = 0
    solved_at: Optional[datetime] = None

class DockerInstance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    challenge_id: str
    container_id: Optional[str] = None
    port: Optional[int] = None
    status: str  # starting, running, stopped, error
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=2))

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        user = await db.users.find_one({'id': user_id}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get('is_banned', False):
            raise HTTPException(status_code=403, detail="Account is banned")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Role-based access control helpers
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

# Routes
@api_router.get("/")
async def root():
    return {"message": "CTF Platform API"}

# Auth routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({'$or': [{'email': user_data.email}, {'username': user_data.username}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email
    )
    
    user_doc = user.model_dump()
    user_doc['password_hash'] = hash_password(user_data.password)
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user.id)
    return {'token': token, 'user': user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'])
    user_data = User(**{k: v for k, v in user.items() if k != 'password_hash'})
    return {'token': token, 'user': user_data}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

# Category routes
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {'_id': 0}).to_list(100)
    return categories

# Challenge routes
@api_router.get("/challenges", response_model=List[Challenge])
async def get_challenges(category_id: Optional[str] = None):
    query = {'category_id': category_id} if category_id else {}
    challenges = await db.challenges.find(query, {'_id': 0, 'flag': 0}).to_list(100)
    
    # Remove question flags from response (keep question text and points only)
    for challenge in challenges:
        if 'questions' in challenge:
            challenge['questions'] = [
                {'question': q['question'], 'points': q.get('points', 25)}
                for q in challenge['questions']
            ]
    
    return challenges

@api_router.get("/challenges/{challenge_id}")
async def get_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    challenge = await db.challenges.find_one({'id': challenge_id}, {'_id': 0, 'flag': 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Remove question flags from response (keep question text and points only)
    if 'questions' in challenge:
        challenge['questions'] = [
            {'question': q['question'], 'points': q.get('points', 25)}
            for q in challenge['questions']
        ]
    
    # Get user progress
    progress = await db.user_progress.find_one(
        {'user_id': current_user['id'], 'challenge_id': challenge_id},
        {'_id': 0}
    )
    
    challenge['user_progress'] = progress
    return challenge

# Flag submission
@api_router.post("/submit")
async def submit_flag(submission: FlagSubmit, current_user: dict = Depends(get_current_user)):
    # Get challenge
    challenge = await db.challenges.find_one({'id': submission.challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Check if already solved
    progress = await db.user_progress.find_one({
        'user_id': current_user['id'],
        'challenge_id': submission.challenge_id
    })
    
    if progress and progress.get('solved'):
        return {'correct': True, 'message': 'Already solved', 'points': 0}
    
    # Validate flag
    is_correct = submission.flag.strip() == challenge['flag'].strip()
    
    if is_correct:
        # Calculate points (deduct hint costs)
        hints_cost = 0
        if progress:
            for hint_idx in progress.get('hints_used', []):
                if hint_idx < len(challenge['hints']):
                    hints_cost += challenge['hints'][hint_idx]['cost']
        
        points_earned = max(challenge['points'] - hints_cost, 0)
        
        # Update or create progress
        progress_data = {
            'user_id': current_user['id'],
            'challenge_id': submission.challenge_id,
            'solved': True,
            'hints_used': progress.get('hints_used', []) if progress else [],
            'score_earned': points_earned,
            'solved_at': datetime.now(timezone.utc).isoformat()
        }
        
        if not progress:
            progress_data['id'] = str(uuid.uuid4())
            await db.user_progress.insert_one(progress_data)
        else:
            await db.user_progress.update_one(
                {'user_id': current_user['id'], 'challenge_id': submission.challenge_id},
                {'$set': progress_data}
            )
        
        # Update user score
        await db.users.update_one(
            {'id': current_user['id']},
            {'$inc': {'score': points_earned}}
        )
        
        # Update challenge solves count
        await db.challenges.update_one(
            {'id': submission.challenge_id},
            {'$inc': {'solves': 1}}
        )
        
        return {'correct': True, 'message': 'Correct flag!', 'points': points_earned}
    else:
        return {'correct': False, 'message': 'Incorrect flag', 'points': 0}

# Question submission (for multi-question challenges)
class QuestionSubmit(BaseModel):
    challenge_id: str
    question_index: int
    flag: str

@api_router.post("/submit-question")
async def submit_question_flag(submission: QuestionSubmit, current_user: dict = Depends(get_current_user)):
    # Get challenge
    challenge = await db.challenges.find_one({'id': submission.challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Check if questions exist
    questions = challenge.get('questions', [])
    if submission.question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Invalid question index")
    
    question = questions[submission.question_index]
    
    # Get or create progress
    progress = await db.user_progress.find_one({
        'user_id': current_user['id'],
        'challenge_id': submission.challenge_id
    })
    
    solved_questions = progress.get('solved_questions', []) if progress else []
    
    # Check if already solved
    if submission.question_index in solved_questions:
        return {'correct': True, 'message': 'Already solved', 'points': 0}
    
    # Validate flag
    is_correct = submission.flag.strip() == question['flag'].strip()
    
    if is_correct:
        points_earned = question.get('points', 25)
        solved_questions.append(submission.question_index)
        
        # Update or create progress
        if progress:
            await db.user_progress.update_one(
                {'user_id': current_user['id'], 'challenge_id': submission.challenge_id},
                {
                    '$set': {'solved_questions': solved_questions},
                    '$inc': {'score_earned': points_earned}
                }
            )
        else:
            progress_data = {
                'id': str(uuid.uuid4()),
                'user_id': current_user['id'],
                'challenge_id': submission.challenge_id,
                'solved': False,
                'hints_used': [],
                'score_earned': points_earned,
                'solved_questions': solved_questions
            }
            await db.user_progress.insert_one(progress_data)
        
        # Update user score
        await db.users.update_one(
            {'id': current_user['id']},
            {'$inc': {'score': points_earned}}
        )
        
        return {'correct': True, 'message': 'Correct!', 'points': points_earned}
    else:
        return {'correct': False, 'message': 'Incorrect answer', 'points': 0}

# Hints
@api_router.post("/hints")
async def unlock_hint(hint_request: HintRequest, current_user: dict = Depends(get_current_user)):
    # Get challenge
    challenge = await db.challenges.find_one({'id': hint_request.challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if hint_request.hint_index >= len(challenge['hints']):
        raise HTTPException(status_code=404, detail="Hint not found")
    
    # Get or create progress
    progress = await db.user_progress.find_one({
        'user_id': current_user['id'],
        'challenge_id': hint_request.challenge_id
    })
    
    if not progress:
        progress_data = {
            'id': str(uuid.uuid4()),
            'user_id': current_user['id'],
            'challenge_id': hint_request.challenge_id,
            'solved': False,
            'hints_used': [],
            'score_earned': 0
        }
        await db.user_progress.insert_one(progress_data)
        progress = progress_data
    
    # Check if hint already unlocked
    if hint_request.hint_index in progress.get('hints_used', []):
        hint = challenge['hints'][hint_request.hint_index]
        return {'hint': hint['text'], 'cost': 0, 'already_unlocked': True}
    
    # Unlock hint
    hint = challenge['hints'][hint_request.hint_index]
    await db.user_progress.update_one(
        {'user_id': current_user['id'], 'challenge_id': hint_request.challenge_id},
        {'$push': {'hints_used': hint_request.hint_index}}
    )
    
    return {'hint': hint['text'], 'cost': hint['cost'], 'already_unlocked': False}

# Leaderboard
@api_router.get("/leaderboard")
async def get_leaderboard(limit: int = 100):
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).sort('score', -1).limit(limit).to_list(limit)
    return users

# Docker instances
@api_router.post("/docker/start/{challenge_id}")
async def start_docker_instance(challenge_id: str, current_user: dict = Depends(get_current_user)):
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker service unavailable")
    
    # Get challenge
    challenge = await db.challenges.find_one({'id': challenge_id})
    if not challenge or not challenge.get('docker_image'):
        raise HTTPException(status_code=404, detail="Challenge or Docker image not found")
    
    # Check for existing instance
    existing = await db.docker_instances.find_one({
        'user_id': current_user['id'],
        'challenge_id': challenge_id,
        'status': {'$in': ['running', 'starting']}
    })
    
    if existing:
        return {'instance_id': existing['id'], 'status': existing['status'], 'port': existing.get('port')}
    
    # Create new instance
    instance = DockerInstance(
        user_id=current_user['id'],
        challenge_id=challenge_id,
        status='starting'
    )
    
    instance_doc = instance.model_dump()
    instance_doc['created_at'] = instance_doc['created_at'].isoformat()
    instance_doc['expires_at'] = instance_doc['expires_at'].isoformat()
    
    await db.docker_instances.insert_one(instance_doc)
    
    # Start container (simplified - in production, use proper port mapping and security)
    try:
        container = docker_client.containers.run(
            challenge['docker_image'],
            command=challenge.get('docker_command'),
            detach=True,
            remove=True,
            name=f"ctf_{current_user['id'][:8]}_{challenge_id[:8]}"
        )
        
        await db.docker_instances.update_one(
            {'id': instance.id},
            {'$set': {'container_id': container.id, 'status': 'running'}}
        )
        
        return {'instance_id': instance.id, 'status': 'running', 'container_id': container.id}
    except Exception as e:
        await db.docker_instances.update_one(
            {'id': instance.id},
            {'$set': {'status': 'error'}}
        )
        raise HTTPException(status_code=500, detail=f"Failed to start container: {str(e)}")

@api_router.get("/docker/status/{instance_id}")
async def get_docker_status(instance_id: str, current_user: dict = Depends(get_current_user)):
    instance = await db.docker_instances.find_one(
        {'id': instance_id, 'user_id': current_user['id']},
        {'_id': 0}
    )
    
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    
    return instance

# User stats
@api_router.get("/stats/me")
async def get_my_stats(current_user: dict = Depends(get_current_user)):
    solved = await db.user_progress.count_documents({'user_id': current_user['id'], 'solved': True})
    total = await db.challenges.count_documents({})
    
    # Calculate user's rank (count users with higher score + 1)
    users_above = await db.users.count_documents({'score': {'$gt': current_user['score']}})
    rank = users_above + 1
    
    # Get solves by category
    categories = await db.categories.find({}, {'_id': 0}).to_list(100)
    category_stats = []
    
    for category in categories:
        category_challenges = await db.challenges.find({'category_id': category['id']}, {'_id': 0, 'id': 1}).to_list(100)
        challenge_ids = [c['id'] for c in category_challenges]
        
        solved_count = await db.user_progress.count_documents({
            'user_id': current_user['id'],
            'challenge_id': {'$in': challenge_ids},
            'solved': True
        })
        
        category_stats.append({
            'category': category['name'],
            'solved': solved_count,
            'total': len(challenge_ids)
        })
    
    return {
        'total_score': current_user['score'],
        'challenges_solved': solved,
        'total_challenges': total,
        'rank': rank,
        'category_stats': category_stats
    }

# ============================================
# ADMIN API ENDPOINTS
# ============================================

# Admin Models
class Question(BaseModel):
    question: str
    flag: str
    points: int = 25

class ChallengeCreate(BaseModel):
    title: str
    description: str
    category_id: str
    difficulty: str
    points: int
    flag: str
    docker_image: Optional[str] = None
    docker_command: Optional[str] = None
    hints: List[Hint] = []
    questions: List[Question] = []  # Multi-flag support
    is_published: bool = True

class ChallengeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    difficulty: Optional[str] = None
    points: Optional[int] = None
    flag: Optional[str] = None
    docker_image: Optional[str] = None
    docker_command: Optional[str] = None
    hints: Optional[List[Hint]] = None
    questions: Optional[List[Question]] = None  # Multi-flag support
    is_published: Optional[bool] = None

class CategoryCreate(BaseModel):
    name: str
    description: str
    icon: str

class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_banned: Optional[bool] = None
    score: Optional[int] = None

# Admin Dashboard
@api_router.get("/admin/dashboard")
async def admin_dashboard(admin: dict = Depends(require_admin)):
    """Get admin dashboard statistics"""
    total_users = await db.users.count_documents({})
    total_challenges = await db.challenges.count_documents({})
    total_categories = await db.categories.count_documents({})
    total_submissions = await db.user_progress.count_documents({})
    correct_submissions = await db.user_progress.count_documents({'solved': True})
    
    # Active docker instances
    active_containers = await db.docker_instances.count_documents({'status': 'running'})
    
    # Top users by score
    top_users = await db.users.find(
        {}, 
        {'_id': 0, 'password_hash': 0}
    ).sort('score', -1).limit(5).to_list(5)
    
    # Recent activity (last 10 solves)
    recent_solves = await db.user_progress.find(
        {'solved': True},
        {'_id': 0}
    ).sort('solved_at', -1).limit(10).to_list(10)
    
    # Enrich with user and challenge names
    for solve in recent_solves:
        user = await db.users.find_one({'id': solve['user_id']}, {'username': 1})
        challenge = await db.challenges.find_one({'id': solve['challenge_id']}, {'title': 1})
        solve['username'] = user['username'] if user else 'Unknown'
        solve['challenge_title'] = challenge['title'] if challenge else 'Unknown'
    
    return {
        'total_users': total_users,
        'total_challenges': total_challenges,
        'total_categories': total_categories,
        'total_submissions': total_submissions,
        'correct_submissions': correct_submissions,
        'active_containers': active_containers,
        'top_users': top_users,
        'recent_solves': recent_solves
    }

# Challenge Management
@api_router.get("/admin/challenges")
async def admin_get_challenges(admin: dict = Depends(require_admin)):
    """Get all challenges with full details (including flags)"""
    challenges = await db.challenges.find({}, {'_id': 0}).to_list(1000)
    return challenges

@api_router.post("/admin/challenges")
async def admin_create_challenge(challenge_data: ChallengeCreate, admin: dict = Depends(require_admin)):
    """Create a new challenge"""
    # Generate consistent ID from title
    import hashlib
    seed = f"challenge:{challenge_data.title}"
    hash_bytes = hashlib.sha256(seed.encode()).hexdigest()
    challenge_id = f"{hash_bytes[:8]}-{hash_bytes[8:12]}-{hash_bytes[12:16]}-{hash_bytes[16:20]}-{hash_bytes[20:32]}"
    
    # Check if already exists
    existing = await db.challenges.find_one({'id': challenge_id})
    if existing:
        raise HTTPException(status_code=400, detail="Challenge with this title already exists")
    
    challenge = {
        'id': challenge_id,
        'title': challenge_data.title,
        'description': challenge_data.description,
        'category_id': challenge_data.category_id,
        'difficulty': challenge_data.difficulty,
        'points': challenge_data.points,
        'flag': challenge_data.flag,
        'docker_image': challenge_data.docker_image,
        'docker_command': challenge_data.docker_command,
        'hints': [h.model_dump() for h in challenge_data.hints],
        'questions': [q.model_dump() for q in challenge_data.questions],
        'is_published': challenge_data.is_published,
        'solves': 0
    }
    
    await db.challenges.insert_one(challenge)
    return {'message': 'Challenge created', 'id': challenge_id}

@api_router.put("/admin/challenges/{challenge_id}")
async def admin_update_challenge(challenge_id: str, update_data: ChallengeUpdate, admin: dict = Depends(require_admin)):
    """Update an existing challenge"""
    challenge = await db.challenges.find_one({'id': challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if 'hints' in update_dict:
        update_dict['hints'] = [h if isinstance(h, dict) else h.model_dump() for h in update_dict['hints']]
    if 'questions' in update_dict:
        update_dict['questions'] = [q if isinstance(q, dict) else q.model_dump() for q in update_dict['questions']]
    
    if update_dict:
        await db.challenges.update_one({'id': challenge_id}, {'$set': update_dict})
    
    return {'message': 'Challenge updated'}

@api_router.delete("/admin/challenges/{challenge_id}")
async def admin_delete_challenge(challenge_id: str, admin: dict = Depends(require_admin)):
    """Delete a challenge"""
    result = await db.challenges.delete_one({'id': challenge_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Also delete related user progress
    await db.user_progress.delete_many({'challenge_id': challenge_id})
    
    return {'message': 'Challenge deleted'}

# Category Management
@api_router.get("/admin/categories")
async def admin_get_categories(admin: dict = Depends(require_admin)):
    """Get all categories"""
    categories = await db.categories.find({}, {'_id': 0}).to_list(100)
    return categories

@api_router.post("/admin/categories")
async def admin_create_category(category_data: CategoryCreate, admin: dict = Depends(require_admin)):
    """Create a new category"""
    import hashlib
    seed = f"category:{category_data.name}"
    hash_bytes = hashlib.sha256(seed.encode()).hexdigest()
    category_id = f"{hash_bytes[:8]}-{hash_bytes[8:12]}-{hash_bytes[12:16]}-{hash_bytes[16:20]}-{hash_bytes[20:32]}"
    
    existing = await db.categories.find_one({'id': category_id})
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    category = {
        'id': category_id,
        'name': category_data.name,
        'description': category_data.description,
        'icon': category_data.icon
    }
    
    await db.categories.insert_one(category)
    return {'message': 'Category created', 'id': category_id}

@api_router.put("/admin/categories/{category_id}")
async def admin_update_category(category_id: str, category_data: CategoryCreate, admin: dict = Depends(require_admin)):
    """Update a category"""
    result = await db.categories.update_one(
        {'id': category_id},
        {'$set': {
            'name': category_data.name,
            'description': category_data.description,
            'icon': category_data.icon
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {'message': 'Category updated'}

@api_router.delete("/admin/categories/{category_id}")
async def admin_delete_category(category_id: str, admin: dict = Depends(require_admin)):
    """Delete a category (warning: doesn't delete associated challenges)"""
    result = await db.categories.delete_one({'id': category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {'message': 'Category deleted'}

# User Management
@api_router.get("/admin/users")
async def admin_get_users(admin: dict = Depends(require_admin)):
    """Get all users"""
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(10000)
    return users

# IMPORTANT: This route MUST come BEFORE /admin/users/{user_id} to avoid 'search' being matched as user_id
@api_router.get("/admin/users/search")
async def admin_search_users_for_notifications(q: str = "", admin: dict = Depends(require_admin)):
    """Search users by username or email for notifications"""
    if not q or q.strip() == "":
        # Return first 20 users when no query
        users = await db.users.find(
            {}, 
            {'_id': 0, 'id': 1, 'username': 1, 'email': 1}
        ).limit(20).to_list(20)
    else:
        # Search by username or email
        query = q.strip()
        users = await db.users.find({
            '$or': [
                {'username': {'$regex': query, '$options': 'i'}},
                {'email': {'$regex': query, '$options': 'i'}}
            ]
        }, {'_id': 0, 'id': 1, 'username': 1, 'email': 1}).limit(20).to_list(20)
    return users

@api_router.get("/admin/users/{user_id}")
async def admin_get_user(user_id: str, admin: dict = Depends(require_admin)):
    """Get user details with their progress"""
    user = await db.users.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's solved challenges
    progress = await db.user_progress.find({'user_id': user_id, 'solved': True}, {'_id': 0}).to_list(1000)
    
    # Enrich with challenge titles
    for p in progress:
        challenge = await db.challenges.find_one({'id': p['challenge_id']}, {'title': 1, 'points': 1})
        p['challenge_title'] = challenge['title'] if challenge else 'Unknown'
        p['challenge_points'] = challenge['points'] if challenge else 0
    
    user['solved_challenges'] = progress
    return user

@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, update_data: UserUpdate, admin: dict = Depends(require_admin)):
    """Update user (ban, change role, adjust score)"""
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only superadmin can change roles
    if update_data.role is not None:
        if admin.get('role') != 'superadmin':
            raise HTTPException(status_code=403, detail="Only superadmin can change user roles")
        if update_data.role not in ['user', 'admin', 'superadmin']:
            raise HTTPException(status_code=400, detail="Invalid role")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.users.update_one({'id': user_id}, {'$set': update_dict})
    
    return {'message': 'User updated'}

@api_router.post("/admin/users/{user_id}/reset-progress")
async def admin_reset_user_progress(user_id: str, admin: dict = Depends(require_admin)):
    """Reset user's progress and score"""
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete all progress
    await db.user_progress.delete_many({'user_id': user_id})
    
    # Reset score
    await db.users.update_one({'id': user_id}, {'$set': {'score': 0}})
    
    return {'message': 'User progress reset'}

# Submissions Log
@api_router.get("/admin/submissions")
async def admin_get_submissions(
    admin: dict = Depends(require_admin),
    limit: int = 100,
    user_id: Optional[str] = None,
    challenge_id: Optional[str] = None,
    solved_only: bool = False
):
    """Get submission logs"""
    query = {}
    if user_id:
        query['user_id'] = user_id
    if challenge_id:
        query['challenge_id'] = challenge_id
    if solved_only:
        query['solved'] = True
    
    submissions = await db.user_progress.find(query, {'_id': 0}).sort('solved_at', -1).limit(limit).to_list(limit)
    
    # Enrich with names
    for sub in submissions:
        user = await db.users.find_one({'id': sub['user_id']}, {'username': 1})
        challenge = await db.challenges.find_one({'id': sub['challenge_id']}, {'title': 1})
        sub['username'] = user['username'] if user else 'Unknown'
        sub['challenge_title'] = challenge['title'] if challenge else 'Unknown'
    
    return submissions

# ============================================
# STUDENT PORTAL API ENDPOINTS
# ============================================

# Student Models
class StudentFlag(BaseModel):
    flag: str
    points: int = 50
    description: str

class StudentChallengeCreate(BaseModel):
    title: str
    short_description: str
    context: str  # Learning material/explanation
    course_id: str
    module_id: str
    topic_number: int
    topic_name: str
    is_capstone: bool = False
    docker_image: Optional[str] = None
    docker_compose: Optional[str] = None
    flags: List[StudentFlag] = []
    hints: List[Hint] = []
    points: int = 100
    order: int = 0

class CourseCreate(BaseModel):
    code: str  # e.g., ZxCPENT
    name: str
    description: str
    duration: str = "40+ hours"
    color: str = "gray"  # gray, blue, purple, green, red, orange, indigo, teal, pink, cyan

class CourseUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    color: Optional[str] = None

class ModuleCreate(BaseModel):
    course_id: str
    name: str
    description: str
    order: int
    has_capstone: bool = True

class InviteCodeCreate(BaseModel):
    course_id: str
    max_uses: int = 1
    expires_days: int = 30

class StudentRegister(BaseModel):
    email: str
    password: str
    username: str
    invite_code: str

class StudentFlagSubmit(BaseModel):
    challenge_id: str
    flag_index: int
    flag: str

# Student Authentication
@api_router.post("/student/register")
async def student_register(data: StudentRegister):
    """Register a student with invite code"""
    # Validate invite code
    invite = await db.invite_codes.find_one({
        'code': data.invite_code.upper(),
        'is_active': True
    })
    
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invite code")
    
    if invite.get('uses', 0) >= invite.get('max_uses', 1):
        raise HTTPException(status_code=400, detail="Invite code has been fully used")
    
    if invite.get('expires_at') and invite['expires_at'] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite code has expired")
    
    # Check if email/username exists
    existing = await db.users.find_one({'$or': [{'email': data.email}, {'username': data.username}]})
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already exists")
    
    # Create user
    user_id = str(uuid.uuid4())
    password_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    
    user = {
        'id': user_id,
        'email': data.email,
        'username': data.username,
        'password_hash': password_hash,
        'role': 'student',
        'score': 0,
        'created_at': datetime.now(timezone.utc),
        'is_banned': False
    }
    await db.users.insert_one(user)
    
    # Create enrollment for the course
    enrollment = {
        'id': str(uuid.uuid4()),
        'user_id': user_id,
        'course_id': invite['course_id'],
        'enrolled_at': datetime.now(timezone.utc),
        'progress': 0
    }
    await db.student_enrollments.insert_one(enrollment)
    
    # Update invite code usage
    await db.invite_codes.update_one(
        {'_id': invite['_id']},
        {'$inc': {'uses': 1}}
    )
    
    # Generate token
    token = jwt.encode({
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        'access_token': token,
        'user': {
            'id': user_id,
            'username': data.username,
            'email': data.email,
            'role': 'student'
        }
    }

@api_router.post("/student/login")
async def student_login(credentials: UserLogin):
    """Student login"""
    user = await db.users.find_one({'email': credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(credentials.password.encode(), user['password_hash'].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get('is_banned'):
        raise HTTPException(status_code=403, detail="Account is banned")
    
    token = jwt.encode({
        'user_id': user['id'],
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        'access_token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user.get('role', 'user')
        }
    }

# Student Stats
@api_router.get("/student/stats")
async def get_student_stats(current_user: dict = Depends(get_current_user)):
    """Get student dashboard stats"""
    user_id = current_user['id']
    
    # Count enrollments
    enrolled_courses = await db.student_enrollments.count_documents({'user_id': user_id})
    
    # Count solved challenges
    solved_progress = await db.student_progress.find({
        'user_id': user_id,
        'completed': True
    }).to_list(1000)
    challenges_solved = len(solved_progress)
    
    # Calculate total points
    total_points = sum(p.get('points_earned', 0) for p in solved_progress)
    
    # Get recent activity
    recent = await db.student_progress.find({
        'user_id': user_id
    }).sort('updated_at', -1).limit(5).to_list(5)
    
    recent_activity = []
    for r in recent:
        challenge = await db.student_challenges.find_one({'id': r['challenge_id']}, {'title': 1})
        recent_activity.append({
            'type': 'solve' if r.get('completed') else 'progress',
            'title': challenge['title'] if challenge else 'Unknown',
            'points': r.get('points_earned', 0),
            'time_ago': 'Recently'
        })
    
    return {
        'enrolled_courses': enrolled_courses,
        'challenges_solved': challenges_solved,
        'total_points': total_points,
        'streak': 0,  # TODO: Calculate streak
        'recent_activity': recent_activity
    }

# Student Enrollments
@api_router.get("/student/enrollments")
async def get_student_enrollments(current_user: dict = Depends(get_current_user)):
    """Get student's enrolled courses"""
    user_id = current_user['id']
    
    enrollments = await db.student_enrollments.find({'user_id': user_id}, {'_id': 0}).to_list(100)
    
    result = []
    for enrollment in enrollments:
        course = await db.courses.find_one({'id': enrollment['course_id']}, {'_id': 0})
        if course:
            # Count modules and challenges
            modules = await db.modules.find({'course_id': course['id']}).to_list(100)
            challenges = await db.student_challenges.find({'course_id': course['id']}).to_list(1000)
            
            # Calculate progress
            solved = await db.student_progress.count_documents({
                'user_id': user_id,
                'course_id': course['id'],
                'completed': True
            })
            progress = int((solved / len(challenges) * 100)) if challenges else 0
            
            result.append({
                'course_id': course['id'],
                'course_code': course.get('code', ''),
                'course_name': course['name'],
                'course_description': course.get('description', ''),
                'modules_count': len(modules),
                'challenges_count': len(challenges),
                'total_points': sum(c.get('points', 0) for c in challenges),
                'progress': progress,
                'duration': course.get('duration', '40+ hours'),
                'color': course.get('color', 'gray')
            })
    
    return {'enrollments': result}

# Join Course with enrollment code
class JoinCourseRequest(BaseModel):
    enrollment_code: str

@api_router.post("/student/join-course")
async def join_course(data: JoinCourseRequest, current_user: dict = Depends(get_current_user)):
    """Join a course using enrollment code"""
    # Find the enrollment code
    code_record = await db.enrollment_codes.find_one({
        'code': data.enrollment_code.upper(),
        'is_active': True
    })
    
    if not code_record:
        raise HTTPException(status_code=400, detail="Invalid enrollment code")
    
    if code_record.get('user_id') and code_record['user_id'] != current_user['id']:
        raise HTTPException(status_code=400, detail="This code is assigned to a different user")
    
    # Check expiration - handle both timezone-aware and naive datetimes
    if code_record.get('expires_at'):
        expires_at = code_record['expires_at']
        # Make timezone-aware if naive
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Enrollment code has expired")
    
    # Check if already enrolled
    existing = await db.student_enrollments.find_one({
        'user_id': current_user['id'],
        'course_id': code_record['course_id']
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    # Create enrollment
    enrollment = {
        'id': str(uuid.uuid4()),
        'user_id': current_user['id'],
        'course_id': code_record['course_id'],
        'enrolled_at': datetime.now(timezone.utc),
        'progress': 0,
        'enrollment_code': code_record['code']
    }
    await db.student_enrollments.insert_one(enrollment)
    
    # Mark code as used
    await db.enrollment_codes.update_one(
        {'_id': code_record['_id']},
        {'$set': {'is_active': False, 'used_at': datetime.now(timezone.utc), 'used_by': current_user['id']}}
    )
    
    # Get course name for response
    course = await db.courses.find_one({'id': code_record['course_id']}, {'name': 1})
    
    return {'message': 'Successfully enrolled', 'course_name': course['name'] if course else 'Course'}

# Get Course Details
@api_router.get("/student/courses/{course_id}")
async def get_student_course(course_id: str, current_user: dict = Depends(get_current_user)):
    """Get course details with modules"""
    # Verify enrollment
    enrollment = await db.student_enrollments.find_one({
        'user_id': current_user['id'],
        'course_id': course_id
    })
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    course = await db.courses.find_one({'id': course_id}, {'_id': 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    modules = await db.modules.find({'course_id': course_id}, {'_id': 0}).sort('order', 1).to_list(100)
    
    # Get progress for each module
    progress = {'overall': 0, 'modules': {}}
    total_challenges = 0
    total_solved = 0
    
    for module in modules:
        challenges = await db.student_challenges.find({'module_id': module['id']}).to_list(100)
        solved = await db.student_progress.count_documents({
            'user_id': current_user['id'],
            'module_id': module['id'],
            'completed': True
        })
        
        module['challenges_count'] = len(challenges)
        module['topics_count'] = len(set(c.get('topic_number', 0) for c in challenges))
        module['points'] = sum(c.get('points', 0) for c in challenges)
        
        total_challenges += len(challenges)
        total_solved += solved
        
        progress['modules'][module['id']] = {
            'percentage': int((solved / len(challenges) * 100)) if challenges else 0,
            'started': solved > 0,
            'completed': solved == len(challenges) and len(challenges) > 0
        }
    
    progress['overall'] = int((total_solved / total_challenges * 100)) if total_challenges else 0
    course['total_points'] = sum(m.get('points', 0) for m in modules)
    
    return {'course': course, 'modules': modules, 'progress': progress}

# Get Module Details
@api_router.get("/student/modules/{module_id}")
async def get_student_module(module_id: str, current_user: dict = Depends(get_current_user)):
    """Get module with challenges"""
    module = await db.modules.find_one({'id': module_id}, {'_id': 0})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Verify enrollment
    enrollment = await db.student_enrollments.find_one({
        'user_id': current_user['id'],
        'course_id': module['course_id']
    })
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    challenges = await db.student_challenges.find(
        {'module_id': module_id},
        {'_id': 0, 'flags.flag': 0}  # Hide actual flag values
    ).sort('order', 1).to_list(100)
    
    # Add flags_count to each challenge
    for c in challenges:
        c['flags_count'] = len(c.get('flags', []))
        # Remove flag values but keep descriptions
        if 'flags' in c:
            c['flags'] = [{'description': f['description'], 'points': f['points']} for f in c['flags']]
    
    # Get progress
    progress_records = await db.student_progress.find({
        'user_id': current_user['id'],
        'module_id': module_id
    }, {'_id': 0}).to_list(100)
    
    progress = {
        'challenges': {p['challenge_id']: p for p in progress_records},
        'percentage': 0
    }
    
    solved = len([p for p in progress_records if p.get('completed')])
    progress['percentage'] = int((solved / len(challenges) * 100)) if challenges else 0
    
    module['total_points'] = sum(c.get('points', 0) for c in challenges)
    
    return {'module': module, 'challenges': challenges, 'progress': progress}

# Get Challenge Details
@api_router.get("/student/challenges/{challenge_id}")
async def get_student_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Get challenge details for solving"""
    challenge = await db.student_challenges.find_one({'id': challenge_id}, {'_id': 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Verify enrollment
    module = await db.modules.find_one({'id': challenge['module_id']})
    enrollment = await db.student_enrollments.find_one({
        'user_id': current_user['id'],
        'course_id': module['course_id']
    })
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    # Get module name
    challenge['module_name'] = module['name'] if module else 'Unknown'
    
    # Hide flag values but keep descriptions and points
    if 'flags' in challenge:
        challenge['flags'] = [
            {'description': f['description'], 'points': f['points']}
            for f in challenge['flags']
        ]
    
    # Get progress
    progress = await db.student_progress.find_one({
        'user_id': current_user['id'],
        'challenge_id': challenge_id
    }, {'_id': 0})
    
    return {'challenge': challenge, 'progress': progress or {'flags_solved': []}}

# Submit Flag
@api_router.post("/student/submit-flag")
async def submit_student_flag(submission: StudentFlagSubmit, current_user: dict = Depends(get_current_user)):
    """Submit a flag for a student challenge"""
    challenge = await db.student_challenges.find_one({'id': submission.challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    flags = challenge.get('flags', [])
    if submission.flag_index >= len(flags):
        raise HTTPException(status_code=400, detail="Invalid flag index")
    
    target_flag = flags[submission.flag_index]
    
    # Get or create progress
    progress = await db.student_progress.find_one({
        'user_id': current_user['id'],
        'challenge_id': submission.challenge_id
    })
    
    flags_solved = progress.get('flags_solved', []) if progress else []
    
    # Check if already solved
    if submission.flag_index in flags_solved:
        return {'correct': True, 'message': 'Already solved', 'points': 0}
    
    # Validate flag
    is_correct = submission.flag.strip() == target_flag['flag'].strip()
    
    if is_correct:
        points = target_flag.get('points', 50)
        flags_solved.append(submission.flag_index)
        is_complete = len(flags_solved) >= len(flags)
        
        if progress:
            await db.student_progress.update_one(
                {'_id': progress['_id']},
                {
                    '$set': {
                        'flags_solved': flags_solved,
                        'completed': is_complete,
                        'updated_at': datetime.now(timezone.utc)
                    },
                    '$inc': {'points_earned': points}
                }
            )
        else:
            await db.student_progress.insert_one({
                'id': str(uuid.uuid4()),
                'user_id': current_user['id'],
                'challenge_id': submission.challenge_id,
                'module_id': challenge['module_id'],
                'course_id': challenge['course_id'],
                'flags_solved': flags_solved,
                'completed': is_complete,
                'points_earned': points,
                'updated_at': datetime.now(timezone.utc)
            })
        
        # Update user score
        await db.users.update_one(
            {'id': current_user['id']},
            {'$inc': {'score': points}}
        )
        
        return {'correct': True, 'message': 'Correct!', 'points': points}
    
    return {'correct': False, 'message': 'Incorrect', 'points': 0}

# Student Docker
@api_router.post("/student/docker/start/{challenge_id}")
async def start_student_docker(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Start Docker instance for student challenge"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker is not available")
    
    challenge = await db.student_challenges.find_one({'id': challenge_id})
    if not challenge or not challenge.get('docker_image'):
        raise HTTPException(status_code=400, detail="Challenge has no Docker image")
    
    try:
        container = docker_client.containers.run(
            challenge['docker_image'],
            detach=True,
            remove=True,
            labels={'student_challenge': challenge_id, 'user': current_user['id']}
        )
        return {
            'status': 'running',
            'container_id': container.id,
            'url': f"http://localhost:{container.attrs.get('NetworkSettings', {}).get('Ports', {})}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ADMIN: STUDENT MANAGEMENT
# ============================================

@api_router.get("/admin/courses")
async def admin_get_courses(admin: dict = Depends(require_admin)):
    """Get all courses"""
    courses = await db.courses.find({}, {'_id': 0}).to_list(100)
    return courses

@api_router.post("/admin/courses")
async def admin_create_course(data: CourseCreate, admin: dict = Depends(require_admin)):
    """Create a new course"""
    course_id = str(uuid.uuid4())
    course = {
        'id': course_id,
        'code': data.code,
        'name': data.name,
        'description': data.description,
        'duration': data.duration,
        'color': data.color,
        'created_at': datetime.now(timezone.utc)
    }
    await db.courses.insert_one(course)
    return {'message': 'Course created', 'id': course_id}

@api_router.put("/admin/courses/{course_id}")
async def admin_update_course(course_id: str, data: CourseUpdate, admin: dict = Depends(require_admin)):
    """Update a course"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc)
    result = await db.courses.update_one({'id': course_id}, {'$set': update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {'message': 'Course updated'}

@api_router.delete("/admin/courses/{course_id}")
async def admin_delete_course(course_id: str, admin: dict = Depends(require_admin)):
    """Delete a course"""
    result = await db.courses.delete_one({'id': course_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    # Also delete related modules and enrollments
    await db.modules.delete_many({'course_id': course_id})
    await db.student_challenges.delete_many({'course_id': course_id})
    await db.student_enrollments.delete_many({'course_id': course_id})
    return {'message': 'Course deleted'}

@api_router.get("/admin/modules")
async def admin_get_modules(course_id: Optional[str] = None, admin: dict = Depends(require_admin)):
    """Get all modules, optionally filtered by course"""
    query = {'course_id': course_id} if course_id else {}
    modules = await db.modules.find(query, {'_id': 0}).sort('order', 1).to_list(100)
    return modules

@api_router.post("/admin/modules")
async def admin_create_module(data: ModuleCreate, admin: dict = Depends(require_admin)):
    """Create a new module"""
    module_id = str(uuid.uuid4())
    module = {
        'id': module_id,
        'course_id': data.course_id,
        'name': data.name,
        'description': data.description,
        'order': data.order,
        'has_capstone': data.has_capstone,
        'created_at': datetime.now(timezone.utc)
    }
    await db.modules.insert_one(module)
    return {'message': 'Module created', 'id': module_id}

@api_router.get("/admin/student-challenges")
async def admin_get_student_challenges(module_id: Optional[str] = None, admin: dict = Depends(require_admin)):
    """Get all student challenges"""
    query = {'module_id': module_id} if module_id else {}
    challenges = await db.student_challenges.find(query, {'_id': 0}).sort('order', 1).to_list(1000)
    return challenges

@api_router.post("/admin/student-challenges")
async def admin_create_student_challenge(data: StudentChallengeCreate, admin: dict = Depends(require_admin)):
    """Create a student challenge"""
    challenge_id = str(uuid.uuid4())
    challenge = {
        'id': challenge_id,
        'title': data.title,
        'short_description': data.short_description,
        'context': data.context,
        'course_id': data.course_id,
        'module_id': data.module_id,
        'topic_number': data.topic_number,
        'topic_name': data.topic_name,
        'is_capstone': data.is_capstone,
        'docker_image': data.docker_image,
        'docker_compose': data.docker_compose,
        'flags': [f.model_dump() for f in data.flags],
        'hints': [h.model_dump() for h in data.hints],
        'points': data.points,
        'order': data.order,
        'created_at': datetime.now(timezone.utc)
    }
    await db.student_challenges.insert_one(challenge)
    return {'message': 'Challenge created', 'id': challenge_id}

@api_router.put("/admin/student-challenges/{challenge_id}")
async def admin_update_student_challenge(challenge_id: str, data: dict, admin: dict = Depends(require_admin)):
    """Update a student challenge"""
    challenge = await db.student_challenges.find_one({'id': challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Handle flags serialization
    if 'flags' in data:
        data['flags'] = [f if isinstance(f, dict) else f.model_dump() for f in data['flags']]
    if 'hints' in data:
        data['hints'] = [h if isinstance(h, dict) else h.model_dump() for h in data['hints']]
    
    await db.student_challenges.update_one({'id': challenge_id}, {'$set': data})
    return {'message': 'Challenge updated'}

@api_router.delete("/admin/student-challenges/{challenge_id}")
async def admin_delete_student_challenge(challenge_id: str, admin: dict = Depends(require_admin)):
    """Delete a student challenge"""
    await db.student_challenges.delete_one({'id': challenge_id})
    await db.student_progress.delete_many({'challenge_id': challenge_id})
    return {'message': 'Challenge deleted'}

@api_router.post("/admin/invite-codes")
async def admin_create_invite_code(data: InviteCodeCreate, admin: dict = Depends(require_admin)):
    """Generate an invite code for student registration"""
    import random
    import string
    
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    invite = {
        'id': str(uuid.uuid4()),
        'code': code,
        'course_id': data.course_id,
        'max_uses': data.max_uses,
        'uses': 0,
        'is_active': True,
        'expires_at': datetime.now(timezone.utc) + timedelta(days=data.expires_days),
        'created_by': admin['id'],
        'created_at': datetime.now(timezone.utc)
    }
    await db.invite_codes.insert_one(invite)
    
    return {'code': code, 'expires_at': invite['expires_at'].isoformat()}

@api_router.get("/admin/invite-codes")
async def admin_get_invite_codes(admin: dict = Depends(require_admin)):
    """Get all invite codes"""
    codes = await db.invite_codes.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    
    # Enrich with course names
    for code in codes:
        course = await db.courses.find_one({'id': code['course_id']}, {'name': 1})
        code['course_name'] = course['name'] if course else 'Unknown'
        if code.get('expires_at'):
            code['expires_at'] = code['expires_at'].isoformat()
        if code.get('created_at'):
            code['created_at'] = code['created_at'].isoformat()
    
    return codes

@api_router.get("/admin/student-enrollments")
async def admin_get_enrollments(course_id: Optional[str] = None, admin: dict = Depends(require_admin)):
    """Get student enrollments"""
    query = {'course_id': course_id} if course_id else {}
    enrollments = await db.student_enrollments.find(query, {'_id': 0}).to_list(1000)
    
    # Enrich with user and course info
    for e in enrollments:
        user = await db.users.find_one({'id': e['user_id']}, {'username': 1, 'email': 1})
        course = await db.courses.find_one({'id': e['course_id']}, {'name': 1})
        e['username'] = user['username'] if user else 'Unknown'
        e['email'] = user['email'] if user else ''
        e['course_name'] = course['name'] if course else 'Unknown'
    
    return enrollments

# Admin: Enroll a user in a course (generates enrollment code for them)
class EnrollUserRequest(BaseModel):
    user_id: str
    course_id: str
    expires_days: int = 2  # Default 48 hours

@api_router.post("/admin/enroll-user")
async def admin_enroll_user(data: EnrollUserRequest, admin: dict = Depends(require_admin)):
    """Generate enrollment code for a specific user"""
    import random
    import string
    
    # Verify user exists
    user = await db.users.find_one({'id': data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify course exists
    course = await db.courses.find_one({'id': data.course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if already enrolled
    existing = await db.student_enrollments.find_one({
        'user_id': data.user_id,
        'course_id': data.course_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="User is already enrolled in this course")
    
    # Generate unique code
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    # Create enrollment code for this specific user
    code_record = {
        'id': str(uuid.uuid4()),
        'code': code,
        'course_id': data.course_id,
        'user_id': data.user_id,  # Assigned to specific user
        'is_active': True,
        'expires_at': datetime.now(timezone.utc) + timedelta(days=data.expires_days),
        'created_by': admin['id'],
        'created_at': datetime.now(timezone.utc)
    }
    await db.enrollment_codes.insert_one(code_record)
    
    return {
        'code': code,
        'user': user['username'],
        'course': course['name'],
        'expires_at': code_record['expires_at'].isoformat()
    }

@api_router.get("/admin/enrollment-codes")
async def admin_get_enrollment_codes(admin: dict = Depends(require_admin)):
    """Get all enrollment codes"""
    codes = await db.enrollment_codes.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    
    # Enrich with user and course names
    for code in codes:
        if code.get('user_id'):
            user = await db.users.find_one({'id': code['user_id']}, {'username': 1})
            code['username'] = user['username'] if user else 'Unknown'
        else:
            code['username'] = 'Any'
        
        course = await db.courses.find_one({'id': code['course_id']}, {'name': 1})
        code['course_name'] = course['name'] if course else 'Unknown'
        
        if code.get('expires_at'):
            code['expires_at'] = code['expires_at'].isoformat()
        if code.get('created_at'):
            code['created_at'] = code['created_at'].isoformat()
    
    return codes

@api_router.get("/admin/users-list")
async def admin_get_users_list(admin: dict = Depends(require_admin)):
    """Get list of all users for enrollment dropdown"""
    users = await db.users.find({}, {'_id': 0, 'id': 1, 'username': 1, 'email': 1, 'role': 1}).to_list(1000)
    return users

@api_router.delete("/admin/enrollment-codes/{code_id}")
async def admin_delete_enrollment_code(code_id: str, admin: dict = Depends(require_admin)):
    """Delete an enrollment code"""
    result = await db.enrollment_codes.delete_one({'id': code_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Enrollment code not found")
    return {'message': 'Enrollment code deleted'}

# Admin: Unenroll a user from a course
class UnenrollUserRequest(BaseModel):
    user_id: str
    course_id: str

@api_router.post("/admin/unenroll-user")
async def admin_unenroll_user(data: UnenrollUserRequest, admin: dict = Depends(require_admin)):
    """Unenroll a user from a course"""
    # Check if enrollment exists
    enrollment = await db.student_enrollments.find_one({
        'user_id': data.user_id,
        'course_id': data.course_id
    })
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Delete the enrollment
    await db.student_enrollments.delete_one({
        'user_id': data.user_id,
        'course_id': data.course_id
    })
    
    # Also delete any progress for this user in this course
    # Get all modules in the course
    modules = await db.course_modules.find({'course_id': data.course_id}, {'id': 1}).to_list(100)
    module_ids = [m['id'] for m in modules]
    
    # Delete progress for challenges in these modules
    if module_ids:
        await db.student_challenge_progress.delete_many({
            'user_id': data.user_id,
            'module_id': {'$in': module_ids}
        })
    
    return {'message': 'User unenrolled successfully'}


# =============================================
# NOTIFICATION/MESSAGING SYSTEM
# =============================================

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "announcement"  # announcement, message
    target_type: str = "all"  # all, specific
    target_user_ids: Optional[List[str]] = None

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    sender_id: str
    sender_name: str
    created_at: datetime
    read: bool
    time_ago: str

# Admin: Send notification/announcement
@api_router.post("/admin/notifications")
async def admin_send_notification(data: NotificationCreate, admin: dict = Depends(require_admin)):
    """Send a notification to all users or specific users"""
    notification_id = str(uuid.uuid4())
    
    notification = {
        'id': notification_id,
        'title': data.title,
        'message': data.message,
        'type': data.type,
        'target_type': data.target_type,
        'sender_id': admin['id'],
        'sender_name': admin['username'],
        'created_at': datetime.now(timezone.utc)
    }
    
    if data.target_type == 'all':
        # Send to all users
        all_users = await db.users.find({}, {'id': 1}).to_list(10000)
        for user in all_users:
            user_notification = {
                **notification,
                'user_id': user['id'],
                'read': False
            }
            await db.notifications.insert_one(user_notification)
        return {'message': f'Notification sent to {len(all_users)} users', 'id': notification_id}
    else:
        # Send to specific users
        if not data.target_user_ids:
            raise HTTPException(status_code=400, detail="No target users specified")
        
        for user_id in data.target_user_ids:
            user_notification = {
                **notification,
                'user_id': user_id,
                'read': False
            }
            await db.notifications.insert_one(user_notification)
        return {'message': f'Notification sent to {len(data.target_user_ids)} users', 'id': notification_id}

# Admin: Get all sent notifications
@api_router.get("/admin/notifications")
async def admin_get_notifications(admin: dict = Depends(require_admin)):
    """Get all notifications sent by admins"""
    # Get unique notifications (grouped by id)
    pipeline = [
        {'$match': {'sender_id': {'$exists': True}}},
        {'$group': {
            '_id': '$id',
            'title': {'$first': '$title'},
            'message': {'$first': '$message'},
            'type': {'$first': '$type'},
            'target_type': {'$first': '$target_type'},
            'sender_name': {'$first': '$sender_name'},
            'created_at': {'$first': '$created_at'},
            'recipient_count': {'$sum': 1},
            'read_count': {'$sum': {'$cond': ['$read', 1, 0]}}
        }},
        {'$sort': {'created_at': -1}},
        {'$limit': 100}
    ]
    notifications = await db.notifications.aggregate(pipeline).to_list(100)
    return notifications

# User: Get my notifications
@api_router.get("/notifications")
async def get_my_notifications(current_user: dict = Depends(get_current_user)):
    """Get notifications for the current user"""
    user_id = current_user['id']
    
    notifications = await db.notifications.find(
        {'user_id': user_id},
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    
    unread_count = await db.notifications.count_documents({'user_id': user_id, 'read': False})
    
    # Add time_ago to each notification
    now = datetime.now(timezone.utc)
    for notif in notifications:
        created_at = notif.get('created_at')
        if created_at:
            # Handle timezone-aware datetime
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            delta = now - created_at
            if delta.days > 0:
                notif['time_ago'] = f"{delta.days}d ago"
            elif delta.seconds >= 3600:
                notif['time_ago'] = f"{delta.seconds // 3600}h ago"
            elif delta.seconds >= 60:
                notif['time_ago'] = f"{delta.seconds // 60}m ago"
            else:
                notif['time_ago'] = "Just now"
        else:
            notif['time_ago'] = "Unknown"
    
    return {'notifications': notifications, 'unread_count': unread_count}

# IMPORTANT: This route MUST come BEFORE /notifications/{notification_id}/read
# User: Mark all notifications as read
@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    result = await db.notifications.update_many(
        {'user_id': current_user['id'], 'read': False},
        {'$set': {'read': True}}
    )
    return {'message': f'Marked {result.modified_count} notifications as read'}

# User: Mark notification as read
@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {'id': notification_id, 'user_id': current_user['id']},
        {'$set': {'read': True}}
    )
    return {'message': 'Marked as read'}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
