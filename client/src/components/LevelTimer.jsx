import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { useGame } from '../context/GameContext';

/**
 * Inline header timer + full-screen "Time's Up" overlay.
 *
 * Props:
 *   levelNumber  – 1 | 2 | 3
 *   onTimeUp     – optional extra callback fired once when time expires
 */
export default function LevelTimer({ levelNumber, onTimeUp }) {
  const navigate = useNavigate();
  const { eventConfig } = useGame();
  const [timeLeft, setTimeLeft] = useState(null); // seconds remaining (null = loading)
  const [expired, setExpired] = useState(false);

  const timeLimitSec = eventConfig?.levelTimers?.[levelNumber] ?? null;
  const levelStartTime = eventConfig?.levelStartTime ?? null;

  useEffect(() => {
    if (!timeLimitSec || !levelStartTime) return;

    const endTime = levelStartTime + timeLimitSec * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && !expired) {
        setExpired(true);
        if (onTimeUp) onTimeUp();
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [timeLimitSec, levelStartTime, expired, onTimeUp]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Don't render anything until config is loaded
  if (timeLeft === null) return null;

  const isUrgent = timeLeft <= 120; // 2 min
  const isCritical = timeLeft <= 60; // 1 min

  return (
    <>
      {/* Inline timer badge for the header */}
      <div className="flex items-center gap-2 px-3 py-1 rounded bg-gta-dark/80 border border-gta-cyan/30">
        <Clock
          className={`w-4 h-4 ${
            isCritical
              ? 'text-gta-red animate-pulse'
              : isUrgent
              ? 'text-gta-red'
              : 'text-gta-cyan'
          }`}
        />
        <span
          className={`font-digital text-lg tracking-wider ${
            isCritical
              ? 'text-gta-red animate-pulse'
              : isUrgent
              ? 'text-gta-red'
              : 'text-white'
          }`}
        >
          {formatTime(timeLeft)}
        </span>
      </div>

      {/* Full-screen "Time's Up" overlay */}
      <AnimatePresence>
        {expired && (
          <motion.div
            key="timeup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="text-center px-12 py-10 rounded-2xl border border-gta-red/40 bg-gta-dark/95 shadow-2xl max-w-md"
            >
              <AlertTriangle className="w-16 h-16 text-gta-red mx-auto mb-4" />
              <h2
                className="text-4xl font-bold text-gta-red mb-2 uppercase tracking-[4px]"
                style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}
              >
                TIME'S UP
              </h2>
              <p className="text-gray-400 font-condensed tracking-wider uppercase text-sm mb-6">
                Level {levelNumber} has ended
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="gta-button bg-gradient-to-r from-gta-red to-pink-600 hover:from-gta-red/80 hover:to-pink-600/80 px-8 py-3 text-white font-bold uppercase tracking-wider"
              >
                Return to Dashboard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
