import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useSound } from '../context/SoundContext';
import { 
  DollarSign, 
  Zap, 
  Target, 
  Shield, 
  Trophy,
  ChevronRight,
  AlertTriangle,
  X,
  LogOut,
  Volume2,
  VolumeX,
  Bell,
  Skull,
  Lock,
  Unlock
} from 'lucide-react';
import Leaderboard from '../components/Leaderboard';
import PowerUpCard from '../components/PowerUpCard';
import NotificationToast from '../components/NotificationToast';
import HeistAlert from '../components/HeistAlert';

export default function TeamDashboard() {
  const navigate = useNavigate();
  const { team, logout } = useAuth();
  const { leaderboard, heistAlert, notification, clearHeistAlert, clearNotification, eventConfig, announcements } = useGame();
  const { playSound, toggleMute, isMuted } = useSound();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    if (notification) {
      if (notification.type === 'success') playSound('success');
      else if (notification.type === 'danger') playSound('alert');
      
      const timer = setTimeout(() => {
        // Only clear if this is still the current notification
        clearNotification();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, playSound, clearNotification]);

  useEffect(() => {
    if (heistAlert) {
      playSound('heist');
    }
  }, [heistAlert, playSound]);

  const handleLogout = () => {
    playSound('click');
    logout();
    navigate('/');
  };

  const levels = [
    { 
      id: 1, 
      name: 'Entry Arena', 
      subtitle: 'Prove your worth',
      icon: <Target className="w-8 h-8" />,
      color: 'from-green-500 to-emerald-600',
      unlocked: eventConfig.currentLevel >= 1
    },
    { 
      id: 2, 
      name: 'Skill Arenas', 
      subtitle: 'Choose your path',
      icon: <Zap className="w-8 h-8" />,
      color: 'from-blue-500 to-cyan-600',
      unlocked: eventConfig.currentLevel >= 2
    },
    { 
      id: 3, 
      name: 'Tech Heist', 
      subtitle: 'Attack & defend',
      icon: <Skull className="w-8 h-8" />,
      color: 'from-red-500 to-pink-600',
      unlocked: eventConfig.currentLevel >= 3
    },
  ];

  const teamRank = leaderboard.findIndex(t => t.id === team?.id) + 1;

  return (
    <div className="min-h-screen pb-8">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <NotificationToast 
            notification={notification} 
            onClose={clearNotification} 
          />
        )}
      </AnimatePresence>

      {/* Heist Alert Modal */}
      <AnimatePresence>
        {heistAlert && (
          <HeistAlert 
            alert={heistAlert} 
            onClose={clearHeistAlert} 
          />
        )}
      </AnimatePresence>

      {/* Header - GTA V Style Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gta-dark/70 border-b border-gta-green/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 border-2 border-gta-green rounded flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(45,226,166,0.15)' }}>
                <Skull className="w-6 h-6 text-gta-green" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white uppercase tracking-[3px]" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
                  {team?.name || 'Team'}
                </h1>
                <p className="text-gray-500 text-xs font-condensed tracking-wider uppercase">
                  Rank #{teamRank || '-'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => { playSound('click'); toggleMute(); }}
                className="p-2 text-gray-500 hover:text-gta-green transition-colors duration-200"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => { playSound('click'); setShowLeaderboard(true); }}
                className="p-2 text-gray-500 hover:text-gta-yellow transition-colors duration-200"
              >
                <Trophy className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gta-red transition-colors duration-200"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Cash Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gta-card p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 border-2 border-gta-green rounded-lg flex items-center justify-center" style={{ boxShadow: '0 0 20px rgba(45,226,166,0.15)' }}>
                <DollarSign className="w-8 h-8 text-gta-green" />
              </div>
              <div>
                <p className="text-gray-500 text-xs font-condensed uppercase tracking-[3px]">Your Cash</p>
                <p className="text-4xl md:text-5xl font-bold cash-display">
                  ${team?.cash?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-center">
              <div>
                <p className="text-gray-600 text-xs font-condensed tracking-wider uppercase">Level</p>
                <p className="text-2xl font-bold text-gta-green font-gta-heading">
                  {eventConfig.currentLevel}
                </p>
              </div>
              <div className="h-10 w-px bg-gta-green/20" />
              <div>
                <p className="text-gray-600 text-xs font-condensed tracking-wider uppercase">Rank</p>
                <p className="text-2xl font-bold text-gta-yellow font-gta-heading">
                  #{teamRank || '-'}
                </p>
              </div>
              <div className="h-10 w-px bg-gta-green/20" />
              <div>
                <p className="text-gray-600 text-xs font-condensed tracking-wider uppercase">Power-ups</p>
                <p className="text-2xl font-bold text-gta-yellow font-gta-heading">
                  {team?.powerUps?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {announcements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="gta-card p-5 mb-8 border border-gta-green/20"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg text-white flex items-center gap-2 font-condensed uppercase tracking-wider">
                <Bell className="w-5 h-5 text-gta-green" />
                Announcements
              </h2>
              <span className="text-xs font-mono text-gta-green/80">Latest</span>
            </div>
            <p className="text-gta-green font-mono text-sm">
              {announcements[0].message}
            </p>
          </motion.div>
        )}

        {/* Power-ups Section */}
        {team?.powerUps?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
          <h2 className="text-xl font-bold text-white uppercase tracking-[3px] mb-4 flex items-center gap-2" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
            <Zap className="w-5 h-5 text-gta-yellow" />
              Your Power-ups
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.powerUps.map((powerUp, index) => (
                <PowerUpCard key={index} powerUp={powerUp} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Levels Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-white uppercase tracking-[3px] mb-4 flex items-center gap-2" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
            <Target className="w-5 h-5 text-gta-green" />
            Mission Select
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {levels.map((level, index) => (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={level.unlocked ? { scale: 1.02, x: 5 } : {}}
                onClick={() => {
                  if (level.unlocked) {
                    playSound('click');
                    navigate(`/level/${level.id}`);
                  } else {
                    playSound('error');
                  }
                }}
                className={`gta-card p-6 cursor-pointer transition-all duration-300 relative ${
                  level.unlocked 
                    ? 'hover:border-gta-green/50' 
                    : 'opacity-50 cursor-not-allowed'
                } ${level.id === eventConfig.currentLevel ? 'ring-1 ring-gta-green/50 border-gta-green/30' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${level.color} rounded-xl flex items-center justify-center`}>
                      {level.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white font-gta-heading">
                          Level {level.id}: {level.name}
                        </h3>
                        {level.id === eventConfig.currentLevel && (
                          <span className="level-badge text-[10px]">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm font-mono">{level.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-gta-green">
                    {level.unlocked ? (
                      <ChevronRight className="w-6 h-6 text-gta-green" />
                    ) : (
                      <Lock className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Heist Status */}
        {team?.heistStatus !== 'none' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mt-8 gta-card p-6 ${
              team.heistStatus === 'attacking' 
                ? 'border-gta-red heist-alert' 
                      : 'border-gta-yellow'
            }`}
          >
            <div className="flex items-center gap-4">
              <AlertTriangle className={`w-8 h-8 ${
                team.heistStatus === 'attacking' ? 'text-gta-red' : 'text-gta-yellow'
              }`} />
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-[2px]" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
                  {team.heistStatus === 'attacking' ? 'HEIST IN PROGRESS' : 'UNDER ATTACK'}
                </h3>
                <p className="text-gray-400 font-mono text-sm">
                  {team.heistStatus === 'attacking' 
                    ? 'Complete the heist to steal cash!' 
                    : 'Someone is attempting to steal from you!'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setShowLeaderboard(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="gta-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white uppercase tracking-[3px] flex items-center gap-2" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
                    <Trophy className="w-6 h-6 text-gta-yellow" />
                    Leaderboard
                  </h2>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <Leaderboard data={leaderboard} currentTeamId={team?.id} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
