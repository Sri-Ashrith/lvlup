import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import {
  Trophy,
  Volume2,
  VolumeX,
  LogOut,
  Home,
  Skull,
} from 'lucide-react';

// Cinematic landing components
import HeroSection from '../components/landing/HeroSection';
import MissionBoard from '../components/landing/MissionBoard';
import ProgressionPanel from '../components/landing/ProgressionPanel';
import ActionButtons from '../components/landing/ActionButtons';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { playSound, toggleMute, isMuted } = useSound();

  const handleNavigation = (path) => {
    playSound('click');
    navigate(path);
  };

  const handleLogout = () => {
    playSound('click');
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Navbar — sticky, translucent, blurred */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-gta-dark/80 border-b border-gta-green/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 border border-gta-green/30 rounded flex items-center justify-center bg-gta-green/5">
              <Skull className="w-5 h-5 text-gta-green" />
            </div>
            <span className="font-condensed text-lg tracking-[3px] uppercase text-white hidden sm:block">
              GTA
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={() => { playSound('click'); toggleMute(); }}
              className="p-2 text-gray-500 hover:text-gta-green transition-colors duration-200"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {isAuthenticated ? (
              <>
                <button
                  onClick={() => handleNavigation(user.role === 'admin' ? '/admin' : '/dashboard')}
                  className="gta-button text-xs py-2 px-4"
                >
                  <Home className="w-4 h-4 inline mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="gta-button gta-button-danger text-xs py-2 px-4"
                >
                  <LogOut className="w-4 h-4 inline mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => handleNavigation('/leaderboard')}
                className="gta-button text-xs py-2 px-4"
              >
                <Trophy className="w-4 h-4 inline mr-2" />
                Leaderboard
              </button>
            )}
          </motion.div>
        </div>
      </header>

      {/* === CINEMATIC SECTIONS === */}
      <main className="flex-1 relative">
        {/* 1. Hero — full-screen cinematic opener */}
        <HeroSection />

        {/* 2. Mission Board — classified operation dossiers */}
        <MissionBoard />

        {/* 3. Progression Panel — rank, XP, money */}
        <ProgressionPanel />

        {/* 4. Action Buttons — CTA with glitch + neon */}
        <ActionButtons
          onTeamLogin={() => handleNavigation('/team-login')}
          onAdminLogin={() => handleNavigation('/admin-login')}
        />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center relative z-10">
        <div className="gta-divider max-w-xs mx-auto mb-4" />
        <p className="text-gray-700 text-xs font-condensed tracking-[0.2em] uppercase">
          &copy; 2026 LEVEL UP
        </p>
      </footer>
    </div>
  );
}
