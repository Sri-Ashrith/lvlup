import { motion } from 'framer-motion';
import { Hash, CheckCircle, HelpCircle } from 'lucide-react';

/**
 * Displays a single pseudo-code puzzle card as an IMAGE.
 * Players must mentally trace the code to determine the output character.
 *
 * Props:
 *  - index: 0-based puzzle number
 *  - image: image URL path (e.g. /safe/puzzle_1.png)
 *  - resolved: the character answer (shown when this puzzle is a freebie/hint)
 *  - isHint: true if this is the auto-revealed hint slot
 */
export default function PseudoCodePuzzle({ index, image, resolved, isHint }) {
  const puzzleNumber = index + 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.12 }}
      className={`
        rounded-lg border p-4 relative overflow-hidden transition-all
        ${isHint
          ? 'border-gta-green/40 bg-gta-green/5'
          : 'border-gta-gold/20 bg-black/40 hover:border-gta-gold/40'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`
            w-7 h-7 rounded-md flex items-center justify-center text-xs font-digital
            ${isHint
              ? 'bg-gta-green/20 text-gta-green border border-gta-green/30'
              : 'bg-gta-gold/10 text-gta-gold border border-gta-gold/20'
            }
          `}>
            {puzzleNumber}
          </div>
          <span className={`text-xs font-mono uppercase tracking-wider ${isHint ? 'text-gta-green/70' : 'text-gta-gold/60'}`}>
            Code {puzzleNumber}
          </span>
        </div>

        {/* Status badge */}
        {isHint ? (
          <div className="flex items-center gap-1 bg-gta-green/10 border border-gta-green/30 rounded px-2 py-0.5">
            <CheckCircle className="w-3 h-3 text-gta-green" />
            <span className="text-[10px] font-digital text-gta-green tracking-wider">HINT — FREE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-gta-gold/5 border border-gta-gold/15 rounded px-2 py-0.5">
            <HelpCircle className="w-3 h-3 text-gta-gold/50" />
            <span className="text-[10px] font-digital text-gta-gold/50 tracking-wider">SOLVE IT</span>
          </div>
        )}
      </div>

      {/* Pseudo-code image display */}
      <div className="bg-black/60 rounded p-3 border border-gray-800/50 mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Hash className="w-3 h-3 text-gta-green/40" />
          <span className="text-[9px] font-mono text-gta-green/40 uppercase tracking-[2px]">Pseudo Code</span>
        </div>
        <img
          src={image}
          alt={`Puzzle ${puzzleNumber}`}
          className="w-full rounded border border-gray-700/30"
          draggable={false}
        />
      </div>

      {/* Output display */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-gray-500">Output →</span>
        <motion.div
          initial={isHint ? { scale: 0 } : {}}
          animate={isHint ? { scale: 1 } : {}}
          transition={{ delay: 0.5, type: 'spring' }}
          className={`
            w-10 h-10 rounded-md flex items-center justify-center font-digital text-xl
            border-2 transition-all
            ${isHint
              ? 'border-gta-green bg-gta-green/10 text-gta-green shadow-lg shadow-gta-green/20'
              : resolved
                ? 'border-gta-gold bg-gta-gold/10 text-gta-gold'
                : 'border-gray-700 bg-gta-dark text-gray-600'
            }
          `}
        >
          {isHint || resolved ? (resolved || '?') : '?'}
        </motion.div>
      </div>

      {/* Hint glow effect */}
      {isHint && (
        <motion.div
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-gradient-to-br from-gta-green/10 to-transparent pointer-events-none rounded-lg"
        />
      )}
    </motion.div>
  );
}
