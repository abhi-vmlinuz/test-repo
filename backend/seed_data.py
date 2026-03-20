import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def generate_consistent_id(name: str, prefix: str = "") -> str:
    """Generate a consistent UUID-like ID based on name.
    Same name always generates same ID (deterministic).
    """
    seed = f"{prefix}:{name}"
    hash_bytes = hashlib.sha256(seed.encode()).hexdigest()
    # Format as UUID: 8-4-4-4-12
    return f"{hash_bytes[:8]}-{hash_bytes[8:12]}-{hash_bytes[12:16]}-{hash_bytes[16:20]}-{hash_bytes[20:32]}"

async def seed_database():
    # Clear existing data (but NOT user_progress - to preserve user progress)
    await db.categories.delete_many({})
    await db.challenges.delete_many({})
    
    print("⚠️  Note: user_progress is preserved to maintain user solve history")
    
    # Categories (5 total for pentagon skill matrix) - CONSISTENT IDs
    categories = [
        {
            'id': generate_consistent_id('Web Exploitation', 'category'),
            'name': 'Web Exploitation',
            'description': 'Web vulnerabilities and exploitation techniques',
            'icon': 'Globe'
        },
        {
            'id': generate_consistent_id('Cryptography', 'category'),
            'name': 'Cryptography',
            'description': 'Encryption and decryption challenges',
            'icon': 'Key'
        },
        {
            'id': generate_consistent_id('Forensics', 'category'),
            'name': 'Forensics',
            'description': 'Digital forensics and data recovery',
            'icon': 'Search'
        },
        {
            'id': generate_consistent_id('Binary Exploitation', 'category'),
            'name': 'Binary Exploitation',
            'description': 'Binary analysis and exploitation',
            'icon': 'Binary'
        },
        {
            'id': generate_consistent_id('General Skills', 'category'),
            'name': 'General Skills',
            'description': 'Basic skills including Linux, scripting, and tools',
            'icon': 'Lightbulb'
        }
    ]
    
    await db.categories.insert_many(categories)
    print(f"✓ Inserted {len(categories)} categories")
    
    # Challenges - CONSISTENT IDs based on title
    challenges = [
        # Web Exploitation
        {
            'id': generate_consistent_id('SQL Injection Basics', 'challenge'),
            'category_id': categories[0]['id'],
            'title': 'SQL Injection Basics',
            'description': '''A simple login form is vulnerable to SQL injection. Can you bypass authentication?
            
Target: http://challenge.ctf.local:8080/login
Username field is vulnerable.
            
Hint: Try classic SQL injection payloads.''',
            'difficulty': 'medium',
            'points': 100,
            'flag': 'CTF{sql_1nj3ct10n_m4st3r}',
            'docker_image': 'vulnerables/web-dvwa',
            'hints': [
                {'text': 'The username field doesn\'t sanitize input. Try \' OR \'1\'=\'1', 'cost': 10},
                {'text': 'Use the comment syntax -- to ignore the rest of the query', 'cost': 20}
            ],
            'solves': 0
        },
        {
            'id': generate_consistent_id('XSS Challenge', 'challenge'),
            'category_id': categories[0]['id'],
            'title': 'XSS Challenge',
            'description': '''Find and exploit a Cross-Site Scripting (XSS) vulnerability.
            
Target: http://challenge.ctf.local:8081/search
The search functionality reflects user input without proper sanitization.
            
Objective: Execute an alert with the flag.''',
            'difficulty': 'easy',
            'points': 75,
            'flag': 'CTF{xss_p0p_4l3rt}',
            'docker_image': 'webgoat/goatandwolf',
            'hints': [
                {'text': 'Try injecting <script> tags in the search parameter', 'cost': 10},
                {'text': 'The flag is in the page source after successful XSS', 'cost': 15}
            ],
            'solves': 0
        },
        # Cryptography
        {
            'id': generate_consistent_id('Caesar Cipher', 'challenge'),
            'category_id': categories[1]['id'],
            'title': 'Caesar Cipher',
            'description': '''A message has been encrypted using a Caesar cipher.
            
Encrypted message: FWI{fdhvdu_flskhu_hdvb_shdb}
            
Decode it to get the flag!''',
            'difficulty': 'easy',
            'points': 50,
            'flag': 'CTF{caesar_cipher_easy_peay}',
            'hints': [
                {'text': 'Try shifting the alphabet by 3 positions', 'cost': 5},
                {'text': 'The flag format is CTF{...}', 'cost': 10}
            ],
            'solves': 0
        },
        {
            'id': generate_consistent_id('RSA Decryption', 'challenge'),
            'category_id': categories[1]['id'],
            'title': 'RSA Decryption',
            'description': '''We intercepted an RSA encrypted message with weak parameters.

Public key (n, e): (323, 5)
Encrypted flag: [124, 156, 223, 45, 98, 267, 189, 234]

Decrypt the message to retrieve the flag.''',
            'difficulty': 'hard',
            'points': 150,
            'flag': 'CTF{rs4_w34k_k3y}',
            'docker_image': 'python:3.11-slim',
            'docker_command': 'bash -c "sleep 3600"',
            'hints': [
                {'text': 'n = 323 is factorable. Find p and q first', 'cost': 20},
                {'text': 'Use the formula: d = e^(-1) mod phi(n)', 'cost': 30},
                {'text': 'phi(n) = (p-1)(q-1) where p=17 and q=19', 'cost': 40}
            ],
            'solves': 0
        },
        # Forensics
        {
            'id': generate_consistent_id('Hidden in Metadata', 'challenge'),
            'category_id': categories[2]['id'],
            'title': 'Hidden in Metadata',
            'description': '''A suspicious image file contains hidden information in its metadata.
            
Download: http://challenge.ctf.local:8082/image.jpg
            
Find the flag hidden in the EXIF data.''',
            'difficulty': 'easy',
            'points': 75,
            'flag': 'CTF{m3t4d4t4_n3v3r_l13s}',
            'hints': [
                {'text': 'Use exiftool or similar to examine the metadata', 'cost': 10},
                {'text': 'Check the Comment or Description fields', 'cost': 15}
            ],
            'solves': 0
        },
        {
            'id': generate_consistent_id('Memory Dump Analysis', 'challenge'),
            'category_id': categories[2]['id'],
            'title': 'Memory Dump Analysis',
            'description': '''Analyze this memory dump from a compromised system.
            
Download: http://challenge.ctf.local:8083/memdump.raw
            
The attacker left the flag in a running process. Use volatility or strings to find it.''',
            'difficulty': 'hard',
            'points': 125,
            'flag': 'CTF{m3m0ry_f0r3ns1cs_pr0}',
            'hints': [
                {'text': 'Try using strings command first', 'cost': 15},
                {'text': 'Look for process command lines or environment variables', 'cost': 25},
                {'text': 'The flag is in a python process', 'cost': 35}
            ],
            'solves': 0
        },
        # Binary Exploitation
        {
            'id': generate_consistent_id('Buffer Overflow', 'challenge'),
            'category_id': categories[3]['id'],
            'title': 'Buffer Overflow',
            'description': '''A vulnerable C program has a buffer overflow vulnerability.
            
Target: nc challenge.ctf.local:9001
            
Overflow the buffer to execute the win() function and get the flag.''',
            'difficulty': 'hard',
            'points': 150,
            'flag': 'CTF{buff3r_0v3rfl0w_pwn3d}',
            'docker_image': 'ubuntu:latest',
            'docker_command': 'bash -c "apt-get update && apt-get install -y gcc netcat && sleep 3600"',
            'hints': [
                {'text': 'The buffer is 64 bytes. Calculate the offset to the return address', 'cost': 20},
                {'text': 'The win() function address is 0x08048596', 'cost': 30},
                {'text': 'Use pattern_create and pattern_offset from pwntools', 'cost': 40}
            ],
            'solves': 0
        },
        {
            'id': generate_consistent_id('Format String Vulnerability', 'challenge'),
            'category_id': categories[3]['id'],
            'title': 'Format String Vulnerability',
            'description': '''A program uses printf with user-controlled format strings.
            
Target: nc challenge.ctf.local:9002
            
Exploit the format string vulnerability to read the flag from memory.''',
            'difficulty': 'medium',
            'points': 100,
            'flag': 'CTF{f0rm4t_str1ng_l34k}',
            'hints': [
                {'text': 'Use %x to read values from the stack', 'cost': 15},
                {'text': 'Try %s to read strings from memory addresses', 'cost': 25},
                {'text': 'The flag is at the 7th position on the stack', 'cost': 35}
            ],
            'solves': 0
        },
        # General Skills
        {
            'id': generate_consistent_id('Linux Basics', 'challenge'),
            'category_id': categories[4]['id'],
            'title': 'Linux Basics',
            'description': '''Welcome to CTF! This challenge will test your basic Linux skills.
            
Connect to the server and navigate to find the flag:
Target: ssh ctf@challenge.ctf.local -p 2222
Password: ctf123

The flag is hidden somewhere in the file system.''',
            'difficulty': 'easy',
            'points': 25,
            'flag': 'CTF{l1nux_b4s1cs_m4st3r}',
            'hints': [
                {'text': 'Try using the find command', 'cost': 5},
                {'text': 'Check the /home directory', 'cost': 10}
            ],
            'solves': 0
        },
        {
            'id': generate_consistent_id('Base64 Decoding', 'challenge'),
            'category_id': categories[4]['id'],
            'title': 'Base64 Decoding',
            'description': '''A secret message has been encoded. Decode it to reveal the flag.
            
Encoded message: Q1RGe2I0czM2NF9kM2MwZDFuZ19pc19mdW59

Use command line tools or online decoders to reveal the flag.''',
            'difficulty': 'easy',
            'points': 25,
            'flag': 'CTF{b4s364_d3c0d1ng_is_fun}',
            'hints': [
                {'text': 'Use the base64 command: echo "..." | base64 -d', 'cost': 5}
            ],
            'solves': 0
        }
    ]
    
    await db.challenges.insert_many(challenges)
    print(f"✓ Inserted {len(challenges)} challenges")
    
    # Print the consistent IDs for reference
    print("\n📋 Challenge IDs (consistent):")
    for ch in challenges:
        print(f"   {ch['title']}: {ch['id']}")
    
    print("\n🎯 Database seeded successfully!")
    print(f"   - {len(categories)} categories")
    print(f"   - {len(challenges)} challenges")
    print("\n💡 Note: IDs are now deterministic based on names. Re-seeding won't break user progress!")
    
    client.close()

if __name__ == '__main__':
    asyncio.run(seed_database())
