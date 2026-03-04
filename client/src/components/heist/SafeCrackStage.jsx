import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Unlock, Key, AlertTriangle, Hash } from 'lucide-react';
import LockPickAnimation from './LockPickAnimation';

/**
 * Stage 2 — Crack the Safe
 * Pseudo code puzzles → generate 4-digit codes → only one is correct
 * Lock picking animation during attempts
 */
export default function SafeCrackStage({
  challenge,
  codes,
  attemptsRemaining,
  onSubmit,
  isSubmitting,
  success
}) {
  const [selectedCode, setSelectedCode] = useState(null);
  const [attempting, setAttempting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleCodeSelect = (code) => {
    if (isSubmitting || success) return;
    setSelectedCode(code);
    setFeedback(null);
  };

  const handleSubmit = () => {
    if (!selectedCode || isSubmitting || success) return;
    setAttempting(true);
    // Brief animation delay
    setTimeout(() => {
      onSubmit(selectedCode);
      setAttempting(false);
      setSelectedCode(null);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-5 gap-6"
    >
      {/* Left side: Puzzle & Codes */}
      <div className="lg:col-span-3">
        <div className="gta-card p-6 heist-alert">
          {/* Stage header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-gta-gold" />
              <span className="font-digital text-gta-gold tracking-wider">CRACK THE SAFE</span>
            </div>
            <span className="text-gta-red font-mono text-sm flex items-center gap-1">
              <Key className="w-3 h-3" />
              {attemptsRemaining} attempts left
            </span>
          </div>

          {/* Pseudo code puzzle */}
          <div className="bg-black/50 rounded p-4 mb-6 border border-gta-green/10">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-gta-green/60" />
              <span className="text-xs font-mono text-gta-green/60 uppercase tracking-wider">Pseudo Code Puzzle</span>
            </div>
            <pre className="font-mono text-sm text-gta-green/90 whitespace-pre-wrap leading-relaxed">
              {challenge?.question}
            </pre>
          </div>

          {/* Code selection */}
          <div className="mb-4">
            <p className="text-gray-400 font-mono text-sm mb-3">
              Select the correct 4-digit code:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(codes || []).map((code, index) => (
                <motion.button
                  key={code}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCodeSelect(code)}
                  disabled={isSubmitting || success || attempting}
                  className={`
                    p-4 rounded border-2 transition-all font-digital text-2xl tracking-[8px] text-center
                    ${selectedCode === code 
                      ? 'border-gta-gold bg-gta-gold/10 text-gta-gold shadow-lg shadow-gta-gold/20' 
                      : 'border-gray-700 bg-gta-dark text-gray-400 hover:border-gta-gold/50 hover:text-gray-200'
                    }
                    ${(isSubmitting || attempting) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {code}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedCode || isSubmitting || success || attempting}
            className="gta-button gta-button-success w-full disabled:opacity-50 text-lg py-4"
          >
            {attempting ? (
              <span className="loading-dots">Cracking</span>
            ) : isSubmitting ? (
              <span className="loading-dots">Verifying</span>
            ) : (
              <>
                <Key className="w-5 h-5 inline mr-2" />
                ENTER CODE
              </>
            )}
          </button>

          {/* Attempts warning */}
          {attemptsRemaining <= 1 && !success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-3 rounded border border-gta-red/30 bg-gta-red/5 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-gta-red flex-shrink-0" />
              <span className="text-gta-red text-sm font-mono">
                Last attempt! Choose carefully.
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Right side: Lock Pick Animation */}
      <div className="lg:col-span-2">
        <div className="gta-card p-4 sticky top-24">
          <LockPickAnimation
            attempting={attempting || isSubmitting}
            success={success}
          />
          
          {/* Code display */}
          <div className="mt-4 text-center">
            <div className="flex justify-center gap-2">
              {(selectedCode || '----').split('').map((char, i) => (
                <motion.div
                  key={i}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: selectedCode ? 360 : 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className={`w-12 h-14 rounded border-2 flex items-center justify-center font-digital text-xl
                    ${selectedCode 
                      ? 'border-gta-gold bg-gta-gold/10 text-gta-gold' 
                      : 'border-gray-700 bg-gta-dark text-gray-600'
                    }`}
                >
                  {char}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
