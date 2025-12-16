"""
Check for orphaned challenge IDs in user_progress
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

async def check():
    # Get challenge IDs in database
    challenges = await db.challenges.find({}, {'id': 1}).to_list(100)
    challenge_ids = set(c['id'] for c in challenges)
    print('Current challenge IDs:')
    for cid in challenge_ids:
        print(f'  {cid}')
    
    # Get challenge IDs in user_progress
    progress = await db.user_progress.find({}, {'challenge_id': 1}).to_list(1000)
    progress_ids = set(p['challenge_id'] for p in progress)
    print('\nChallenge IDs in user_progress:')
    for pid in progress_ids:
        print(f'  {pid}')
    
    # Check overlap
    overlap = challenge_ids.intersection(progress_ids)
    print(f'\nOverlap: {len(overlap)} IDs match')
    
    orphaned = progress_ids - challenge_ids
    if orphaned:
        print(f'\n⚠️ ORPHANED: {len(orphaned)} challenge_ids in user_progress do not exist in challenges!')
        print('These records point to deleted/re-seeded challenges.')
    
    client.close()

if __name__ == '__main__':
    asyncio.run(check())
