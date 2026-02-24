import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useSound } from '../context/SoundContext';
import { ArrowLeft, Trophy, RefreshCw, Crown, DollarSign, Wifi, WifiOff } from 'lucide-react';
import LeaderboardComponent from '../components/Leaderboard';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { leaderboard, fetchLeaderboard } = useGame();
  const { playSound } = useSound();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    playSound('click');
    await fetchLeaderboard();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gta-dark/70 border-b border-gta-green/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { playSound('click'); navigate('/'); }}
              className="flex items-center gap-2 text-gray-500 hover:text-gta-green transition-colors font-condensed tracking-wider uppercase text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            
            <motion.button
              onClick={handleRefresh}
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{ duration: 0.5 }}
              className="p-2 text-gray-500 hover:text-gta-green transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Trophy className="w-16 h-16 text-gta-yellow mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-[4px]" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
            LEADERBOARD
          </h1>
          <p className="text-gray-500 font-condensed tracking-wider uppercase text-sm">
            Real-time standings • Updated every 5 seconds
          </p>
        </motion.div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            {/* 2nd Place */}
            <div className="mt-8">
              <div className="gta-card p-4 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <p className="font-gta-heading text-white text-lg truncate">{leaderboard[1]?.name}</p>
                <p className="cash-display text-xl">${leaderboard[1]?.cash?.toLocaleString()}</p>
                <div className="mt-2 text-4xl font-gta-heading text-gray-400">2</div>
              </div>
            </div>
            
            {/* 1st Place */}
            <div>
              <div className="gta-card p-4 text-center border-gta-yellow/30" style={{ background: 'linear-gradient(180deg, rgba(245,213,71,0.08), transparent)' }}>
                <div className="w-20 h-20 border-2 border-gta-yellow rounded-full flex items-center justify-center mx-auto mb-3" style={{ boxShadow: '0 0 25px rgba(245,213,71,0.2)' }}>
                  <Crown className="w-10 h-10 text-gta-yellow" />
                </div>
                <p className="font-condensed text-gta-yellow text-xl truncate uppercase tracking-wider">{leaderboard[0]?.name}</p>
                <p className="cash-display text-2xl">${leaderboard[0]?.cash?.toLocaleString()}</p>
                <div className="mt-2 text-5xl text-gta-yellow" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>1</div>
              </div>
            </div>
            
            {/* 3rd Place */}
            <div className="mt-8">
              <div className="gta-card p-4 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <p className="font-gta-heading text-white text-lg truncate">{leaderboard[2]?.name}</p>
                <p className="cash-display text-xl">${leaderboard[2]?.cash?.toLocaleString()}</p>
                <div className="mt-2 text-4xl font-gta-heading text-amber-700">3</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Full Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="gta-card p-6"
        >
          <h2 className="text-xl text-white mb-4 font-condensed uppercase tracking-[3px]">All Teams</h2>
          <LeaderboardComponent data={leaderboard} />
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8"
        >
          <div className="gta-card p-4 text-center">
            <p className="text-gray-400 text-xs font-mono mb-1">Total Teams</p>
            <p className="text-2xl font-gta-heading text-white">{leaderboard.length}</p>
          </div>
          <div className="gta-card p-4 text-center">
            <p className="text-gray-400 text-xs font-mono mb-1">Online</p>
            <p className="text-2xl font-gta-heading text-green-500">
              {leaderboard.filter(t => t.isOnline).length}
            </p>
          </div>
          <div className="gta-card p-4 text-center">
            <p className="text-gray-400 text-xs font-mono mb-1">Total Cash</p>
            <p className="text-2xl font-gta-heading text-gta-yellow">
              ${leaderboard.reduce((sum, t) => sum + t.cash, 0).toLocaleString()}
            </p>
          </div>
          <div className="gta-card p-4 text-center">
            <p className="text-gray-400 text-xs font-mono mb-1">Average</p>
            <p className="text-2xl font-gta-heading text-gta-green">
              ${Math.round(leaderboard.reduce((sum, t) => sum + t.cash, 0) / (leaderboard.length || 1)).toLocaleString()}
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
