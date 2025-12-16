"""
Reset Superadmin Password Script
Run this to reset the superadmin password to a known value.
"""

import asyncio
import asyncpg
import argon2
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

DATABASE_URL = os.environ.get('DATABASE_URL')

# Argon2 hasher (same as LMS)
ph = argon2.PasswordHasher()

async def reset_superadmin_password():
    print("=" * 60)
    print("SUPERADMIN PASSWORD RESET")
    print("=" * 60)
    
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Find superadmin user
        superadmin = await conn.fetchrow('''
            SELECT u.id, u.name, u.email, u.password
            FROM users u
            JOIN "Role" r ON u."roleId" = r.id
            WHERE r.type = 'SUPERADMIN'
            LIMIT 1
        ''')
        
        if not superadmin:
            print("❌ No superadmin user found!")
            print("\nLet's check what users exist:")
            users = await conn.fetch('''
                SELECT u.id, u.name, u.email, r.type as role
                FROM users u
                JOIN "Role" r ON u."roleId" = r.id
                ORDER BY r.type, u.email
            ''')
            for u in users:
                print(f"   - {u['email']} ({u['role']})")
            return
        
        print(f"\n📧 Found superadmin: {superadmin['email']}")
        print(f"   Name: {superadmin['name']}")
        print(f"   Current password hash starts with: {superadmin['password'][:20] if superadmin['password'] else 'NULL'}...")
        
        # Set new password
        new_password = "SuperAdmin@123"  # You should change this after first login!
        new_hash = ph.hash(new_password)
        
        await conn.execute('''
            UPDATE users SET password = $1, "updatedAt" = NOW()
            WHERE id = $2
        ''', new_hash, superadmin['id'])
        
        print(f"\n✅ Password reset successfully!")
        print(f"   Email: {superadmin['email']}")
        print(f"   New Password: {new_password}")
        print(f"   New Hash: {new_hash[:30]}...")
        print("\n⚠️  IMPORTANT: Change this password after first login!")
        
    finally:
        await conn.close()
    
    print("\n" + "=" * 60)

if __name__ == '__main__':
    asyncio.run(reset_superadmin_password())
