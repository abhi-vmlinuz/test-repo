"""
Fix Database Script
Cleans up orphaned user_progress records and optionally resets scores
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

async def fix_database():
    print("=" * 60)
    print("DATABASE FIX SCRIPT")
    print("=" * 60)
    
    # Get current challenge IDs
    challenges = await db.challenges.find({}, {'id': 1}).to_list(100)
    valid_challenge_ids = set(c['id'] for c in challenges)
    
    # Find orphaned user_progress records
    all_progress = await db.user_progress.find({}).to_list(10000)
    orphaned = [p for p in all_progress if p['challenge_id'] not in valid_challenge_ids]
    
    print(f"\n📊 Found {len(orphaned)} orphaned user_progress records")
    
    if orphaned:
        # Delete orphaned records
        orphan_ids = [p['_id'] for p in orphaned]
        result = await db.user_progress.delete_many({'_id': {'$in': orphan_ids}})
        print(f"✅ Deleted {result.deleted_count} orphaned records")
    
    # Reset all user scores to 0 (since their progress is now invalid)
    print("\n🔄 Resetting user scores to match actual progress...")
    
    users = await db.users.find({}).to_list(1000)
    for user in users:
        # Calculate score from valid progress records only
        valid_progress = await db.user_progress.find({
            'user_id': user['id'],
            'solved': True
        }).to_list(100)
        
        calculated_score = sum(p.get('score_earned', 0) for p in valid_progress)
        
        if user['score'] != calculated_score:
            await db.users.update_one(
                {'id': user['id']},
                {'$set': {'score': calculated_score}}
            )
            print(f"   {user['username']}: {user['score']} → {calculated_score}")
        else:
            print(f"   {user['username']}: {calculated_score} (no change)")
    
    # Reset challenge solve counts
    print("\n🔄 Recalculating challenge solve counts...")
    for challenge in challenges:
        actual_solves = await db.user_progress.count_documents({
            'challenge_id': challenge['id'],
            'solved': True
        })
        await db.challenges.update_one(
            {'id': challenge['id']},
            {'$set': {'solves': actual_solves}}
        )
    
    print("\n✅ Database fixed!")
    print("=" * 60)
    
    # Verify
    print("\n📊 POST-FIX VERIFICATION:")
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(100)
    for user in users:
        solved = await db.user_progress.count_documents({'user_id': user['id'], 'solved': True})
        print(f"   {user['username']}: {user['score']} pts, {solved} solved")
    
    client.close()

if __name__ == '__main__':
    print("\n⚠️  WARNING: This will reset user scores based on actual progress records!")
    confirm = input("Type 'yes' to continue: ")
    if confirm.lower() == 'yes':
        asyncio.run(fix_database())
    else:
        print("Aborted.")
