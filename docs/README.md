# ZecurX LABS - Cybersecurity Learning & CTF Platform

> [!IMPORTANT]
> Split-repo deployment note: nginx/certbot/reverse-proxy config is managed in `zecurx-infra`.
> This repo (`zecurx-ctf`) does not own active nginx config.

<p align="center">
  <strong>A comprehensive cybersecurity education and Capture The Flag (CTF) platform</strong>
</p>

---

## 🌟 What is ZecurX LABS?

ZecurX LABS is an **all-in-one cybersecurity learning platform** that combines:

1. **Capture The Flag (CTF) Challenges** - Practice hacking skills in a safe, legal environment
2. **Student Learning Portal** - Structured courses with modules and challenges
3. **Admin Management System** - Complete control over content and users

Think of it like a **cybersecurity school website** where:
- **Students** learn through hands-on challenges
- **Teachers/Admins** create and manage courses
- **Everyone** can track their progress and compete on leaderboards

---

## 🎯 Who Is This For?

| User Type | What They Can Do |
|-----------|------------------|
| **Students/Learners** | Register, enroll in courses, solve challenges, earn points, track progress |
| **Administrators** | Create courses, manage users, send notifications, view analytics |
| **CTF Enthusiasts** | Practice cybersecurity skills across multiple categories |

---

## ✨ Key Features

### For Students & Learners
- 📚 **Course Enrollment** - Join courses using enrollment codes
- 🎯 **Challenge Solving** - Test skills with real cybersecurity challenges
- 🏆 **Points & Leaderboard** - Compete with others and track rankings
- 📊 **Progress Tracking** - Visual dashboards showing learning progress
- 💡 **Hint System** - Get help when stuck (costs points)
- 🔔 **Notifications** - Receive announcements and messages from admins

### For Administrators
- 👥 **User Management** - View, edit, and manage all platform users
- 📖 **Course Management** - Create courses, modules, and challenges
- 🎫 **Enrollment Codes** - Generate codes for students to join courses
- 📢 **Notifications** - Send announcements to all users or specific individuals
- 📈 **Dashboard Analytics** - View platform statistics and user activity

### Technical Features
- 🔐 **Secure Authentication** - JWT-based login with password encryption
- 🎨 **Modern UI Design** - Clean, responsive interface with dark/light modes
- 🚀 **Fast Performance** - Optimized React frontend with async Python backend
- 📱 **Mobile Friendly** - Works on all devices and screen sizes

---

## 🖥️ Platform Sections

### 1. Main CTF Platform (`/dashboard`, `/challenges`)
The core CTF experience:
- Browse challenges by category (Web Exploitation, Cryptography, Forensics, etc.)
- Submit flags to earn points
- View leaderboards and compete with others

### 2. Student Portal (`/student/...`)
Structured learning experience:
- **Dashboard** - Overview of enrolled courses and progress
- **My Courses** - List of courses you're enrolled in
- **Modules & Challenges** - Step-by-step learning path
- **Achievements** - Badges and milestones earned

### 3. Admin Panel (`/admin/...`)
Complete administrative control:
- **Dashboard** - Platform statistics and overview
- **Users** - Manage all user accounts
- **Challenges** - Create CTF challenges
- **Categories** - Manage challenge categories
- **Student Portal** - Manage courses, modules, enrollment
- **Notifications** - Send messages to users

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** - Backend server
- **Node.js v16+** - Frontend application
- **MongoDB** - Database (can be run via Docker)

### Installation

1. **Start MongoDB**
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **Setup Backend**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate      # Windows
   # source venv/bin/activate  # Mac/Linux
   pip install -r requirements.txt
   uvicorn server:app --reload --port 8001
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Platform**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001
   - API Docs: http://localhost:8001/docs

---

## 📁 Project Structure

```
zecurx-labs/
├── backend/                    # Python FastAPI Server
│   ├── server.py              # Main API server
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
│
├── frontend/                   # React Application
│   ├── src/
│   │   ├── pages/             # Page components
│   │   │   ├── admin/         # Admin panel pages
│   │   │   ├── student/       # Student portal pages
│   │   │   └── *.js           # Main CTF pages
│   │   ├── components/        # Reusable UI components
│   │   └── App.js             # Main app component
│   └── package.json           # Node dependencies
│
└── Documentation/
    ├── README.md              # This file
    ├── SETUP.md               # Detailed setup instructions
    ├── FEATURES.md            # Complete feature documentation
    └── API_REFERENCE.md       # API endpoint documentation
```

---

## 🔮 Future Development

The following features are planned for future releases:

### Coming Soon
- 🐳 **Docker Integration** - Isolated lab environments for each challenge
- 🔑 **OAuth2 Authentication** - Login with Google, GitHub
- 📝 **Profile Editing** - Users can update their own information
- 🔒 **Password Reset** - Email-based password recovery

### Planned Features
- 👥 **Team Functionality** - Compete as teams
- 📄 **Write-up Submissions** - Share solutions with the community
- ⏱️ **Time-Limited CTFs** - Competition mode with deadlines
- 💳 **Premium Subscriptions** - Paid tier for advanced content

---

## 🛡️ Security

- All passwords are hashed using bcrypt
- JWT tokens for secure session management
- Protected API routes with authentication
- Input validation on all forms
- CORS configuration for allowed origins

---

## 📞 Support

For setup help, see the detailed [SETUP.md](./SETUP.md) guide.

For feature documentation, see [FEATURES.md](./FEATURES.md).

---

<p align="center">
  <strong>Built for cybersecurity learners and professionals</strong>
  <br>
  <em>ZecurX Pvt. Ltd.</em>
</p>
