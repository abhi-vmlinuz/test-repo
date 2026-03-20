# ZecurX LABS - API Reference

This document details all API endpoints available in the ZecurX LABS backend.

**Base URL:** `http://localhost:8001/api`

---

## 📑 Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Categories](#categories)
4. [CTF Challenges](#ctf-challenges)
5. [Flag Submission & Hints](#flag-submission--hints)
6. [Statistics & Leaderboard](#statistics--leaderboard)
7. [Student Portal](#student-portal)
8. [Admin Endpoints](#admin-endpoints)
9. [Notifications](#notifications)

---

## Authentication

### Register New User
```http
POST /api/auth/register
```
**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```
**Response:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "score": 0,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

### Login
```http
POST /api/auth/login
```
**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```
**Response:** Same as register

---

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```
**Response:**
```json
{
  "id": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "role": "user",
  "score": 450,
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

## User Management

### Get Leaderboard
```http
GET /api/leaderboard?limit=50
Authorization: Bearer <token>
```
**Response:**
```json
[
  {
    "id": "uuid",
    "username": "hacker123",
    "score": 850,
    "challenges_solved": 7,
    "rank": 1
  }
]
```

---

## Categories

### List All Categories
```http
GET /api/categories
Authorization: Bearer <token>
```
**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Web Exploitation",
    "description": "Web security challenges",
    "icon": "Globe",
    "challenge_count": 3
  }
]
```

---

## CTF Challenges

### List All Challenges
```http
GET /api/challenges
Authorization: Bearer <token>
```
**Response:**
```json
[
  {
    "id": "uuid",
    "title": "SQL Injection Basics",
    "description": "Bypass authentication...",
    "category_id": "uuid",
    "difficulty": "medium",
    "points": 100,
    "solves": 15,
    "is_published": true,
    "hints": [...],
    "user_progress": {
      "solved": false,
      "hints_used": []
    }
  }
]
```

---

### Get Single Challenge
```http
GET /api/challenges/{challenge_id}
Authorization: Bearer <token>
```
**Response:** Single challenge object with full user progress

---

## Flag Submission & Hints

### Submit Flag
```http
POST /api/submit
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "challenge_id": "uuid",
  "flag": "CTF{example_flag}"
}
```
**Response (Correct):**
```json
{
  "correct": true,
  "message": "Correct flag!",
  "points": 100
}
```
**Response (Incorrect):**
```json
{
  "correct": false,
  "message": "Incorrect flag. Try again!"
}
```

---

### Unlock Hint
```http
POST /api/hints
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "challenge_id": "uuid",
  "hint_index": 0
}
```
**Response:**
```json
{
  "hint": "The vulnerability is in the login form...",
  "cost": 10,
  "already_unlocked": false
}
```

---

## Statistics & Leaderboard

### Get My Statistics
```http
GET /api/stats/me
Authorization: Bearer <token>
```
**Response:**
```json
{
  "total_score": 450,
  "challenges_solved": 5,
  "total_challenges": 10,
  "rank": 12,
  "category_stats": [
    {
      "category": "Web Exploitation",
      "solved": 2,
      "total": 3
    }
  ]
}
```

---

## Student Portal

### Student Registration
```http
POST /api/student/register
```
**Request Body:**
```json
{
  "username": "student1",
  "email": "student@example.com",
  "password": "password123",
  "invite_code": "ABC123XY"
}
```

---

### Get My Enrollments
```http
GET /api/student/enrollments
Authorization: Bearer <token>
```
**Response:**
```json
{
  "enrollments": [
    {
      "id": "uuid",
      "name": "Penetration Testing",
      "description": "...",
      "progress": 45,
      "color": "blue"
    }
  ]
}
```

---

### Join Course
```http
POST /api/student/join-course
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "enrollment_code": "ABC123XY"
}
```

---

### Get Course Details
```http
GET /api/student/courses/{course_id}
Authorization: Bearer <token>
```

---

### Get Module Details
```http
GET /api/student/modules/{module_id}
Authorization: Bearer <token>
```

---

### Submit Student Challenge Flag
```http
POST /api/student/submit-flag
Authorization: Bearer <token>
```
**Request Body:**
```json
{
  "challenge_id": "uuid",
  "flag_index": 0,
  "flag": "FLAG{answer}"
}
```

---

## Admin Endpoints

All admin endpoints require admin role.

### User Management
```http
GET  /api/admin/users                    # List all users
GET  /api/admin/users/{user_id}          # Get user details
PUT  /api/admin/users/{user_id}          # Update user
POST /api/admin/users/{user_id}/reset-progress  # Reset progress
GET  /api/admin/users/search?q=query     # Search users
```

---

### Challenge Management
```http
GET    /api/admin/challenges             # List challenges
POST   /api/admin/challenges             # Create challenge
PUT    /api/admin/challenges/{id}        # Update challenge
DELETE /api/admin/challenges/{id}        # Delete challenge
```

---

### Category Management
```http
GET    /api/admin/categories             # List categories
POST   /api/admin/categories             # Create category
PUT    /api/admin/categories/{id}        # Update category
DELETE /api/admin/categories/{id}        # Delete category
```

---

### Course Management
```http
GET    /api/admin/courses                # List courses
POST   /api/admin/courses                # Create course
PUT    /api/admin/courses/{id}           # Update course
DELETE /api/admin/courses/{id}           # Delete course
```

---

### Module Management
```http
GET    /api/admin/modules                # List modules
POST   /api/admin/modules                # Create module
PUT    /api/admin/modules/{id}           # Update module
DELETE /api/admin/modules/{id}           # Delete module
```

---

### Student Challenge Management
```http
GET    /api/admin/student-challenges           # List challenges
POST   /api/admin/student-challenges           # Create challenge
PUT    /api/admin/student-challenges/{id}      # Update challenge
DELETE /api/admin/student-challenges/{id}      # Delete challenge
```

---

### Enrollment Management
```http
GET  /api/admin/student-enrollments      # List all enrollments
POST /api/admin/enroll-user              # Generate enrollment code
POST /api/admin/unenroll-user            # Remove user from course
GET  /api/admin/enrollment-codes         # List all codes
DELETE /api/admin/enrollment-codes/{id}  # Delete code
```

---

### Submissions
```http
GET /api/admin/submissions               # View all submissions
GET /api/admin/stats                     # Platform statistics
```

---

## Notifications

### User Endpoints
```http
GET  /api/notifications                  # Get my notifications
POST /api/notifications/read-all         # Mark all as read
POST /api/notifications/{id}/read        # Mark one as read
```

### Admin Endpoints
```http
POST /api/admin/notifications            # Send notification
GET  /api/admin/notifications            # View sent notifications
```

**Send Notification Request:**
```json
{
  "title": "Important Update",
  "message": "New challenges available!",
  "type": "announcement",
  "target_type": "all"
}
```

**Send to Specific Users:**
```json
{
  "title": "Course Reminder",
  "message": "Complete your module",
  "type": "message",
  "target_type": "specific",
  "target_user_ids": ["uuid1", "uuid2"]
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "detail": "Error message here"
}
```

**Common Status Codes:**
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (not allowed) |
| 404 | Not found |
| 500 | Server error |

---

## Authentication Header

All authenticated endpoints require:
```http
Authorization: Bearer <jwt_token>
```

The token is obtained from the login/register response.

---

<p align="center">
  <strong>API Reference | ZecurX LABS</strong>
</p>
