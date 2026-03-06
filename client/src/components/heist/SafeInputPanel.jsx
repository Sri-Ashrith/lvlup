import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Key, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * Safe code input panel with 3 editable character slots + 1 locked hint slot.
 *
 * Props:
 *  - hint: the revealed last character (string, single char)
 *  - hintIndex: which position is the hint (always 3 for last slot)
 *  - onSubmit: (fullCode: string) => void
 *  - isSubmitting: boolean
 *  - success: boolean — safe was cracked
 *  - attemptsRemaining: number
 *  - feedback: 'wrong' | 'success' | null — last attempt feedback
 */
export default function SafeInputPanel({
  hint,
  hintIndex = 3,
  onSubmit,
  isSubmitting,
  success,
  attemptsRemaining,
  feedback
}) {
  const [chars, setChars] = useState(['', '', '']);
  const inputRefs = [useRef(null), useRef(null), useRef(null)];

  // Auto-focus first input
  useEffect(() => {
    if (!success && inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, [success]);

  // Clear inputs on wrong feedback
  useEffect(() => {
    if (feedback === 'wrong') {
      const timer = setTimeout(() => {
        setChars(['', '', '']);
        inputRefs[0].current?.focus();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleChange = (index, value) => {
    // Allow only alphanumeric, single char
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1);
    const newChars = [...chars];
    newChars[index] = cleaned;
    setChars(newChars);

    // Auto-advance to next input
    if (cleaned && index < 2) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isSubmitting || success) return;
    const code = chars.join('') + hint;
    if (code.length !== 4) return;
    onSubmit(code);
  };

  const allFilled = chars.every(c => c.length === 1);
  const isShaking = feedback === 'wrong';

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="text-center">
        <span className="text-xs font-digital text-gta-gold/70 tracking-[3px] uppercase">
          Safe Access Panel
        </span>
      </div>

      {/* Code input boxes */}
      <motion.div
        animate={isShaking ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.5 }}
        className="flex justify-center gap-3"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ rotateY: 0 }}
            animate={success ? { rotateY: 360 } : {}}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <input
              ref={inputRefs[i]}
              type="text"
              maxLength={1}
              value={chars[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={isSubmitting || success}
              className={`
                w-14 h-16 text-center font-digital text-2xl rounded-lg border-2 
                bg-gta-dark outline-none transition-all uppercase
                ${success
                  ? 'border-gta-green text-gta-green bg-gta-green/10'
                  : feedback === 'wrong'
                    ? 'border-gta-red text-gta-red bg-gta-red/5'
                    : chars[i]
                      ? 'border-gta-gold text-gta-gold bg-gta-gold/5 shadow-lg shadow-gta-gold/10'
                      : 'border-gray-700 text-gray-400 focus:border-gta-gold/60 focus:shadow-lg focus:shadow-gta-gold/10'
                }
                ${(isSubmitting || success) ? 'opacity-70 cursor-not-allowed' : ''}
              `}
              placeholder="_"
            />
          </motion.div>
        ))}

        {/* Locked hint slot */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className={`
            w-14 h-16 rounded-lg border-2 flex items-center justify-center font-digital text-2xl relative
            ${success 
              ? 'border-gta-green bg-gta-green/10 text-gta-green'
              : 'border-gta-green/50 bg-gta-green/5 text-gta-green'
            }
          `}
        >
          {hint}
          <Lock className="w-3 h-3 text-gta-green/40 absolute top-1 right-1" />
        </motion.div>
      </motion.div>

      {/* Position labels */}
      <div className="flex justify-center gap-3">
        {['1st', '2nd', '3rd', '4th'].map((label, i) => (
          <div key={i} className="w-14 text-center">
            <span className={`text-[9px] font-mono ${i === 3 ? 'text-gta-green/50' : 'text-gray-600'}`}>
              {i === 3 ? 'HINT' : label}
            </span>
          </div>
        ))}
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!allFilled || isSubmitting || success}
        className={`
          w-full py-3.5 rounded-lg font-digital text-sm tracking-wider uppercase transition-all
          flex items-center justify-center gap-2
          ${success
            ? 'bg-gta-green/20 border border-gta-green text-gta-green cursor-default'
            : allFilled
              ? 'bg-gta-gold/10 border border-gta-gold text-gta-gold hover:bg-gta-gold/20 hover:shadow-lg hover:shadow-gta-gold/20 cursor-pointer'
              : 'bg-gta-dark border border-gray-700 text-gray-600 cursor-not-allowed'
          }
          ${isSubmitting ? 'opacity-60 cursor-wait' : ''}
        `}
      >
        {success ? (
          <>
            <CheckCircle className="w-4 h-4" />
            SAFE UNLOCKED
          </>
        ) : isSubmitting ? (
          <span className="loading-dots">Cracking</span>
        ) : (
          <>
            <Key className="w-4 h-4" />
            ENTER CODE
          </>
        )}
      </button>

      {/* Low attempts warning */}
      <AnimatePresence>
        {attemptsRemaining <= 3 && !success && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-2.5 rounded border border-gta-red/30 bg-gta-red/5"
          >
            <AlertTriangle className="w-4 h-4 text-gta-red flex-shrink-0" />
            <span className="text-gta-red text-xs font-mono">
              {attemptsRemaining === 1
                ? 'FINAL ATTEMPT! Choose wisely.'
                : `Only ${attemptsRemaining} attempts remaining!`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
