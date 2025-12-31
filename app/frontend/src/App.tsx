import { useState, useEffect } from 'react';
import ScrollToTop from '@/components/ScrollToTop';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import PricingPage from '@/pages/PricingPage';
import Dashboard from '@/pages/Dashboard';
import Challenges from '@/pages/Challenges';
import ChallengeDetail from '@/pages/ChallengeDetail';
import Leaderboard from '@/pages/Leaderboard';
import Profile from '@/pages/Profile';

// Static/Info Pages
import AboutUs from '@/pages/AboutUs';
import Careers from '@/pages/Careers';
import Contact from '@/pages/Contact';
import Blog from '@/pages/Blog';
import Community from '@/pages/Community';
import Documentation from '@/pages/Documentation';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import Cookie from '@/pages/Cookie';

// Admin Pages
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminChallenges from '@/pages/admin/AdminChallenges';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminSubmissions from '@/pages/admin/AdminSubmissions';
import AdminStudentPortal from '@/pages/admin/AdminStudentPortal';
import AdminNotifications from '@/pages/admin/AdminNotifications';
import AdminNexus from '@/pages/admin/AdminNexus';

// Student Pages
import StudentLayout from '@/pages/student/StudentLayout';
import StudentDashboard from '@/pages/student/StudentDashboard';
import StudentCourses from '@/pages/student/StudentCourses';
import StudentCourse from '@/pages/student/StudentCourse';
import StudentModule from '@/pages/student/StudentModule';
import StudentChallenge from '@/pages/student/StudentChallenge';
import StudentAchievements from '@/pages/student/StudentAchievements';
import StudentProgress from '@/pages/student/StudentProgress';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export { API, toast };

// Axios interceptor for auth
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  // Check if user is admin
  const isAdmin = user && ['admin', 'superadmin'].includes(user.role);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4" />
          <div className="text-gray-400 text-sm font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage setUser={setUser} />} />
          <Route path="/pricing" element={<PricingPage user={user} />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/community" element={<Community />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookie" element={<Cookie />} />

          {/* Protected CTF routes */}
          <Route path="/dashboard" element={user ? <Dashboard user={user} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/challenges" element={user ? <Challenges user={user} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/challenges/:id" element={user ? <ChallengeDetail user={user} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/leaderboard" element={user ? <Leaderboard user={user} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile user={user} logout={logout} setUser={setUser} /> : <Navigate to="/login" />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={isAdmin ? <AdminLayout user={user} logout={logout} /> : <Navigate to="/dashboard" />}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="challenges" element={<AdminChallenges />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="users" element={<AdminUsers user={user} />} />
            <Route path="submissions" element={<AdminSubmissions />} />
            <Route path="notifications" element={<AdminNotifications user={user} />} />
            <Route path="student-portal" element={<AdminStudentPortal user={user} />} />
            <Route path="nexus" element={<AdminNexus user={user} logout={logout} />} />
          </Route>

          {/* Student Portal routes - accessible to all logged-in users */}
          <Route
            path="/student"
            element={user ? <StudentLayout user={user} logout={logout} /> : <Navigate to="/login" />}
          >
            <Route index element={<StudentDashboard user={user} />} />
            <Route path="courses" element={<StudentCourses user={user} />} />
            <Route path="course/:courseId" element={<StudentCourse user={user} />} />
            <Route path="module/:moduleId" element={<StudentModule user={user} />} />
            <Route path="challenge/:challengeId" element={<StudentChallenge user={user} />} />
            <Route path="progress" element={<StudentProgress user={user} />} />
            <Route path="achievements" element={<StudentAchievements user={user} />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        closeButton={true}
        toastOptions={{
          style: {
            background: '#fff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
          },
          className: 'shadow-lg',
        }}
      />
    </div>
  );
}

export default App;
