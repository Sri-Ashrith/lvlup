import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Unlock, Key, AlertTriangle, Hash, Sparkles, DollarSign, ChevronRight, ArrowLeft, Lock } from 'lucide-react';
import PseudoCodePuzzle from './PseudoCodePuzzle';
import SafeInputPanel from './SafeInputPanel';
import AttemptTracker from './AttemptTracker';
import LockPickAnimation from './LockPickAnimation';

/**
 * Stage 2 — Crack the Safe (Redesigned)
 *
 * Flow:
 *  1. Puzzles are revealed ONE BY ONE
 *  2. Player studies each puzzle, then advances to the next
 *  3. After all 4 puzzles have been viewed, the safe input panel appears
 *  4. The LAST character is revealed automatically as a hint
 *  5. Players must figure out the first 3 characters by tracing the code
 *  6. 6 attempts to enter the correct 3-character combination
 *
 * Props:
 *  - puzzles: array of 4 { id, code } objects
 *  - hint: the revealed last character
 *  - hintIndex: position of the hint (always 3)
 *  - attemptsRemaining: number (starts at 24)
 *  - maxAttempts: total attempts allowed (24)
 *  - onSubmit: (fullCode: string) => void
 *  - isSubmitting: boolean
 *  - success: boolean
 */
export default function SafeCrackStage({
  puzzles = [],
  hint = '?',
  hintIndex = 3,
  attemptsRemaining = 6,
  maxAttempts = 6,
  onSubmit,
  isSubmitting,
  success
}) {
  const [currentPuzzle, setCurrentPuzzle] = useState(0);   // which puzzle is being shown
  const [revealedCount, setRevealedCount] = useState(0);    // how many puzzles have been "studied"
  const [allRevealed, setAllRevealed] = useState(false);    // all 4 seen → show safe input
  const [feedback, setFeedback] = useState(null);
  const [prevAttempts, setPrevAttempts] = useState(attemptsRemaining);

  // Detect wrong attempt by watching attemptsRemaining decrease
  useEffect(() => {
    if (attemptsRemaining < prevAttempts && !success) {
      setFeedback('wrong');
      const timer = setTimeout(() => setFeedback(null), 1200);
      return () => clearTimeout(timer);
    }
    setPrevAttempts(attemptsRemaining);
  }, [attemptsRemaining, success]);

  // Success feedback
  useEffect(() => {
    if (success) setFeedback('success');
  }, [success]);

  const handleSubmit = (fullCode) => {
    if (isSubmitting || success) return;
    onSubmit(fullCode);
  };

  const advancePuzzle = () => {
    const nextRevealed = Math.max(revealedCount, currentPuzzle + 1);
    setRevealedCount(nextRevealed);
    if (currentPuzzle < puzzles.length - 1) {
      setCurrentPuzzle(currentPuzzle + 1);
    } else {
      // All puzzles viewed
      setAllRevealed(true);
    }
  };

  const goToPuzzle = (idx) => {
    if (idx <= revealedCount) setCurrentPuzzle(idx);
  };

  const puzzle = puzzles[currentPuzzle];
  const isLastPuzzle = currentPuzzle === puzzles.length - 1;
  const canGoBack = allRevealed || currentPuzzle > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Phase 1: Reveal puzzles one-by-one */}
      {!allRevealed && (
        <div className="max-w-2xl mx-auto">
          <div className="gta-card p-6 heist-alert">
            {/* Stage header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Unlock className="w-5 h-5 text-gta-gold" />
                <span className="font-digital text-gta-gold tracking-wider">CRACK THE SAFE</span>
              </div>
              <span className="text-gray-400 font-mono text-xs">
                Puzzle {currentPuzzle + 1} / {puzzles.length}
              </span>
            </div>

            {/* Instructions */}
            <div className="bg-black/40 rounded-lg p-3 mb-5 border border-gta-gold/10">
              <p className="text-gray-400 font-mono text-xs leading-relaxed">
                <Sparkles className="w-3 h-3 text-gta-gold inline mr-1" />
                Study this pseudo-code carefully. Trace it to find the <span className="text-gta-gold">output character</span>.
                Each puzzle gives you one character of the safe code.
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {puzzles.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToPuzzle(idx)}
                  disabled={idx > revealedCount}
                  className={`
                    w-9 h-9 rounded-md flex items-center justify-center font-digital text-sm transition-all border
                    ${idx === currentPuzzle
                      ? 'border-gta-gold bg-gta-gold/20 text-gta-gold scale-110 shadow-lg shadow-gta-gold/20'
                      : idx < revealedCount
                        ? 'border-gta-green/30 bg-gta-green/5 text-gta-green/60 cursor-pointer hover:border-gta-green/50'
                        : idx === revealedCount
                          ? 'border-gray-600 bg-gray-800 text-gray-400'
                          : 'border-gray-700/50 bg-gray-900 text-gray-700 cursor-not-allowed'
                    }
                  `}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {/* Single puzzle display */}
            <AnimatePresence mode="wait">
              {puzzle && (
                <motion.div
                  key={puzzle.id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                >
                  <PseudoCodePuzzle
                    index={currentPuzzle}
                    image={puzzle.image}
                    resolved={null}
                    isHint={false}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setCurrentPuzzle(prev => Math.max(0, prev - 1))}
                disabled={currentPuzzle === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded font-condensed uppercase text-sm tracking-wider transition-all
                  ${currentPuzzle === 0
                    ? 'text-gray-700 cursor-not-allowed'
                    : 'text-gray-400 hover:text-gta-green border border-gray-700 hover:border-gta-green/30'
                  }
                `}
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>

              <button
                onClick={advancePuzzle}
                className="gta-button px-6 py-3 flex items-center gap-2"
              >
                {isLastPuzzle ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Enter Safe Code
                  </>
                ) : (
                  <>
                    Next Puzzle
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: All puzzles revealed — show safe input + puzzle review */}
      {allRevealed && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── LEFT SIDE: Puzzle Review ── */}
          <div className="lg:col-span-3">
            <div className="gta-card p-5 heist-alert">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Unlock className="w-5 h-5 text-gta-gold" />
                  <span className="font-digital text-gta-gold tracking-wider">PUZZLE REVIEW</span>
                </div>
                <span className="text-gray-400 font-mono text-xs flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  4 puzzles → 4-char code
                </span>
              </div>

              {/* Puzzle tabs */}
              <div className="flex gap-2 mb-4">
                {puzzles.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPuzzle(idx)}
                    className={`
                      flex-1 py-2 rounded font-digital text-sm transition-all border
                      ${idx === currentPuzzle
                        ? idx === hintIndex
                          ? 'border-gta-green bg-gta-green/15 text-gta-green'
                          : 'border-gta-gold bg-gta-gold/15 text-gta-gold'
                        : 'border-gray-700 bg-black/30 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                      }
                    `}
                  >
                    Puzzle {idx + 1}
                  </button>
                ))}
              </div>

              {/* Active puzzle display */}
              <AnimatePresence mode="wait">
                {puzzle && (
                  <motion.div
                    key={puzzle.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PseudoCodePuzzle
                      index={currentPuzzle}
                      image={puzzle.image}
                      resolved={currentPuzzle === hintIndex ? hint : null}
                      isHint={currentPuzzle === hintIndex}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Safe code summary */}
              <div className="mt-5 p-3 rounded-lg bg-black/50 border border-gta-gold/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-digital text-gray-500 tracking-wider uppercase">
                    Safe Code
                  </span>
                  <div className="flex items-center gap-1.5">
                    {puzzles.map((_, index) => (
                      <div
                        key={index}
                        className={`
                          w-8 h-9 rounded border flex items-center justify-center font-digital text-lg
                          ${index === hintIndex
                            ? 'border-gta-green/50 bg-gta-green/10 text-gta-green'
                            : 'border-gray-700 bg-gta-dark text-gray-600'
                          }
                        `}
                      >
                        {index === hintIndex ? hint : '?'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDE: Safe Lock Interface ── */}
          <div className="lg:col-span-2">
            <div className="gta-card p-4 sticky top-24 space-y-5">
              {/* Lock Animation */}
              <LockPickAnimation
                attempting={isSubmitting}
                success={success}
              />

              {/* Safe Input Panel */}
              <SafeInputPanel
                hint={hint}
                hintIndex={hintIndex}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                success={success}
                attemptsRemaining={attemptsRemaining}
                feedback={feedback}
              />

              {/* Attempt Tracker */}
              <AttemptTracker
                total={maxAttempts}
                remaining={attemptsRemaining}
              />

              {/* Wrong attempt flash */}
              <AnimatePresence>
                {feedback === 'wrong' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 rounded border border-gta-red/30 bg-gta-red/5 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-gta-red flex-shrink-0" />
                    <span className="text-gta-red text-xs font-mono">
                      Wrong code! Defender power-up may activate.
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success flash */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded border border-gta-green/40 bg-gta-green/10 text-center"
                  >
                    <DollarSign className="w-8 h-8 text-gta-green mx-auto mb-1" />
                    <span className="font-digital text-gta-green text-sm tracking-wider">
                      SAFE CRACKED — EXTRACTING CASH
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
