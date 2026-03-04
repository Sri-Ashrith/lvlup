import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingDown } from 'lucide-react';

/**
 * Animated money percentage meter.
 * Displays the percentage of stealable money (100% → -5%/min).
 * Used both in the HeistTimer HUD and as a standalone display.
 */
export default function MoneyPercentageMeter({ startTime, compact = false }) {
  const [moneyPercent, setMoneyPercent] = useState(100);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const elapsedMinutes = elapsed / 60000;
      const pct = Math.max(50, Math.round(100 - Math.floor(elapsedMinutes) * 5));
      setMoneyPercent(pct);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const colorClass = moneyPercent > 80 ? 'text-gta-green' : moneyPercent > 60 ? 'text-gta-gold' : 'text-gta-red';
  const barClass = moneyPercent > 80 ? 'from-gta-green/80 to-gta-green' : moneyPercent > 60 ? 'from-gta-gold/80 to-gta-gold' : 'from-gta-red/80 to-gta-red';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <DollarSign className={`w-4 h-4 ${colorClass}`} />
        <span className={`font-digital text-sm ${colorClass}`}>{moneyPercent}%</span>
        <div className="w-16 h-1.5 bg-gta-dark rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${moneyPercent}%` }}
            transition={{ duration: 0.8 }}
            className={`h-full bg-gradient-to-r ${barClass} rounded-full`}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="gta-card p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DollarSign className={`w-5 h-5 ${colorClass}`} />
          <span className="font-digital text-sm text-gray-400">STEALABLE</span>
        </div>
        {moneyPercent < 100 && <TrendingDown className="w-4 h-4 text-gta-red/60" />}
      </div>

      <div className={`font-digital text-4xl ${colorClass} mb-3 heist-money-counter`}>
        {moneyPercent}%
      </div>

      <div className="h-3 bg-gta-dark rounded-full overflow-hidden border border-gta-green/10">
        <motion.div
          animate={{ width: `${moneyPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${barClass} rounded-full relative`}
        >
          <div className="absolute inset-0 opacity-20 animate-pulse bg-white/10" />
        </motion.div>
      </div>

      <p className="text-[10px] font-mono text-gray-600 mt-2">
        Decreases 5% every minute
      </p>
    </motion.div>
  );
}
