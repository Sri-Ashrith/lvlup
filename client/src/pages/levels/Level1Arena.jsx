import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useSound } from '../../context/SoundContext';
import { 
  ArrowLeft, 
  Brain, 
  Bot, 
  Image, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Lightbulb,
  Send,
  Trophy,
  Zap,
  SkipForward,
  ChevronRight,
  Eye
} from 'lucide-react';

const SUB_LEVELS = [
  { id: 'logo', name: 'Guess the Logo', icon: <Image className="w-6 h-6" />, color: 'from-orange-500 to-yellow-500', description: 'Identify tech & brand logos' },
  { id: 'aihuman', name: 'AI vs Human', icon: <Bot className="w-6 h-6" />, color: 'from-cyan-500 to-blue-500', description: 'Detect AI-generated content' },
  { id: 'reasoning', name: 'Logical Reasoning', icon: <Brain className="w-6 h-6" />, color: 'from-purple-500 to-pink-500', description: 'Solve logic puzzles' },
];

export default function Level1Arena() {
  const navigate = useNavigate();
  const { team, updateTeam } = useAuth();
  const { getChallenges, submitAnswer } = useGame();
  const { playSound } = useSound();
  
  const [activeSubLevel, setActiveSubLevel] = useState(null); // null = show selector
  const [challenges, setChallenges] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); // for logo auto-flow
  const [currentChallenge, setCurrentChallenge] = useState(null); // for text-input zones
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalLogos, setTotalLogos] = useState(0);
  const [aiHumanIndex, setAiHumanIndex] = useState(0);
  const [reasoningIndex, setReasoningIndex] = useState(0);

  // Load challenges when sub-level changes
  useEffect(() => {
    if (activeSubLevel) {
      loadChallenges(activeSubLevel);
    }
  }, [activeSubLevel]);

  const loadChallenges = async (zone) => {
    setLoading(true);
    try {
      const data = await getChallenges(1, zone);
      const ch = data.challenges || [];
      const co = data.completed || [];
      setChallenges(ch);
      setCompleted(co);
      setTotalLogos(ch.length + co.length);
      setCurrentIndex(0);
      setAiHumanIndex(0);
      setReasoningIndex(0);
      setCurrentChallenge(null);
      setAnswer('');
      setResult(null);
      setShowHint(false);
    } catch (err) {
      console.error('Failed to load challenges:', err);
    }
    setLoading(false);
  };

  // Current logo challenge (auto-flow)
  const currentLogo = activeSubLevel === 'logo' && challenges.length > 0
    ? challenges[currentIndex] || null
    : null;

  // Current AI vs Human challenge (auto-flow)
  const currentAiHuman = activeSubLevel === 'aihuman' && challenges.length > 0
    ? challenges[aiHumanIndex] || null
    : null;

  // Current Reasoning challenge (auto-flow MCQ)
  const currentReasoning = activeSubLevel === 'reasoning' && challenges.length > 0
    ? challenges[reasoningIndex] || null
    : null;

  // totalLogos is stored as state (set once on load) so it doesn't fluctuate

  // Handle MCQ option click for logo zone
  const handleOptionClick = async (option) => {
    if (isSubmitting || result) return;
    
    setIsSubmitting(true);
    playSound('click');
    
    const response = await submitAnswer(currentLogo.id, option, 1, 'logo');
    
    if (response.correct) {
      playSound('cash');
      setResult({ success: true, reward: response.reward, selected: option });
      setCompleted(prev => [...prev, currentLogo.id]);
      if (typeof response.newCash === 'number') {
        updateTeam({ cash: response.newCash });
      }
    } else {
      playSound('error');
      setResult({ success: false, selected: option });
      if (typeof response.newCash === 'number') {
        updateTeam({ cash: response.newCash });
      }
    }
    
    setIsSubmitting(false);
    
    // Whether correct or wrong, question is done — auto-advance after 1.2s
    setTimeout(() => {
      advanceToNextLogo();
    }, 1200);
  };

  const advanceToNextLogo = () => {
    setResult(null);
    if (currentIndex + 1 < challenges.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Reload to get updated list (may be empty if all done)
      loadChallenges('logo');
    }
  };

  const handleSkipLogo = () => {
    playSound('click');
    // Move skipped question to the end of the queue
    setChallenges(prev => {
      const updated = [...prev];
      const [skipped] = updated.splice(currentIndex, 1);
      updated.push(skipped);
      return updated;
    });
    // currentIndex now points to the next item (since we removed the current one)
    // If we were at the last item, wrap back
    setCurrentIndex(prev => prev >= challenges.length - 1 ? 0 : prev);
    setResult(null);
  };

  // ── AI vs Human option click ──
  const handleAiHumanOptionClick = async (option) => {
    if (isSubmitting || result) return;
    setIsSubmitting(true);
    playSound('click');

    const response = await submitAnswer(currentAiHuman.id, option, 1, 'aihuman');

    if (response.correct) {
      playSound('cash');
      setResult({ success: true, reward: response.reward, selected: option });
      setCompleted(prev => [...prev, currentAiHuman.id]);
      if (typeof response.newCash === 'number') updateTeam({ cash: response.newCash });
    } else {
      playSound('error');
      setResult({ success: false, selected: option });
      setCompleted(prev => [...prev, currentAiHuman.id]);
      if (typeof response.newCash === 'number') updateTeam({ cash: response.newCash });
    }

    setIsSubmitting(false);
  };

  const advanceAiHuman = () => {
    setResult(null);
    setShowHint(false);
    if (aiHumanIndex + 1 < challenges.length) {
      setAiHumanIndex(prev => prev + 1);
    } else {
      loadChallenges('aihuman');
    }
  };

  // ── Reasoning MCQ option click ──
  const handleReasoningOptionClick = async (optionLetter) => {
    if (isSubmitting || result) return;
    setIsSubmitting(true);
    playSound('click');

    const response = await submitAnswer(currentReasoning.id, optionLetter, 1, 'reasoning');

    if (response.correct) {
      playSound('cash');
      setResult({ success: true, reward: response.reward, selected: optionLetter });
      setCompleted(prev => [...prev, currentReasoning.id]);
      if (typeof response.newCash === 'number') updateTeam({ cash: response.newCash });
    } else {
      playSound('error');
      setResult({ success: false, selected: optionLetter });
      setCompleted(prev => [...prev, currentReasoning.id]);
      if (typeof response.newCash === 'number') updateTeam({ cash: response.newCash });
    }

    setIsSubmitting(false);
  };

  const advanceReasoning = () => {
    setResult(null);
    if (reasoningIndex + 1 < challenges.length) {
      setReasoningIndex(prev => prev + 1);
    } else {
      loadChallenges('reasoning');
    }
  };

  // Handle text answer submit for other zones
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentChallenge || !answer.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    playSound('click');
    
    const response = await submitAnswer(currentChallenge.id, answer, 1, activeSubLevel);
    
    if (response.correct) {
      playSound('cash');
      setResult({ success: true, reward: response.reward });
      setCompleted(prev => [...prev, currentChallenge.id]);
      if (typeof response.newCash === 'number') {
        updateTeam({ cash: response.newCash });
      }
      setTimeout(() => {
        setCurrentChallenge(null);
        setAnswer('');
        setResult(null);
        loadChallenges(activeSubLevel);
      }, 2000);
    } else {
      playSound('error');
      setResult({ success: false, penalty: response.penalty });
      if (typeof response.newCash === 'number') {
        updateTeam({ cash: response.newCash });
      }
    }
    
    setIsSubmitting(false);
  };

  const goBackToSelector = () => {
    playSound('click');
    setActiveSubLevel(null);
    setChallenges([]);
    setCompleted([]);
    setCurrentChallenge(null);
    setCurrentIndex(0);
    setAiHumanIndex(0);
    setReasoningIndex(0);
    setAnswer('');
    setResult(null);
    setShowHint(false);
  };

  const activeSubLevelData = SUB_LEVELS.find(s => s.id === activeSubLevel);
  const availableChallenges = challenges.filter(c => !completed.includes(c.id));

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gta-dark/70 border-b border-gta-green/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { 
                playSound('click'); 
                if (activeSubLevel) goBackToSelector();
                else navigate('/dashboard'); 
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-gta-green transition-colors font-condensed tracking-wider uppercase text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{activeSubLevel ? 'Sub-Levels' : 'Dashboard'}</span>
            </button>
            
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gta-gold" />
              <span className="cash-display text-xl">${team?.cash?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Level Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <span className="level-badge mb-4 inline-block">Level 1</span>
          <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-[3px]" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
            ENTRY ARENA
          </h1>
          {activeSubLevelData && (
            <p className="text-gray-400 font-condensed tracking-wider uppercase text-sm mt-1">
              {activeSubLevelData.name}
            </p>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ═══════════════ SUB-LEVEL SELECTOR ═══════════════ */}
          {!activeSubLevel && (
            <motion.div
              key="selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-4 sm:grid-cols-3"
            >
              {SUB_LEVELS.map((sub, i) => (
                <motion.button
                  key={sub.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => { playSound('click'); setActiveSubLevel(sub.id); }}
                  className="gta-card p-6 text-left hover:border-gta-pink/50 transition-all group"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${sub.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    {sub.icon}
                  </div>
                  <h3 className="text-lg font-digital text-white mb-1">{sub.name}</h3>
                  <p className="text-gray-500 text-sm font-mono">{sub.description}</p>
                  <div className="mt-3 flex items-center text-gta-purple text-sm font-condensed tracking-wider uppercase">
                    Start <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* ═══════════════ LOGO ZONE (AUTO-START + MCQ) ═══════════════ */}
          {activeSubLevel === 'logo' && (
            <motion.div
              key="logo-zone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {loading ? (
                <div className="gta-card p-12 text-center">
                  <div className="animate-spin w-10 h-10 border-4 border-gta-purple border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-400 font-mono">Loading logos...</p>
                </div>
              ) : currentLogo ? (
                <div>
                  {/* Progress bar */}
                  <div className="gta-card p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 font-mono text-sm">Logo Progress</span>
                      <span className="text-gta-purple font-digital">
                        {completed.length} / {totalLogos}
                      </span>
                    </div>
                    <div className="h-2 bg-gta-dark rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(completed.length / (totalLogos || 1)) * 100}%` }}
                        className="h-full bg-gradient-to-r from-orange-500 to-yellow-500"
                      />
                    </div>
                  </div>

                  {/* Logo Card */}
                  <motion.div
                    key={currentLogo.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="gta-card p-8"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-yellow-500 rounded text-white font-digital text-sm">
                        Logo #{completed.length + 1}
                      </span>
                      <span className="text-gray-400 font-mono text-sm">
                        Reward: <span className="text-gta-gold">${currentLogo.reward}</span>
                      </span>
                    </div>

                    {/* Logo Image */}
                    <div className="flex justify-center mb-8">
                      <div className="w-48 h-48 sm:w-56 sm:h-56 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center p-4 overflow-hidden">
                        <img
                          src={currentLogo.image}
                          alt="Guess this logo"
                          className="max-w-full max-h-full object-contain"
                          draggable={false}
                        />
                      </div>
                    </div>

                    <h3 className="text-center text-xl font-digital text-white mb-6">
                      What is this logo?
                    </h3>

                    {/* MCQ Options */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {currentLogo.options?.map((option, idx) => {
                        const isSelected = result?.selected === option;
                        const isCorrectSelection = isSelected && result?.success;
                        const isWrongSelection = isSelected && !result?.success;
                        
                        return (
                          <motion.button
                            key={idx}
                            whileHover={!result ? { scale: 1.03 } : {}}
                            whileTap={!result ? { scale: 0.97 } : {}}
                            onClick={() => handleOptionClick(option)}
                            disabled={isSubmitting || !!result}
                            className={`p-4 rounded-xl border-2 font-digital text-lg transition-all duration-200 text-left
                              ${isCorrectSelection
                                ? 'border-green-500 bg-green-500/20 text-green-400'
                                : isWrongSelection
                                  ? 'border-red-500 bg-red-500/20 text-red-400'
                                  : 'border-white/10 bg-white/5 text-white hover:border-gta-purple/60 hover:bg-gta-purple/10'
                              }
                              ${(isSubmitting || !!result) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                            `}
                          >
                            <span className="text-gta-purple/60 text-sm mr-2">{String.fromCharCode(65 + idx)}.</span>
                            {option}
                            {isCorrectSelection && <CheckCircle className="w-5 h-5 inline ml-2 text-green-500" />}
                            {isWrongSelection && <XCircle className="w-5 h-5 inline ml-2 text-red-500" />}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Result feedback */}
                    <AnimatePresence>
                      {result && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`p-4 rounded-lg flex items-center gap-3 mb-4 ${
                            result.success 
                              ? 'bg-green-500/10 border border-green-500/30' 
                              : 'bg-red-500/10 border border-red-500/30'
                          }`}
                        >
                          {result.success ? (
                            <>
                              <CheckCircle className="w-6 h-6 text-green-500" />
                              <span className="text-green-500 font-mono">
                                Correct! +${result.reward}
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-6 h-6 text-red-500" />
                              <span className="text-red-500 font-mono">
                                Wrong! Moving on...
                              </span>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Skip Button */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSkipLogo}
                        disabled={isSubmitting || !!result}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-gta-purple/40 transition-all font-mono text-sm disabled:opacity-30"
                      >
                        Skip <SkipForward className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                </div>
              ) : (
                /* All logos complete */
                <div className="gta-card p-12 text-center">
                  <Trophy className="w-16 h-16 text-gta-gold mx-auto mb-4" />
                  <h3 className="text-2xl font-digital text-white mb-2">Logo Zone Complete!</h3>
                  <p className="text-gray-400 font-mono mb-6">
                    You've identified all available logos.
                  </p>
                  <button
                    onClick={goBackToSelector}
                    className="gta-button"
                  >
                    Back to Sub-Levels
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════ AI vs HUMAN ZONE (image pairs + MCQ) ═══════════════ */}
          {activeSubLevel === 'aihuman' && (
            <motion.div
              key="aihuman-zone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {loading ? (
                <div className="gta-card p-12 text-center">
                  <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-400 font-mono">Loading challenges...</p>
                </div>
              ) : currentAiHuman ? (
                <div>
                  {/* Progress bar */}
                  <div className="gta-card p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 font-mono text-sm">AI vs Human Progress</span>
                      <span className="text-cyan-400 font-digital">
                        {completed.length} / {totalLogos}
                      </span>
                    </div>
                    <div className="h-2 bg-gta-dark rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(completed.length / (totalLogos || 1)) * 100}%` }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      />
                    </div>
                  </div>

                  {/* Challenge Card */}
                  <motion.div
                    key={currentAiHuman.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="gta-card p-6 sm:p-8"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded text-white font-digital text-sm">
                        Round #{completed.length + 1}
                      </span>
                      <span className="text-gray-400 font-mono text-sm">
                        Reward: <span className="text-gta-gold">${currentAiHuman.reward}</span>
                      </span>
                    </div>

                    <h3 className="text-center text-xl font-digital text-white mb-6 flex items-center justify-center gap-2">
                      <Eye className="w-5 h-5 text-cyan-400" />
                      Which image is AI generated?
                    </h3>

                    {/* Side-by-side images */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      {currentAiHuman.images?.map((imgSrc, idx) => {
                        const label = `Image ${idx + 1}`;
                        const isSelected = result?.selected === label;
                        const isCorrectPick = isSelected && result?.success;
                        const isWrongPick = isSelected && !result?.success;

                        return (
                          <motion.button
                            key={idx}
                            whileHover={!result ? { scale: 1.02 } : {}}
                            whileTap={!result ? { scale: 0.98 } : {}}
                            onClick={() => handleAiHumanOptionClick(label)}
                            disabled={isSubmitting || !!result}
                            className={`relative rounded-xl border-2 overflow-hidden transition-all duration-200 group
                              ${isCorrectPick
                                ? 'border-green-500 ring-2 ring-green-500/40'
                                : isWrongPick
                                  ? 'border-red-500 ring-2 ring-red-500/40'
                                  : 'border-white/10 hover:border-cyan-500/60'
                              }
                              ${(isSubmitting || !!result) ? 'cursor-not-allowed' : 'cursor-pointer'}
                            `}
                          >
                            {/* Image */}
                            <div className="aspect-[4/5] bg-black/30 flex items-center justify-center overflow-hidden">
                              <img
                                src={imgSrc}
                                alt={label}
                                className="w-full h-full object-cover"
                                draggable={false}
                              />
                            </div>

                            {/* Label overlay */}
                            <div className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between
                              ${isCorrectPick ? 'from-green-900/90' : isWrongPick ? 'from-red-900/90' : ''}
                            `}>
                              <span className="font-digital text-white text-lg">{label}</span>
                              {isCorrectPick && <CheckCircle className="w-6 h-6 text-green-400" />}
                              {isWrongPick && <XCircle className="w-6 h-6 text-red-400" />}
                              {!result && (
                                <span className="text-cyan-400 text-sm font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                  AI?
                                </span>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Result feedback + Reason */}
                    <AnimatePresence>
                      {result && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-3 mb-4"
                        >
                          <div className={`p-4 rounded-lg flex items-center gap-3 ${
                            result.success
                              ? 'bg-green-500/10 border border-green-500/30'
                              : 'bg-red-500/10 border border-red-500/30'
                          }`}>
                            {result.success ? (
                              <>
                                <CheckCircle className="w-6 h-6 text-green-500" />
                                <span className="text-green-500 font-mono">
                                  Correct! +${result.reward} — Good eye!
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-6 h-6 text-red-500" />
                                <span className="text-red-500 font-mono">
                                  Wrong! That was the real one.
                                </span>
                              </>
                            )}
                          </div>
                          {currentAiHuman.reason && (
                            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
                              <Eye className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                              <p className="text-cyan-300 font-mono text-sm">
                                <span className="text-cyan-500 font-bold">Reason:</span> {currentAiHuman.reason}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Next button (shown after answering) */}
                    <div className="flex justify-end">
                      {result ? (
                        <button
                          type="button"
                          onClick={() => { playSound('click'); advanceAiHuman(); }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-digital tracking-wider hover:brightness-110 transition-all"
                        >
                          Next <ChevronRight className="w-5 h-5" />
                        </button>
                      ) : null}
                    </div>
                  </motion.div>
                </div>
              ) : (
                /* All AI vs Human done */
                <div className="gta-card p-12 text-center">
                  <Trophy className="w-16 h-16 text-gta-gold mx-auto mb-4" />
                  <h3 className="text-2xl font-digital text-white mb-2">AI vs Human Complete!</h3>
                  <p className="text-gray-400 font-mono mb-6">
                    You've identified all AI-generated images.
                  </p>
                  <button onClick={goBackToSelector} className="gta-button">
                    Back to Sub-Levels
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════ REASONING ZONE (MCQ auto-flow) ═══════════════ */}
          {activeSubLevel === 'reasoning' && (
            <motion.div
              key="reasoning-zone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {loading ? (
                <div className="gta-card p-12 text-center">
                  <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-400 font-mono">Loading questions...</p>
                </div>
              ) : currentReasoning ? (
                <div>
                  {/* Progress bar */}
                  <div className="gta-card p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 font-mono text-sm">Reasoning Progress</span>
                      <span className="text-purple-400 font-digital">
                        {completed.length} / {totalLogos}
                      </span>
                    </div>
                    <div className="h-2 bg-gta-dark rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(completed.length / (totalLogos || 1)) * 100}%` }}
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      />
                    </div>
                  </div>

                  {/* Question Card */}
                  <motion.div
                    key={currentReasoning.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="gta-card p-6 sm:p-8"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded text-white font-digital text-sm">
                        Q{completed.length + 1} / {totalLogos}
                      </span>
                      <span className="text-gray-400 font-mono text-sm">
                        Reward: <span className="text-gta-gold">${currentReasoning.reward}</span>
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-digital text-white mb-6 leading-relaxed">
                      {currentReasoning.question}
                    </h3>

                    {/* MCQ Options */}
                    <div className="grid gap-3 mb-6">
                      {currentReasoning.options?.map((option, idx) => {
                        const letter = String.fromCharCode(65 + idx); // A, B, C, D
                        const isSelected = result?.selected === letter;
                        const isCorrectPick = isSelected && result?.success;
                        const isWrongPick = isSelected && !result?.success;

                        return (
                          <motion.button
                            key={idx}
                            whileHover={!result ? { scale: 1.01 } : {}}
                            whileTap={!result ? { scale: 0.99 } : {}}
                            onClick={() => handleReasoningOptionClick(letter)}
                            disabled={isSubmitting || !!result}
                            className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-3
                              ${isCorrectPick
                                ? 'border-green-500 bg-green-500/20'
                                : isWrongPick
                                  ? 'border-red-500 bg-red-500/20'
                                  : 'border-white/10 bg-white/5 hover:border-purple-500/60 hover:bg-purple-500/10'
                              }
                              ${(isSubmitting || !!result) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                            `}
                          >
                            <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-digital text-sm
                              ${isCorrectPick ? 'bg-green-500 text-white' : isWrongPick ? 'bg-red-500 text-white' : 'bg-purple-500/20 text-purple-400'}
                            `}>
                              {letter}
                            </span>
                            <span className={`font-mono text-sm pt-1 ${isCorrectPick ? 'text-green-400' : isWrongPick ? 'text-red-400' : 'text-white'}`}>
                              {option}
                            </span>
                            {isCorrectPick && <CheckCircle className="w-5 h-5 text-green-500 ml-auto flex-shrink-0 mt-1" />}
                            {isWrongPick && <XCircle className="w-5 h-5 text-red-500 ml-auto flex-shrink-0 mt-1" />}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Result feedback */}
                    <AnimatePresence>
                      {result && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`p-4 rounded-lg flex items-center gap-3 mb-4 ${
                            result.success
                              ? 'bg-green-500/10 border border-green-500/30'
                              : 'bg-red-500/10 border border-red-500/30'
                          }`}
                        >
                          {result.success ? (
                            <>
                              <CheckCircle className="w-6 h-6 text-green-500" />
                              <span className="text-green-500 font-mono">
                                Correct! +${result.reward}
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-6 h-6 text-red-500" />
                              <span className="text-red-500 font-mono">
                                Wrong answer!
                              </span>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Next button */}
                    <div className="flex justify-end">
                      {result ? (
                        <button
                          type="button"
                          onClick={() => { playSound('click'); advanceReasoning(); }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-digital tracking-wider hover:brightness-110 transition-all"
                        >
                          Next <ChevronRight className="w-5 h-5" />
                        </button>
                      ) : null}
                    </div>
                  </motion.div>
                </div>
              ) : (
                /* All reasoning done */
                <div className="gta-card p-12 text-center">
                  <Trophy className="w-16 h-16 text-gta-gold mx-auto mb-4" />
                  <h3 className="text-2xl font-digital text-white mb-2">Reasoning Complete!</h3>
                  <p className="text-gray-400 font-mono mb-6">
                    You've answered all reasoning questions.
                  </p>
                  <button onClick={goBackToSelector} className="gta-button">
                    Back to Sub-Levels
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
