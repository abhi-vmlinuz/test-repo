import { useState, useEffect } from 'react';
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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
        <Routes>
          {/* Public routes */}
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage setUser={setUser} />} />
          <Route path="/pricing" element={<PricingPage />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={user ? <Dashboard user={user} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/challenges" element={user ? <Challenges user={user} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/challenges/:id" element={user ? <ChallengeDetail user={user} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/leaderboard" element={user ? <Leaderboard user={user} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile user={user} logout={logout} setUser={setUser} /> : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
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
