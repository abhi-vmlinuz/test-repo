
import asyncio
import asyncpg
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

DATABASE_URL = os.environ.get('DATABASE_URL')

async def check_superadmin():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Fetch superadmin by email seen in screenshot
        email = 'superadmin@rlabz.edu'
        user = await conn.fetchrow('''
            SELECT u.id, u.name, u.email, u."isLocked", u."isActive", r.type as role_type, r.name as role_name
            FROM users u
            JOIN "Role" r ON u."roleId" = r.id
            WHERE LOWER(u.email) = LOWER($1)
        ''', email)
        
        print(f"Checking user: {email}")
        if user:
            print(f"ID: {user['id']}")
            print(f"Role Type: '{user['role_type']}'")
            print(f"Role Name: '{user['role_name']}'")
            print(f"isLocked (is_banned): {user['isLocked']}")
            print(f"isActive: {user['isActive']}")
        else:
            print("User not found!")

    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(check_superadmin())
