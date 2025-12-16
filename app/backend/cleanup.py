"""
Quick cleanup: Remove orphaned user_progress and recalculate scores
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

async def cleanup():
    # Get valid challenge IDs
    challenges = await db.challenges.find({}, {'id': 1}).to_list(100)
    valid_ids = [c['id'] for c in challenges]
    
    # Delete orphaned user_progress
    result = await db.user_progress.delete_many({'challenge_id': {'$nin': valid_ids}})
    print(f"✅ Deleted {result.deleted_count} orphaned user_progress records")
    
    # Recalculate all user scores
    users = await db.users.find({}).to_list(1000)
    for user in users:
        progress = await db.user_progress.find({
            'user_id': user['id'],
            'solved': True
        }).to_list(100)
        
        new_score = sum(p.get('score_earned', 0) for p in progress)
        solved_count = len(progress)
        
        if user['score'] != new_score:
            await db.users.update_one({'id': user['id']}, {'$set': {'score': new_score}})
            print(f"   {user['username']}: {user['score']} → {new_score} ({solved_count} solved)")
        else:
            print(f"   {user['username']}: {new_score} pts ({solved_count} solved)")
    
    print("\n✅ Cleanup complete!")
    client.close()

if __name__ == '__main__':
    asyncio.run(cleanup())
