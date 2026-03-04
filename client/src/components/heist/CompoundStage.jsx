import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import FingerprintHackAnimation from './FingerprintHackAnimation';

/**
 * Stage 1 — Enter the Compound
 * Left: Questions + inputs
 * Right: Fingerprint cloning animation driven by correct answers
 * 3 wrong answers = heist failure
 */
export default function CompoundStage({
  challenges,
  currentIndex,
  progress,
  wrongCount,
  onSubmit,
  isSubmitting
}) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);

  const total = challenges.length;
  const currentChallenge = challenges[currentIndex];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim() || isSubmitting) return;
    onSubmit(currentChallenge.id, answer);
    setAnswer('');
  };

  // Show feedback on wrong answer
  useEffect(() => {
    if (wrongCount > 0) {
      setFeedback({ type: 'wrong', count: wrongCount });
      const timer = setTimeout(() => setFeedback(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [wrongCount]);

  if (!currentChallenge) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:items-center"
    >
      {/* Left side: Questions */}
      <div className="lg:col-span-3">
        <div className="gta-card p-6">
          {/* Stage header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gta-cyan" />
              <span className="font-digital text-gta-cyan tracking-wider">COMPOUND BREACH</span>
            </div>
            <span className="text-gray-400 font-mono text-sm">
              {currentIndex + 1} / {total}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gta-dark rounded-full overflow-hidden mb-2 border border-gta-green/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(progress / total) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-gta-cyan to-gta-green"
            />
          </div>

          {/* Wrong answer tracker */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-mono text-gray-500">Attempts remaining:</span>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`w-6 h-2 rounded-full transition-all duration-300 ${
                    i < (3 - wrongCount) ? 'bg-gta-green' : 'bg-gta-red/60'
                  }`}
                />
              ))}
            </div>
            {wrongCount > 0 && (
              <span className="text-gta-red text-xs font-digital">
                {3 - wrongCount} left
              </span>
            )}
          </div>

          {/* Question */}
          <motion.div
            key={currentChallenge.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h3 className="text-lg font-digital text-white mb-6 leading-relaxed">
              {currentChallenge.question}
            </h3>
          </motion.div>

          {/* Answer form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="gta-input"
              disabled={isSubmitting}
              autoFocus
            />
            <button
              type="submit"
              disabled={isSubmitting || !answer.trim()}
              className="gta-button w-full disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="loading-dots">Verifying</span>
              ) : (
                'SUBMIT ANSWER'
              )}
            </button>
          </form>

          {/* Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-3 rounded border border-gta-red/30 bg-gta-red/5 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-gta-red flex-shrink-0" />
                <span className="text-gta-red text-sm font-mono">
                  Wrong answer! ({feedback.count}/3 strikes)
                  {feedback.count >= 2 && ' — One more and the heist fails!'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right side: Fingerprint Animation */}
      <div className="lg:col-span-2">
        <div className="gta-card p-5 w-full">
          <FingerprintHackAnimation
            progress={progress}
            total={total}
          />
        </div>
      </div>
    </motion.div>
  );
}
