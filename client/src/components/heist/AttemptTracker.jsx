import { motion } from 'framer-motion';
import { Shield, AlertTriangle } from 'lucide-react';

/**
 * Visual attempt tracker showing 24 → 0 remaining attempts.
 * Displays as a grid of dots/blocks that deplete as attempts are used.
 *
 * Props:
 *  - total: max attempts (24)
 *  - remaining: current remaining attempts
 */
export default function AttemptTracker({ total = 24, remaining }) {
  const used = total - remaining;
  const pct = (remaining / total) * 100;
  const isLow = remaining <= 6;
  const isCritical = remaining <= 3;

  const barColor = isCritical
    ? 'from-gta-red/80 to-gta-red'
    : isLow
      ? 'from-gta-gold/80 to-gta-gold'
      : 'from-gta-cyan/80 to-gta-cyan';

  const textColor = isCritical
    ? 'text-gta-red'
    : isLow
      ? 'text-gta-gold'
      : 'text-gta-cyan';

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield className={`w-3.5 h-3.5 ${textColor}`} />
          <span className="text-[10px] font-digital text-gray-500 tracking-wider uppercase">
            Attempts
          </span>
        </div>
        <motion.span
          key={remaining}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`font-digital text-lg ${textColor}`}
        >
          {remaining}
          <span className="text-gray-600 text-xs">/{total}</span>
        </motion.span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gta-dark rounded-full overflow-hidden border border-gray-800">
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${barColor} rounded-full relative`}
        >
          {isCritical && (
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="absolute inset-0 bg-white/20 rounded-full"
            />
          )}
        </motion.div>
      </div>

      {/* Dot grid (6 × 4 = 24) */}
      <div className="grid grid-cols-8 gap-1 mt-2">
        {Array.from({ length: total }, (_, i) => {
          const isUsed = i < used;
          return (
            <motion.div
              key={i}
              initial={false}
              animate={isUsed ? { scale: [1, 0.5, 0.8], opacity: 0.2 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`
                w-full aspect-square rounded-sm transition-colors
                ${isUsed
                  ? 'bg-gta-red/20 border border-gta-red/10'
                  : isCritical
                    ? 'bg-gta-red/30 border border-gta-red/20'
                    : isLow
                      ? 'bg-gta-gold/20 border border-gta-gold/15'
                      : 'bg-gta-cyan/15 border border-gta-cyan/10'
                }
              `}
            />
          );
        })}
      </div>

      {/* Warning text */}
      {isCritical && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 mt-1"
        >
          <AlertTriangle className="w-3 h-3 text-gta-red" />
          <span className="text-[10px] font-mono text-gta-red">
            Safe will lock permanently!
          </span>
        </motion.div>
      )}
    </div>
  );
}
