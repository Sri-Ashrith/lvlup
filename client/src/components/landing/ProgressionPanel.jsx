import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, TrendingUp, DollarSign, Shield } from 'lucide-react';

/**
 * ProgressionPanel — criminal ranking system with animated counters
 * Ranks: Rookie → Street Operator → Crew Leader → Syndicate Boss → Criminal Mastermind
 */

const RANKS = [
  { name: 'Rookie', minXP: 0, icon: '🔰' },
  { name: 'Street Operator', minXP: 1000, icon: '🔫' },
  { name: 'Crew Leader', minXP: 5000, icon: '👑' },
  { name: 'Syndicate Boss', minXP: 15000, icon: '💀' },
  { name: 'Criminal Mastermind', minXP: 50000, icon: '🏆' },
];

// Animated counter hook
function useCountUp(target, duration = 2000, shouldStart = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!shouldStart) return;
    let start = 0;
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, shouldStart]);
  return count;
}

// Sample player data
const PLAYER_DATA = {
  rank: 2,            // Crew Leader
  xp: 7350,
  nextRankXP: 15000,
  money: 2450000,
  reputation: 72,
};

export default function ProgressionPanel() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const currentRank = RANKS[PLAYER_DATA.rank];
  const nextRank = RANKS[PLAYER_DATA.rank + 1];
  const xpProgress = ((PLAYER_DATA.xp - RANKS[PLAYER_DATA.rank].minXP) / (PLAYER_DATA.nextRankXP - RANKS[PLAYER_DATA.rank].minXP)) * 100;

  const moneyCount = useCountUp(PLAYER_DATA.money, 2500, isInView);
  const repCount = useCountUp(PLAYER_DATA.reputation, 2000, isInView);
  const xpCount = useCountUp(PLAYER_DATA.xp, 2000, isInView);

  return (
    <section ref={ref} className="relative py-24 md:py-32 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-[11px] font-condensed tracking-[5px] uppercase text-gta-green/60 block mb-3">
            // Criminal Profile
          </span>
          <h2 className="font-gta text-3xl md:text-4xl lg:text-5xl text-white tracking-wider mb-4">
            YOUR STATUS
          </h2>
          <div className="w-24 h-[2px] mx-auto bg-gradient-to-r from-transparent via-gta-green/50 to-transparent" />
        </motion.div>

        {/* Rank progression bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gta-surface border border-gta-surface-2 rounded-sm p-6 md:p-8 mb-8"
        >
          {/* Current rank display */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm bg-gta-green/10 border border-gta-green/20 flex items-center justify-center text-xl">
                {currentRank.icon}
              </div>
              <div>
                <span className="text-[10px] font-condensed tracking-[2px] uppercase text-gray-500 block">
                  Current Rank
                </span>
                <span className="font-condensed text-xl text-white uppercase tracking-wider">
                  {currentRank.name}
                </span>
              </div>
            </div>
            {nextRank && (
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-condensed tracking-[2px] uppercase text-gray-500 block">
                  Next Rank
                </span>
                <span className="font-condensed text-base text-gta-green/60 uppercase tracking-wider">
                  {nextRank.icon} {nextRank.name}
                </span>
              </div>
            )}
          </div>

          {/* XP Progress bar */}
          <div className="relative">
            <div className="flex justify-between mb-2 text-xs font-mono text-gray-500">
              <span>{xpCount.toLocaleString()} XP</span>
              <span>{PLAYER_DATA.nextRankXP.toLocaleString()} XP</span>
            </div>
            <div className="h-3 bg-gta-darker rounded-full overflow-hidden border border-gta-surface-2">
              <motion.div
                initial={{ width: 0 }}
                animate={isInView ? { width: `${xpProgress}%` } : {}}
                transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                className="h-full rounded-full relative"
                style={{
                  background: 'linear-gradient(90deg, #007A4A, #00FF9C)',
                  boxShadow: '0 0 12px rgba(0,255,156,0.4), 0 0 24px rgba(0,255,156,0.15)',
                }}
              >
                {/* Glowing tip */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(0,255,156,0.8)]" />
              </motion.div>
            </div>
          </div>

          {/* Rank milestones */}
          <div className="flex justify-between mt-4">
            {RANKS.map((rank, idx) => (
              <div
                key={rank.name}
                className={`text-center flex-1 ${idx <= PLAYER_DATA.rank ? 'opacity-100' : 'opacity-30'}`}
              >
                <div className={`text-lg mb-1 ${idx === PLAYER_DATA.rank ? 'scale-110' : ''} transition-transform`}>
                  {rank.icon}
                </div>
                <span className="text-[8px] md:text-[9px] font-condensed tracking-wider uppercase text-gray-400 hidden sm:block">
                  {rank.name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {/* Money */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gta-surface border border-gta-surface-2 rounded-sm p-5 text-center"
          >
            <DollarSign className="w-5 h-5 text-gta-green/60 mx-auto mb-2" />
            <span className="text-[10px] font-condensed tracking-[3px] uppercase text-gray-500 block mb-1">
              Cash Earned
            </span>
            <span className="font-digital text-2xl md:text-3xl text-gta-green tracking-wider">
              ${moneyCount.toLocaleString()}
            </span>
          </motion.div>

          {/* Reputation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gta-surface border border-gta-surface-2 rounded-sm p-5 text-center"
          >
            <TrendingUp className="w-5 h-5 text-gta-green/60 mx-auto mb-2" />
            <span className="text-[10px] font-condensed tracking-[3px] uppercase text-gray-500 block mb-1">
              Reputation
            </span>
            <span className="font-digital text-2xl md:text-3xl text-white tracking-wider">
              {repCount}%
            </span>
          </motion.div>

          {/* Rank Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-gta-surface border border-gta-surface-2 rounded-sm p-5 text-center relative overflow-hidden"
          >
            <Shield className="w-5 h-5 text-gta-green/60 mx-auto mb-2" />
            <span className="text-[10px] font-condensed tracking-[3px] uppercase text-gray-500 block mb-1">
              Rank Badge
            </span>
            <span className="font-condensed text-xl text-gta-gold uppercase tracking-wider">
              {currentRank.name}
            </span>
            {/* Glow effect behind badge */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: 'radial-gradient(circle at center, rgba(0,255,156,0.15), transparent 70%)',
              }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
