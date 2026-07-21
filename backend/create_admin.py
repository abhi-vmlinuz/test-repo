#!/usr/bin/env python3
"""
Create Mockup Admin User Script
Connects to PostgreSQL and ensures that:
1. Standard roles exist (specifically SUPERADMIN and CTF_USER).
2. The user 'admin@rajagiri' exists with role SUPERADMIN and password 'admin123'.
"""

import asyncio
import os
import uuid
import bcrypt
import asyncpg
from pathlib import Path
from dotenv import load_dotenv

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

DATABASE_URL = os.environ.get('DATABASE_URL')

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

async def seed_database():
    print("=" * 60)
    print("RLabZ CTF DATABASE SEEDER")
    print("=" * 60)
    
    if not DATABASE_URL:
        print("❌ Error: DATABASE_URL not set in environment or .env file!")
        return
        
    print(f"Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # 1. Ensure SUPERADMIN role exists
        print("Checking roles...")
        superadmin_role = await conn.fetchrow('SELECT id FROM "Role" WHERE type = \'SUPERADMIN\'')
        if not superadmin_role:
            role_id = str(uuid.uuid4())
            await conn.execute(
                'INSERT INTO "Role" (id, name, type, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
                role_id, 'Super Admin', 'SUPERADMIN'
            )
            print(f"✅ Created SUPERADMIN role (ID: {role_id})")
        else:
            role_id = superadmin_role['id']
            print(f"ℹ️ SUPERADMIN role already exists (ID: {role_id})")
            
        # Ensure CTF_USER role exists
        ctf_role = await conn.fetchrow('SELECT id FROM "Role" WHERE type = \'CTF_USER\'')
        if not ctf_role:
            ctf_role_id = str(uuid.uuid4())
            await conn.execute(
                'INSERT INTO "Role" (id, name, type, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
                ctf_role_id, 'CTF User', 'CTF_USER'
            )
            print(f"✅ Created CTF_USER role (ID: {ctf_role_id})")

        # 2. Ensure mockup admin account exists
        email = 'admin@rajagiri'
        username = 'admin'
        password = 'admin123'
        hashed = hash_password(password)
        
        print(f"Checking for user {email}...")
        user = await conn.fetchrow('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', email)
        
        if not user:
            user_id = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT INTO users (
                    id, name, email, password, "roleId",
                    "isActive", "isVerified", "ctfScore",
                    "createdAt", "updatedAt", "passwordChangedAt"
                ) VALUES ($1, $2, $3, $4, $5, true, true, 0, NOW(), NOW(), NOW())
                """,
                user_id, username, email, hashed, role_id
            )
            print(f"✅ Created mockup admin user:")
            print(f"   Email: {email}")
            print(f"   Password: {password}")
        else:
            user_id = user['id']
            await conn.execute(
                """
                UPDATE users SET 
                    password = $1,
                    "roleId" = $2,
                    "isActive" = true,
                    "isLocked" = false,
                    "updatedAt" = NOW()
                WHERE id = $3
                """,
                hashed, role_id, user_id
            )
            print(f"✅ Reset/Updated existing user {email}:")
            print(f"   Password: {password}")
            print(f"   Role: SUPERADMIN")

    except Exception as e:
        print(f"❌ Database error: {e}")
    finally:
        await conn.close()
    
    print("=" * 60)

if __name__ == '__main__':
    asyncio.run(seed_database())
