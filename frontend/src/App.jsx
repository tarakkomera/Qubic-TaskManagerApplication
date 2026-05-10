import React from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import  Layout  from './components/Layout'
import Signup from './components/Signup'
import Login from './components/Login'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import PendingPage from './pages/PendingPage'
import CompletedPage from './pages/CompletedPage'
import KanbanBoard from './pages/KanbanBoard'
import Profile from './components/Profile'
import StaffDirectory from './pages/StaffDirectory'
import Performance from './pages/Performance'
import Home from './pages/Home'
import SplashScreen from './components/SplashScreen'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const App = () => {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('currentUser')
    return stored ? JSON.parse(stored) : null
  })

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('currentUser')
    }
  }, [currentUser])

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}`}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        const u = data.user;
        setCurrentUser({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          points: u.points || 0,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=random`,
        });
      }
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  }, []);

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('token')) refreshUser();
  }, [refreshUser]);

  const handleAuthSubmit = useCallback(data => {
    const user = {
      id: data.id || data.userId || data.user?._id || data.user?.id,
      email: data.email || data.user?.email,
      name: data.name || data.user?.name || 'User',
      role: data.role || data.user?.role || 'staff',
      points: data.points || data.user?.points || 0,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || data.user?.name || 'User')}&background=random`,
    }
    setCurrentUser(user)
    navigate('/', { replace: true })
  }, [navigate]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    setCurrentUser(null)
    navigate('/login', { replace: true })
  }, [navigate]);


  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <div className="h-full w-full">
        <Routes>
        <Route
        path='/login'
        element={
          <div className='fixed inset-0 bg-[#0f172a] overflow-y-auto custom-scrollbar'>
            <Login onSubmit={handleAuthSubmit} onSwitchMode={() => navigate('/signup')} />
          </div>
        }
      />

      <Route
        path='/signup'
        element={
          <div className='fixed inset-0 bg-[#0f172a] overflow-y-auto custom-scrollbar'>
            <Signup onSubmit={handleAuthSubmit} onSwitchMode={() => navigate('/login')} />
          </div>
        }
      />

      <Route path='/verify' element={<VerifyEmail />} />

      <Route element={currentUser ? <Layout user={currentUser} onLogout={handleLogout} refreshUser={refreshUser}><Outlet /></Layout> : <Navigate to='/login' replace />}>
        <Route path='/' element={<Home />} />
        <Route path='/tasks' element={<Dashboard />} />
        <Route path='/kanban' element={<KanbanBoard />} />
        <Route path='/performance' element={<Performance />} />
        <Route path='/pending' element={<PendingPage />} />
        <Route path='/complete' element={<CompletedPage />} />
        <Route path='/staff' element={<StaffDirectory />} />
        <Route path='/profile' element={<Profile user={currentUser} setCurrentUser={setCurrentUser} onLogout={handleLogout} />} />
      </Route>

        <Route path='*' element={<Navigate to={currentUser ? '/' : '/login'} replace />} />
        </Routes>
      </div>
    </>
  )
}

export default App