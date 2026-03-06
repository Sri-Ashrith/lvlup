import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertTriangle, Hash, CheckCircle, XCircle } from 'lucide-react';
import FingerprintHackAnimation from './FingerprintHackAnimation';

/**
 * Parse a compound question string into structured sections:
 *  - intro: narrative text before the code block
 *  - code: pseudo-code lines (detected by ← / keywords)
 *  - prompt: question text after the code
 *  - options: A/B/C/D choices
 */
function parseQuestion(raw) {
  if (!raw) return { intro: '', code: '', prompt: '', options: [] };

  const lines = raw.split('\n');
  const codeKeywords = /[←→]|^\s*(for |if |else|while |print|continue|return |def |do$)/i;
  const optionRegex = /^\s*[A-D][\.\)]/;

  let intro = [];
  let code = [];
  let prompt = [];
  let options = [];
  let section = 'intro'; // intro → code → prompt → options

  for (const line of lines) {
    const trimmed = line.trim();

    if (section === 'intro') {
      if (codeKeywords.test(trimmed)) {
        section = 'code';
        code.push(line);
      } else {
        intro.push(trimmed);
      }
    } else if (section === 'code') {
      if (optionRegex.test(trimmed)) {
        section = 'options';
        options.push(trimmed);
      } else if (trimmed === '' && code.length > 0) {
        // Could be end of code block or blank line in code
        // Peek ahead: if remaining lines contain code keywords → still code
        section = 'prompt';
        prompt.push(trimmed);
      } else {
        code.push(line);
      }
    } else if (section === 'prompt') {
      if (optionRegex.test(trimmed)) {
        section = 'options';
        options.push(trimmed);
      } else if (codeKeywords.test(trimmed)) {
        // Went back to code (multi-block)
        // Move accumulated prompt blanks into code
        code.push(...prompt);
        prompt = [];
        code.push(line);
        section = 'code';
      } else {
        prompt.push(trimmed);
      }
    } else {
      if (trimmed) options.push(trimmed);
    }
  }

  return {
    intro: intro.filter(Boolean).join(' '),
    code: code.join('\n'),
    prompt: prompt.filter(Boolean).join(' '),
    options
  };
}

/**
 * Stage 1 — Enter the Compound
 * Left: Questions rendered as code-block cards + inputs
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
  const parsed = useMemo(() => parseQuestion(currentChallenge?.question), [currentChallenge?.question]);

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
      className="max-w-2xl mx-auto"
    >
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

          {/* Question — rendered as structured card */}
          <motion.div
            key={currentChallenge.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 mb-6"
          >
            {/* Intro text */}
            {parsed.intro && (
              <p className="text-gray-300 font-mono text-sm leading-relaxed">
                {parsed.intro}
              </p>
            )}

            {/* Pseudo-code block */}
            {parsed.code && (
              <div className="bg-black/60 rounded-lg p-4 border border-gta-green/15 overflow-x-auto">
                <div className="flex items-center gap-1.5 mb-2">
                  <Hash className="w-3 h-3 text-gta-green/40" />
                  <span className="text-[9px] font-mono text-gta-green/40 uppercase tracking-[2px]">Pseudo Code</span>
                </div>
                <pre className="font-mono text-sm text-gta-green/90 whitespace-pre-wrap leading-relaxed select-text">
{parsed.code}
                </pre>
              </div>
            )}

            {/* Question prompt */}
            {parsed.prompt && (
              <p className="text-white font-digital text-base leading-relaxed">
                {parsed.prompt}
              </p>
            )}

            {/* Options as visual buttons */}
            {parsed.options.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {parsed.options.map((opt, i) => {
                  const letter = opt.charAt(0);
                  const text = opt.replace(/^[A-D][\.\)]\s*/, '');
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setAnswer(letter);
                      }}
                      disabled={isSubmitting}
                      className={`
                        p-3 rounded-lg border text-left transition-all flex items-center gap-3
                        ${answer.toUpperCase() === letter
                          ? 'border-gta-cyan bg-gta-cyan/10 text-gta-cyan shadow-lg shadow-gta-cyan/10'
                          : 'border-gray-700 bg-gta-dark/50 text-gray-300 hover:border-gta-cyan/40 hover:text-white'
                        }
                        ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <span className={`
                        w-8 h-8 rounded-md flex items-center justify-center font-digital text-sm shrink-0 border
                        ${answer.toUpperCase() === letter
                          ? 'bg-gta-cyan/20 border-gta-cyan/50 text-gta-cyan'
                          : 'bg-gta-dark border-gray-600 text-gray-400'
                        }
                      `}>
                        {letter}
                      </span>
                      <span className="font-mono text-sm">{text}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Answer form (visible when no MCQ options, or as submit for MCQ) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {parsed.options.length === 0 && (
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="gta-input"
                disabled={isSubmitting}
                autoFocus
              />
            )}
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

        {/* Fingerprint Animation (inline) */}
        <div className="mt-6 p-4 rounded-lg border border-gta-cyan/10 bg-black/30">
          <FingerprintHackAnimation
            progress={progress}
            total={total}
          />
        </div>
      </div>
    </motion.div>
  );
}
