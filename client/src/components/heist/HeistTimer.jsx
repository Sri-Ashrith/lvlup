import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, TrendingDown } from 'lucide-react';

/**
 * Fixed bottom-center HUD showing:
 * - 10 minute countdown timer
 * - Animated money percentage meter (100% -> -5%/min)
 */
export default function HeistTimer({ startTime, timeLimit, levelEndTime, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [moneyPercent, setMoneyPercent] = useState(100);

  useEffect(() => {
    const heistEndTime = startTime + timeLimit * 1000;
    // Sync with level timer: heist ends at whichever comes first
    const endTime = levelEndTime ? Math.min(heistEndTime, levelEndTime) : heistEndTime;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      const elapsed = now - startTime;
      const elapsedMinutes = elapsed / 60000;
      // Decrease 5% every minute, min 50%
      const pct = Math.max(50, Math.round(100 - Math.floor(elapsedMinutes) * 5));

      setTimeLeft(remaining);
      setMoneyPercent(pct);

      if (remaining <= 0 && onTimeUp) {
        onTimeUp();
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [startTime, timeLimit, levelEndTime, onTimeUp]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const isUrgent = timeLeft <= 60;
  const isCritical = timeLeft <= 30;
  const moneyColor = moneyPercent > 80 ? 'text-gta-green' : moneyPercent > 60 ? 'text-gta-gold' : 'text-gta-red';
  const meterFill = moneyPercent > 80 ? 'from-gta-green/80 to-gta-green' : moneyPercent > 60 ? 'from-gta-gold/80 to-gta-gold' : 'from-gta-red/80 to-gta-red';

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-4"
    >
      <div className="pointer-events-auto heist-hud-panel bg-gta-dark/95 backdrop-blur-xl border border-gta-green/20 rounded-lg px-6 py-3 flex items-center gap-6 shadow-2xl">
        {/* Timer */}
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${isCritical ? 'text-gta-red animate-pulse' : isUrgent ? 'text-gta-red' : 'text-gta-cyan'}`} />
          <div className={`font-digital text-2xl tracking-wider ${isCritical ? 'text-gta-red animate-pulse' : isUrgent ? 'text-gta-red' : 'text-white'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-gta-green/20" />

        {/* Money Percentage Meter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <DollarSign className={`w-5 h-5 ${moneyColor}`} />
            <span className={`font-digital text-xl ${moneyColor} heist-money-counter`}>
              {moneyPercent}%
            </span>
          </div>
          <div className="w-32 h-3 bg-gta-dark rounded-full overflow-hidden border border-gta-green/10">
            <motion.div
              animate={{ width: `${moneyPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full bg-gradient-to-r ${meterFill} rounded-full relative`}
            >
              <div className="absolute inset-0 opacity-30 animate-pulse bg-white/10" />
            </motion.div>
          </div>
          {moneyPercent < 100 && (
            <TrendingDown className="w-4 h-4 text-gta-red/60" />
          )}
        </div>

        {/* Label */}
        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">
          Stealable
        </div>
      </div>
    </motion.div>
  );
}
