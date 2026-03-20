"""
Create or promote a user to superadmin
Usage: python create_superadmin.py <email>
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def promote_to_superadmin(email: str):
    user = await db.users.find_one({'email': email})
    
    if not user:
        print(f"❌ User with email '{email}' not found")
        print("\nRegistered users:")
        users = await db.users.find({}, {'email': 1, 'username': 1, 'role': 1}).to_list(100)
        for u in users:
            role = u.get('role', 'user')
            print(f"   - {u['username']} ({u['email']}) - {role}")
        return
    
    current_role = user.get('role', 'user')
    
    if current_role == 'superadmin':
        print(f"✅ {user['username']} is already a superadmin")
        return
    
    await db.users.update_one(
        {'email': email},
        {'$set': {'role': 'superadmin'}}
    )
    
    print(f"✅ {user['username']} has been promoted to SUPERADMIN!")
    print(f"   Email: {email}")
    print(f"   Previous role: {current_role}")
    print(f"   New role: superadmin")
    
    client.close()

async def list_admins():
    print("\n📋 Current Admins and Superadmins:")
    users = await db.users.find(
        {'role': {'$in': ['admin', 'superadmin']}},
        {'_id': 0, 'password_hash': 0}
    ).to_list(100)
    
    if not users:
        print("   No admins found. Create one with: python create_superadmin.py <email>")
    else:
        for u in users:
            role_badge = "👑" if u.get('role') == 'superadmin' else "🛡️"
            print(f"   {role_badge} {u['username']} ({u['email']}) - {u.get('role', 'user')}")
    
    client.close()

if __name__ == '__main__':
    if len(sys.argv) > 1:
        email = sys.argv[1]
        asyncio.run(promote_to_superadmin(email))
    else:
        print("Usage: python create_superadmin.py <email>")
        print("\nThis will promote the user with that email to superadmin.")
        asyncio.run(list_admins())
