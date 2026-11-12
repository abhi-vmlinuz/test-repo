#!/usr/bin/env python3
"""
Seed Coding Arena Challenges for Nexus CTF
Pulls standard registry images per language as orchestrated by Nexus:
1. Two Sum -> C (Image: gcc:latest)
2. Valid Palindrome -> Python (Image: python:3.11-slim)
3. Reverse Integer -> Java (Image: eclipse-temurin:17-jdk)
"""

import asyncio
import os
import uuid
import json
import asyncpg
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
DATABASE_URL = os.environ.get('DATABASE_URL')

# 1. C Challenge: Two Sum
TWO_SUM_C = """#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int *nums = (int *)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) {
        scanf("%d", &nums[i]);
    }
    
    int target;
    scanf("%d", &target);
    
    // Find the two indices that add up to target
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (nums[i] + nums[j] == target) {
                printf("%d %d\\n", i, j);
                free(nums);
                return 0;
            }
        }
    }
    
    free(nums);
    return 0;
}
"""

TWO_SUM_TESTS = [
    {
        "id": 1,
        "input": "4\n2 7 11 15\n9",
        "expected": "0 1",
        "points": 25,
        "is_hidden": False,
        "explanation": "nums[0] + nums[1] == 9, indices are 0 1"
    },
    {
        "id": 2,
        "input": "3\n3 2 4\n6",
        "expected": "1 2",
        "points": 25,
        "is_hidden": False,
        "explanation": "nums[1] + nums[2] == 6, indices are 1 2"
    },
    {
        "id": 3,
        "input": "2\n3 3\n6",
        "expected": "0 1",
        "points": 25,
        "is_hidden": True,
        "explanation": "Duplicate elements test case"
    },
    {
        "id": 4,
        "input": "5\n-1 -2 -3 -4 -5\n-8",
        "expected": "2 4",
        "points": 25,
        "is_hidden": True,
        "explanation": "Negative numbers test case"
    }
]

# 2. Python Challenge: Valid Palindrome
PALINDROME_PY = """import sys
import re

def is_palindrome(s: str) -> bool:
    cleaned = re.sub(r'[^a-zA-Z0-9]', '', s).lower()
    return cleaned == cleaned[::-1]

def main():
    line = sys.stdin.read().rstrip('\\r\\n')
    if is_palindrome(line):
        print("true")
    else:
        print("false")

if __name__ == '__main__':
    main()
"""

PALINDROME_TESTS = [
    {
        "id": 1,
        "input": "A man, a plan, a canal: Panama",
        "expected": "true",
        "points": 25,
        "is_hidden": False,
        "explanation": "'amanaplanacanalpanama' is a palindrome"
    },
    {
        "id": 2,
        "input": "race a car",
        "expected": "false",
        "points": 25,
        "is_hidden": False,
        "explanation": "'raceacar' is not a palindrome"
    },
    {
        "id": 3,
        "input": " ",
        "expected": "true",
        "points": 25,
        "is_hidden": True,
        "explanation": "Empty string after non-alphanumeric filter"
    },
    {
        "id": 4,
        "input": "0P",
        "expected": "false",
        "points": 25,
        "is_hidden": True,
        "explanation": "Mismatched alphanumeric chars"
    }
]

# 3. Java Challenge: Reverse Integer
REVERSE_INT_JAVA = """import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        
        int x = scanner.nextInt();
        long rev = 0;
        
        while (x != 0) {
            rev = rev * 10 + (x % 10);
            x /= 10;
        }
        
        if (rev > Integer.MAX_VALUE || rev < Integer.MIN_VALUE) {
            System.out.println(0);
        } else {
            System.out.println(rev);
        }
    }
}
"""

REVERSE_INT_TESTS = [
    {
        "id": 1,
        "input": "123",
        "expected": "321",
        "points": 25,
        "is_hidden": False,
        "explanation": "Reverse of 123 is 321"
    },
    {
        "id": 2,
        "input": "-123",
        "expected": "-321",
        "points": 25,
        "is_hidden": False,
        "explanation": "Reverse of -123 is -321"
    },
    {
        "id": 3,
        "input": "120",
        "expected": "21",
        "points": 25,
        "is_hidden": True,
        "explanation": "Trailing zero removed"
    },
    {
        "id": 4,
        "input": "1534236469",
        "expected": "0",
        "points": 25,
        "is_hidden": True,
        "explanation": "32-bit integer overflow returns 0"
    }
]

async def seed_challenges():
    print("=" * 60)
    print("SEEDING NEXUS REGISTRY-BACKED CODING CHALLENGES")
    print("=" * 60)
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set!")
        return

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # 1. Ensure Category exists
        cat_name = "Competitive Programming"
        cat = await conn.fetchrow('SELECT id FROM ctf_categories WHERE name = $1', cat_name)
        if not cat:
            cat_id = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT INTO ctf_categories (id, name, description, icon, color, "isActive", "orderIndex", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, true, 1, NOW(), NOW())
                """,
                cat_id, cat_name, "Algorithmic problems and competitive programming challenges", "⚡", "blue"
            )
            print(f"✅ Created category: '{cat_name}' (ID: {cat_id})")
        else:
            cat_id = cat['id']
            print(f"ℹ️ Category '{cat_name}' already exists (ID: {cat_id})")

        # 2. Challenge 1: Two Sum (C - gcc:latest)
        two_sum_desc = """Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Output the two 0-based indices separated by a space on a single line.

### Input Format
- Line 1: `N` (number of elements)
- Line 2: `N` space-separated integers representing `nums`
- Line 3: `target` integer

### Output Format
- Print the two 0-based indices separated by a single space (e.g. `0 1`).
"""
        two_sum = await conn.fetchrow('SELECT id FROM ctf_public_challenges WHERE slug = $1', 'two-sum')
        if not two_sum:
            cid1 = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT INTO ctf_public_challenges (
                    id, "categoryId", title, slug, description, difficulty, points, flag,
                    "dockerImage", ports, "hasDocker", author, "isPublished",
                    "isCodingChallenge", language, "starterCode", "testCases",
                    "timeLimitMs", "memoryLimitMb", "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, 'EASY', 100, $6,
                    'gcc:latest', $7, true, 'Nexus Arena', true,
                    true, 'c', $8, $9,
                    2000, 128, NOW(), NOW()
                )
                """,
                cid1, cat_id, "Two Sum", "two-sum", two_sum_desc, "flag{n3xus_tw0_sum_c_m4st3r}",
                json.dumps([22, 8080]), TWO_SUM_C, json.dumps(TWO_SUM_TESTS)
            )
            print(f"✅ Created challenge: Two Sum (C -> gcc:latest)")
        else:
            await conn.execute(
                """
                UPDATE ctf_public_challenges SET
                    "categoryId" = $1, title = 'Two Sum', description = $2, difficulty = 'EASY',
                    points = 100, flag = 'flag{n3xus_tw0_sum_c_m4st3r}', "dockerImage" = 'gcc:latest',
                    ports = $3, "hasDocker" = true, "isPublished" = true, "isCodingChallenge" = true,
                    language = 'c', "starterCode" = $4, "testCases" = $5, "timeLimitMs" = 2000,
                    "memoryLimitMb" = 128, "updatedAt" = NOW()
                WHERE id = $6
                """,
                cat_id, two_sum_desc, json.dumps([22, 8080]),
                TWO_SUM_C, json.dumps(TWO_SUM_TESTS), two_sum['id']
            )
            print(f"✅ Updated challenge: Two Sum (C -> gcc:latest)")

        # 3. Challenge 2: Valid Palindrome (Python - python:3.11-slim)
        pal_desc = """A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string `s`, print `true` if it is a palindrome, or `false` otherwise.

### Input Format
- A single line containing string `s`.

### Output Format
- Print `true` or `false`.
"""
        pal = await conn.fetchrow('SELECT id FROM ctf_public_challenges WHERE slug = $1', 'valid-palindrome')
        if not pal:
            cid2 = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT INTO ctf_public_challenges (
                    id, "categoryId", title, slug, description, difficulty, points, flag,
                    "dockerImage", ports, "hasDocker", author, "isPublished",
                    "isCodingChallenge", language, "starterCode", "testCases",
                    "timeLimitMs", "memoryLimitMb", "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, 'EASY', 50, $6,
                    'python:3.11-slim', $7, true, 'Nexus Arena', true,
                    true, 'python', $8, $9,
                    2000, 128, NOW(), NOW()
                )
                """,
                cid2, cat_id, "Valid Palindrome", "valid-palindrome", pal_desc, "flag{p4l1ndr0m3_py_v3r1f13d}",
                json.dumps([22, 8080]), PALINDROME_PY, json.dumps(PALINDROME_TESTS)
            )
            print(f"✅ Created challenge: Valid Palindrome (Python -> python:3.11-slim)")
        else:
            await conn.execute(
                """
                UPDATE ctf_public_challenges SET
                    "categoryId" = $1, title = 'Valid Palindrome', description = $2, difficulty = 'EASY',
                    points = 50, flag = 'flag{p4l1ndr0m3_py_v3r1f13d}', "dockerImage" = 'python:3.11-slim',
                    ports = $3, "hasDocker" = true, "isPublished" = true, "isCodingChallenge" = true,
                    language = 'python', "starterCode" = $4, "testCases" = $5, "timeLimitMs" = 2000,
                    "memoryLimitMb" = 128, "updatedAt" = NOW()
                WHERE id = $6
                """,
                cat_id, pal_desc, json.dumps([22, 8080]),
                PALINDROME_PY, json.dumps(PALINDROME_TESTS), pal['id']
            )
            print(f"✅ Updated challenge: Valid Palindrome (Python -> python:3.11-slim)")

        # 4. Challenge 3: Reverse Integer (Java - eclipse-temurin:17-jdk)
        rev_desc = """Given a signed 32-bit integer `x`, return `x` with its digits reversed. If reversing `x` causes the value to go outside the signed 32-bit integer range `[-2^31, 2^31 - 1]`, then return `0`.

Assume the environment does not allow you to store 64-bit integers (signed or unsigned) during computation outside of intermediate variables.

### Input Format
- A single integer `x`.

### Output Format
- Print the reversed integer.
"""
        rev = await conn.fetchrow('SELECT id FROM ctf_public_challenges WHERE slug = $1', 'reverse-integer')
        if not rev:
            cid3 = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT INTO ctf_public_challenges (
                    id, "categoryId", title, slug, description, difficulty, points, flag,
                    "dockerImage", ports, "hasDocker", author, "isPublished",
                    "isCodingChallenge", language, "starterCode", "testCases",
                    "timeLimitMs", "memoryLimitMb", "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, 'MEDIUM', 75, $6,
                    'eclipse-temurin:17-jdk', $7, true, 'Nexus Arena', true,
                    true, 'java', $8, $9,
                    3000, 256, NOW(), NOW()
                )
                """,
                cid3, cat_id, "Reverse Integer", "reverse-integer", rev_desc, "flag{j4v4_r3v3rs3_1nt_c0d1ng}",
                json.dumps([22, 8080]), REVERSE_INT_JAVA, json.dumps(REVERSE_INT_TESTS)
            )
            print(f"✅ Created challenge: Reverse Integer (Java -> eclipse-temurin:17-jdk)")
        else:
            await conn.execute(
                """
                UPDATE ctf_public_challenges SET
                    "categoryId" = $1, title = 'Reverse Integer', description = $2, difficulty = 'MEDIUM',
                    points = 75, flag = 'flag{j4v4_r3v3rs3_1nt_c0d1ng}', "dockerImage" = 'eclipse-temurin:17-jdk',
                    ports = $3, "hasDocker" = true, "isPublished" = true, "isCodingChallenge" = true,
                    language = 'java', "starterCode" = $4, "testCases" = $5, "timeLimitMs" = 3000,
                    "memoryLimitMb" = 256, "updatedAt" = NOW()
                WHERE id = $6
                """,
                cat_id, rev_desc, json.dumps([22, 8080]),
                REVERSE_INT_JAVA, json.dumps(REVERSE_INT_TESTS), rev['id']
            )
            print(f"✅ Updated challenge: Reverse Integer (Java -> eclipse-temurin:17-jdk)")

    except Exception as e:
        print(f"❌ Error seeding challenges: {e}")
        raise
    finally:
        await conn.close()
    
    print("=" * 60)
    print("ALL CODING CHALLENGES CONFIGURED FOR NEXUS REGISTRY IMAGES!")
    print("=" * 60)

if __name__ == '__main__':
    asyncio.run(seed_challenges())
