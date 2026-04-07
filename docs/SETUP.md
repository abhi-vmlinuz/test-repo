# ZecurX LABS - Setup Guide

This guide will help you install and run the ZecurX LABS platform on your computer.

---

## 📋 What You'll Need

Before starting, make sure you have these installed:

| Software | Version | Purpose | Download Link |
|----------|---------|---------|---------------|
| **Python** | 3.8 or higher | Runs the backend server | [python.org](https://python.org) |
| **Node.js** | 16 or higher | Runs the frontend website | [nodejs.org](https://nodejs.org) |
| **MongoDB** | Any recent | Stores all data | [mongodb.com](https://mongodb.com) or use Docker |
| **Docker** | Optional | For running MongoDB easily | [docker.com](https://docker.com) |

### How to Check Your Versions
Open a terminal/command prompt and run:
```bash
python --version    # Should show 3.8 or higher
node --version      # Should show v16 or higher
```

---

## 🚀 Step-by-Step Installation

### Step 1: Start the Database (MongoDB)

**Option A: Using Docker (Recommended)**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option B: Local MongoDB**
- Install MongoDB from [mongodb.com](https://mongodb.com)
- Start the MongoDB service
- Make sure it's running on port 27017

---

### Step 2: Setup the Backend Server

1. **Open a terminal and navigate to the backend folder:**
   ```bash
   cd path/to/zecurx-labs/backend
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   
   **On Windows:**
   ```bash
   venv\Scripts\activate
   ```
   
   **On Mac/Linux:**
   ```bash
   source venv/bin/activate
   ```

4. **Install required packages:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Create the environment file:**
   Create a file called `.env` in the backend folder with this content:
   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=ctf_platform
   JWT_SECRET=your-secret-key-change-this-in-production
   CORS_ORIGINS=*
   ```

6. **Start the backend server:**
   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 8001
   ```

   ✅ **Success!** You should see: `Uvicorn running on http://localhost:8001`

---

### Step 3: Setup the Frontend Website

1. **Open a NEW terminal and navigate to the frontend folder:**
   ```bash
   cd path/to/zecurx-labs/frontend
   ```

2. **Install required packages:**
   ```bash
   npm install
   ```

3. **Create the environment file:**
   Create a file called `.env` in the frontend folder with this content:
   ```env
   VITE_BACKEND_URL=http://localhost:8001
   ```

4. **Start the frontend:**
   ```bash
   npm run dev
   ```

   ✅ **Success!** You should see: `Local: http://localhost:3000`

---

### Step 4: Open the Platform

1. Open your web browser
2. Go to: **http://localhost:3000**
3. You should see the ZecurX LABS landing page!

---

## 👤 Creating Your First Account

1. Click **"Sign In"** on the landing page
2. Click **"Sign Up"** to create a new account
3. Enter your email, username, and password
4. Click **"Create Account"**

### Creating an Admin Account

To access the admin panel, you need to manually set a user as admin in the database:

1. Register a normal account first
2. Open MongoDB Compass or use the MongoDB shell
3. Find the user in the `users` collection
4. Change their `role` field from `"user"` to `"admin"`
5. Log out and log back in
6. You'll now see "Admin" in the navigation menu

---

## 🧪 Testing the Platform

### Test as a Regular User:
1. ✅ Register and login
2. ✅ Browse challenges
3. ✅ Submit a flag
4. ✅ View leaderboard
5. ✅ Check your profile

### Test as an Admin:
1. ✅ Access admin dashboard
2. ✅ Create a new category
3. ✅ Create a challenge
4. ✅ Send a notification

### Test the Student Portal:
1. ✅ (Admin) Create a course
2. ✅ (Admin) Create enrollment code for a user
3. ✅ (User) Join course using the code
4. ✅ (User) Access enrolled courses

---

## ⚠️ Common Problems & Solutions

### Problem: "MongoDB connection failed"
**Solution:** 
- Make sure MongoDB is running
- Check if Docker container is running: `docker ps`
- Verify the MONGO_URL in your .env file

### Problem: "CORS error" in browser console
**Solution:**
- Add your frontend URL to `CORS_ORIGINS` in backend `.env`
- Restart the backend server

### Problem: "Cannot find module" error
**Solution:**
- Delete the `node_modules` folder
- Run `npm install` again

### Problem: Backend won't start
**Solution:**
- Check if port 8001 is already in use
- Make sure virtual environment is activated
- Verify all packages are installed

### Problem: Frontend won't start
**Solution:**
- Check if port 3000 is already in use
- Run `npm install` first
- Check Node.js version (needs v16+)

---

## 🌐 Accessing From Other Devices

To access the platform from other devices on your network:

### Backend:
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Frontend:
Update the frontend `.env` file with your computer's IP address:
```env
VITE_BACKEND_URL=http://YOUR_IP_ADDRESS:8001
```

### For Internet Access (Using Cloudflare Tunnel):
See the advanced deployment guide for exposing to the internet.

---

## 📂 Environment Variables Reference

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Database name | `ctf_platform` |
| `JWT_SECRET` | Secret key for authentication | `your-secret-key` |
| `CORS_ORIGINS` | Allowed frontend URLs | `*` or `http://localhost:3000` |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_URL` | Backend API URL | `http://localhost:8001` |

---

## 🛑 Stopping the Servers

### Stop Frontend:
Press `Ctrl + C` in the terminal running the frontend

### Stop Backend:
Press `Ctrl + C` in the terminal running the backend

### Stop MongoDB (Docker):
```bash
docker stop mongodb
```

---

## Need Help?

If you encounter issues not covered here:
1. Check the terminal/console for error messages
2. Review the environment variables
3. Make sure all prerequisites are installed
4. Restart both servers

---

<p align="center">
  <strong>Happy Learning! 🎯🔐</strong>
</p>
