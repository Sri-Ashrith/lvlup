import { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import TeamLogin from './pages/TeamLogin';
import AdminLogin from './pages/AdminLogin';
import TeamDashboard from './pages/TeamDashboard';
import AdminPanel from './pages/AdminPanel';
import Level1Arena from './pages/levels/Level1Arena';
import Level2Skills from './pages/levels/Level2Skills';
import Level3Heist from './pages/levels/Level3Heist';
import Leaderboard from './pages/Leaderboard';
import BackgroundEffects from './components/BackgroundEffects';
import GTALoadingScreen from './components/GTALoadingScreen';
import CustomCursor from './components/landing/CustomCursor';

function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

// PERF-03: Connection status banner
function ConnectionBanner() {
  const { connectionStatus, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || connectionStatus === 'connected') return null;
  
  const messages = {
    disconnected: 'Connection lost. Reconnecting...',
    error: 'Unable to connect to server.',
    reconnecting: 'Reconnecting...'
  };
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gta-red/90 text-white text-center py-2 font-mono text-sm animate-pulse">
      ⚠ {messages[connectionStatus] || 'Connection issue'}
    </div>
  );
}

function App() {
  const [showLoading, setShowLoading] = useState(true);
  const handleLoadingComplete = useCallback(() => setShowLoading(false), []);

  return (
    <Router>
      <CustomCursor />
      {showLoading && <GTALoadingScreen onComplete={handleLoadingComplete} />}
      <div className="min-h-screen relative film-grain">
        <ConnectionBanner />
        <BackgroundEffects />
        <div className="relative z-10">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/team-login" element={<TeamLogin />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            
            {/* Team Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredRole="team">
                  <TeamDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/level/1" 
              element={
                <ProtectedRoute requiredRole="team">
                  <Level1Arena />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/level/2" 
              element={
                <ProtectedRoute requiredRole="team">
                  <Level2Skills />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/level/3" 
              element={
                <ProtectedRoute requiredRole="team">
                  <Level3Heist />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
