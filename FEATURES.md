# ZecurX LABS - Complete Features Guide

This document explains every feature and page in the ZecurX LABS platform.

---

## 📑 Table of Contents

1. [Landing Page](#1-landing-page)
2. [Authentication (Login/Register)](#2-authentication)
3. [Main Dashboard](#3-main-dashboard)
4. [Challenges Page](#4-challenges-page)
5. [Challenge Detail Page](#5-challenge-detail-page)
6. [Leaderboard](#6-leaderboard)
7. [User Profile](#7-user-profile)
8. [Student Portal](#8-student-portal)
9. [Admin Panel](#9-admin-panel)
10. [Notification System](#10-notification-system)

---

## 1. Landing Page

**URL:** `/`

### What It Does:
The first page visitors see when they arrive at the platform.

### Features:
- **Hero Section** - Eye-catching introduction with platform tagline
- **Feature Highlights** - Showcases what the platform offers
- **Call-to-Action Buttons** - Links to sign in or learn more
- **Animated Background** - Floating particles for visual appeal

### Who Can Access:
Everyone (no login required)

---

## 2. Authentication

**URLs:** `/login`, `/register`

### Login Page Features:
- Email and password input
- "Remember me" option
- Forgot password link (future: OAuth2)
- Error messages for invalid credentials

### Register Page Features:
- Username, email, and password input
- Password confirmation
- Input validation (email format, password length)
- Automatic login after registration

### How It Works:
1. User enters credentials
2. Backend validates and creates JWT token
3. Token stored in browser (localStorage)
4. Token sent with all API requests
5. Token expires after 7 days

---

## 3. Main Dashboard

**URL:** `/dashboard`

### What It Does:
Shows an overview of the user's progress and quick statistics.

### Features:
| Section | Description |
|---------|-------------|
| **Welcome Header** | Personalized greeting with username |
| **Notification Bell** | Shows unread notifications count |
| **Statistics Cards** | Total score, rank, challenges solved |
| **Category Progress** | Visual bars showing progress per category |
| **Recent Challenges** | Quick access to available challenges |
| **Leaderboard Preview** | Top 5 players |
| **Quick Links** | Navigate to challenges, profile, etc. |

### Who Can Access:
Logged-in users only

---

## 4. Challenges Page

**URL:** `/challenges`

### What It Does:
Lists all CTF challenges available on the platform.

### Features:
- **Category Filter** - Filter challenges by type (Web, Crypto, etc.)
- **Challenge Cards** - Show title, points, difficulty, solved status
- **Difficulty Badges** - Easy (green), Medium (yellow), Hard (red)
- **Solved Indicator** - Checkmark on completed challenges
- **Challenge Count** - Shows total and solved per category

### Challenge Categories:
1. **Web Exploitation** - SQL injection, XSS, etc.
2. **Cryptography** - Ciphers, encryption, decryption
3. **Forensics** - File analysis, hidden data
4. **Binary Exploitation** - Buffer overflow, format strings
5. **General Skills** - Basic Linux, scripting

### Who Can Access:
Logged-in users only

---

## 5. Challenge Detail Page

**URL:** `/challenges/:id`

### What It Does:
Shows full challenge information and allows flag submission.

### Features:
| Feature | Description |
|---------|-------------|
| **Challenge Description** | Full problem statement |
| **Hints Accordion** | Locked hints with unlock cost |
| **Flag Input** | Text field to submit answer |
| **Submit Button** | Validates the flag |
| **Docker Lab** | (Future) Launches isolated environment |
| **Solve Count** | How many users solved it |

### How Flag Submission Works:
1. User enters the flag (format: `CTF{...}`)
2. Click "Submit Flag"
3. Backend compares to stored answer
4. If correct: Points added, challenge marked solved
5. If incorrect: Error message shown

### Hint System:
- Each hint costs points (5-40 points)
- Once unlocked, hint is always visible
- Cost deducted whether you solve or not

---

## 6. Leaderboard

**URL:** `/leaderboard`

### What It Does:
Shows ranking of all users by total score.

### Features:
- **Top 3 Highlight** - Gold, silver, bronze styling
- **Rank Column** - Position number
- **Username Column** - Player name
- **Score Column** - Total points earned
- **Challenges Solved** - Number of completed challenges
- **Current User Highlight** - Your row is highlighted

### Who Can Access:
Logged-in users only

---

## 7. User Profile

**URL:** `/profile`

### What It Does:
Shows user's personal information and detailed statistics.

### Features:
| Section | Description |
|---------|-------------|
| **Profile Card** | Avatar (initials), username, email, score |
| **Edit Profile Button** | Opens modal to update info (future: OAuth2) |
| **Logout Button** | Signs out of the platform |
| **Overview Stats** | Total score, rank, challenges solved |
| **Achievements** | Badges earned (100 points, 500 points, etc.) |
| **Account Details** | Username, email, join date |

### Achievements System:
- **First Blood** - First to solve any challenge
- **Century** - 100 points total
- **Half K** - 500 points total
- **Completionist** - All challenges solved

---

## 8. Student Portal

The Student Portal is a separate learning management system within ZecurX LABS.

### 8.1 Student Dashboard
**URL:** `/student/dashboard`

**Features:**
- Quick stats (enrolled courses, progress, achievements)
- Course overview with progress bars
- Recent activity feed
- Animated particle background

### 8.2 My Courses
**URL:** `/student/courses`

**Features:**
- Grid of enrolled courses
- Course color coding (set by admin)
- Progress percentage per course
- Join course with enrollment code

### 8.3 Course Detail
**URL:** `/student/course/:id`

**Features:**
- Course overview
- List of modules in the course
- Progress tracking per module
- Navigate to individual modules

### 8.4 Module Detail
**URL:** `/student/course/:courseId/module/:moduleId`

**Features:**
- Module description
- List of challenges in module
- Capstone challenge indicator
- Challenge completion status

### 8.5 Challenge Page
**URL:** `/student/challenge/:id`

**Features:**
- Challenge description with context
- Multiple flag submission (2+ flags per challenge)
- Hints system
- Progress tracking
- Points earned display

### 8.6 Achievements
**URL:** `/student/achievements`

**Features:**
- All available achievements
- Earned vs locked status
- Visual badges

### How Course Enrollment Works:
1. Admin creates a course
2. Admin generates enrollment code for a student
3. Student enters code in "Join Course" section
4. Student gains access to course content
5. Admin can unenroll student if needed

---

## 9. Admin Panel

The Admin Panel provides full control over the platform.

### 9.1 Admin Dashboard
**URL:** `/admin`

**Features:**
- Total users count
- Total challenges count
- Total submissions count
- Recent activity overview

### 9.2 User Management
**URL:** `/admin/users`

**Features:**
| Action | Description |
|--------|-------------|
| **View Users** | List all registered users |
| **Edit User** | Change username, email, or role |
| **Delete User** | Remove user account |
| **Reset Progress** | Clear user's challenge progress |
| **Make Admin** | Promote user to admin role |

### 9.3 Challenge Management
**URL:** `/admin/challenges`

**Features:**
- Create new CTF challenges
- Edit existing challenges
- Delete challenges
- Set points, difficulty, category
- Add multiple hints with costs
- Add multi-part questions (for student challenges)

### 9.4 Category Management
**URL:** `/admin/categories`

**Features:**
- Create challenge categories
- Set category icons
- Edit category names/descriptions
- Delete categories

### 9.5 Student Portal Management
**URL:** `/admin/student-portal`

### 9.5.1 Github Folder structure to be followed for challenge repo
```
challenges-repo/
├── sqli-basic/
│   └── Dockerfile
├── web-multi/
│   ├── docker-compose.yml
│   ├── web/
│   │   └── Dockerfile
│   └── db/
│       └── Dockerfile
└── pwn-easy/
    └── Dockerfile
```
**Tabs:**
| Tab | Features |
|-----|----------|
| **Courses & Modules** | Create/edit/delete courses, add modules |
| **Student Challenges** | Create challenges with context and multi-flags |
| **Enroll Users** | Generate enrollment codes for specific users |
| **Enrollments** | View all enrolled students, unenroll users |

**Course Colors:**
Admins can set custom colors for each course (gray, blue, purple, green, red, orange, indigo, teal, pink, cyan).

### 9.6 Submissions View
**URL:** `/admin/submissions`

**Features:**
- View all flag submissions
- Filter by correct/incorrect
- See which users attempted which challenges

### 9.7 Notifications
**URL:** `/admin/notifications`

**Features:**
| Type | Description |
|------|-------------|
| **Announcements** | Send to all users |
| **Direct Messages** | Send to specific users |
| **User Search** | Find users by username/email |
| **History** | View previously sent notifications |

---

## 10. Notification System

### For Users:
- **Bell Icon** - Shows in header with unread count
- **Dropdown** - Click to see notifications
- **Mark as Read** - Click individual or "Mark all as read"
- **Time Ago** - Shows relative time (5m ago, 2h ago)

### For Admins:
- **Send Announcements** - Reach all users at once
- **Send Direct Messages** - Contact specific users
- **Search Users** - Find recipients by name/email
- **View History** - See all sent notifications

---

## 🔮 Future Features

### Planned for Next Update:
| Feature | Description | Status |
|---------|-------------|--------|
| **Docker Labs** | Isolated challenge environments | Planned |
| **OAuth2 Login** | Google/GitHub authentication | Planned |
| **Profile Editing** | Users update own info | UI Ready |
| **Password Reset** | Email-based recovery | Planned |

### Long-term Roadmap:
- Team competitions
- Write-up submissions
- Time-limited CTFs
- Premium subscription tier
- Challenge file downloads
- Real-time scoreboards

---

## 📊 Technical Architecture

### Frontend (React + Vite)
- React 18 with hooks
- Vite build tool
- Tailwind CSS styling
- Shadcn/UI components
- React Router navigation
- Axios HTTP client
- Sonner toast notifications

### Backend (Python + FastAPI)
- FastAPI framework
- MongoDB with Motor async driver
- JWT authentication
- bcrypt password hashing
- Pydantic data validation
- CORS middleware

### Database (MongoDB)
**Collections:**
| Collection | Purpose |
|------------|---------|
| `users` | User accounts |
| `categories` | Challenge categories |
| `challenges` | CTF challenges |
| `user_progress` | Solved challenges, hints used |
| `courses` | Student portal courses |
| `course_modules` | Course modules |
| `student_challenges` | Student portal challenges |
| `student_enrollments` | Course enrollments |
| `enrollment_codes` | Enrollment codes |
| `notifications` | User notifications |

---

<p align="center">
  <strong>Complete Feature Reference | ZecurX LABS</strong>
</p>
