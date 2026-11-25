// App.jsx — Mode Router
// Uses react-router-dom for separate Public/Secure zones

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Dashboard } from './dashboard/Dashboard.jsx';
import { SurvivorMode } from './modes/SurvivorMode/SurvivorMode.jsx';
import { RescueMode } from './modes/RescueMode/RescueMode.jsx';
import { Login } from './pages/Login/Login.jsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { X_NDMADashboard } from './X_command/X_NDMADashboard.jsx';
import { authService } from './core/auth/authService.js';
import { db } from './core/storage/IndexedDBAdapter.js';
import { attemptSync } from './core/storage/SyncQueue.js';

// Wrapper component to handle routing logic for existing components
const ModeWrapper = ({ component: Component, mode }) => {
  const navigate = useNavigate();

  const handleSwitchMode = (newMode) => {
    if (newMode === 'survivor') navigate('/');
    else navigate(`/${newMode}`);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return <Component onSwitchMode={handleSwitchMode} onLogout={handleLogout} />;
};

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    db.open()
      .then(() => { setDbReady(true); attemptSync(); })
      .catch(err => { console.error('IndexedDB init failed:', err); setDbReady(true); });
  }, []);

  if (!dbReady) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--earth-obsidian)', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--earth-parchment)', letterSpacing: '0.1em' }}>
          NeuroGrid
        </div>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.8rem', color: 'var(--accent-amber)' }}>
          Initializing offline store…
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route - Survivor Mode */}
        <Route path="/" element={<ModeWrapper component={SurvivorMode} mode="survivor" />} />

        {/* Public Route - Login Page */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes - For Rescue/Admin */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<ModeWrapper component={Dashboard} mode="dashboard" />} />
          <Route path="/rescue" element={<ModeWrapper component={RescueMode} mode="rescue" />} />
          <Route path="/ndma" element={<ModeWrapper component={X_NDMADashboard} mode="ndma" />} />
        </Route>

        {/* Catch-all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
