"""
Database Verification and Fix Script
This script checks for data inconsistencies and optionally fixes them.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def verify_database():
    print("=" * 60)
    print("DATABASE VERIFICATION REPORT")
    print("=" * 60)
    
    # 1. Check users
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(100)
    print(f"\n📊 USERS ({len(users)} total):")
    for user in users:
        print(f"   - {user['username']}: {user['score']} pts (ID: {user['id'][:8]}...)")
    
    # 2. Check categories
    categories = await db.categories.find({}, {'_id': 0}).to_list(100)
    print(f"\n📁 CATEGORIES ({len(categories)} total):")
    for cat in categories:
        challenges_in_cat = await db.challenges.count_documents({'category_id': cat['id']})
        print(f"   - {cat['name']}: {challenges_in_cat} challenges (icon: {cat['icon']})")
    
    # 3. Check challenges
    challenges = await db.challenges.find({}, {'_id': 0, 'flag': 0}).to_list(100)
    print(f"\n🚩 CHALLENGES ({len(challenges)} total):")
    for ch in challenges:
        print(f"   - {ch['title']} ({ch['difficulty']}, {ch['points']} pts, {ch['solves']} solves)")
    
    # 4. Check user_progress
    progress_records = await db.user_progress.find({}, {'_id': 0}).to_list(1000)
    print(f"\n📈 USER PROGRESS ({len(progress_records)} records):")
    
    if len(progress_records) == 0:
        print("   ⚠️  NO PROGRESS RECORDS FOUND!")
        print("   This explains why category stats show 0%")
    else:
        for prog in progress_records:
            user = await db.users.find_one({'id': prog['user_id']}, {'username': 1})
            challenge = await db.challenges.find_one({'id': prog['challenge_id']}, {'title': 1})
            username = user['username'] if user else 'Unknown'
            title = challenge['title'] if challenge else 'Unknown'
            status = "✅ SOLVED" if prog.get('solved') else "⏳ In Progress"
            print(f"   - {username} → {title}: {status}")
    
    # 5. Check for inconsistencies
    print(f"\n🔍 CONSISTENCY CHECK:")
    for user in users:
        # Count user's solved challenges
        solved_count = await db.user_progress.count_documents({
            'user_id': user['id'],
            'solved': True
        })
        
        # Calculate expected score from user_progress
        progress_list = await db.user_progress.find({
            'user_id': user['id'],
            'solved': True
        }, {'score_earned': 1}).to_list(100)
        
        calculated_score = sum(p.get('score_earned', 0) for p in progress_list)
        
        if user['score'] != calculated_score:
            print(f"   ⚠️  {user['username']}: Score mismatch!")
            print(f"       → DB score: {user['score']}")
            print(f"       → Calculated from progress: {calculated_score}")
            print(f"       → Solved challenges in progress: {solved_count}")
        else:
            print(f"   ✅ {user['username']}: Score matches ({user['score']} pts, {solved_count} solved)")
    
    print("\n" + "=" * 60)
    client.close()

async def reset_user_score(username: str):
    """Reset a user's score based on their actual user_progress records"""
    user = await db.users.find_one({'username': username})
    if not user:
        print(f"User '{username}' not found")
        return
    
    # Calculate actual score from progress
    progress_list = await db.user_progress.find({
        'user_id': user['id'],
        'solved': True
    }, {'score_earned': 1}).to_list(100)
    
    calculated_score = sum(p.get('score_earned', 0) for p in progress_list)
    
    print(f"User: {username}")
    print(f"Current score: {user['score']}")
    print(f"Calculated score: {calculated_score}")
    
    # Update
    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'score': calculated_score}}
    )
    print(f"✅ Score updated to {calculated_score}")
    
    client.close()

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'reset':
        if len(sys.argv) > 2:
            asyncio.run(reset_user_score(sys.argv[2]))
        else:
            print("Usage: python verify_db.py reset <username>")
    else:
        asyncio.run(verify_database())
