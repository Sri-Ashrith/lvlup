import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useSound } from '../../context/SoundContext';
import LevelTimer from '../../components/LevelTimer';
import {
  ArrowLeft,
  DollarSign,
  CheckCircle,
  XCircle,
  Trophy,
  AlertTriangle,
  ChevronRight,
  Lock,
  Zap,
  Flame,
  Skull,
  Code2,
  ArrowRight
} from 'lucide-react';

const SECTIONS = [
  {
    id: 'easy',
    name: 'Easy',
    subtitle: 'Fundamentals',
    icon: <Zap className="w-7 h-7" />,
    color: 'from-green-500 to-emerald-500',
    border: 'border-green-500/40',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    reward: '$200',
    totalQuestions: 6,
  },
  {
    id: 'medium',
    name: 'Medium',
    subtitle: 'Intermediate',
    icon: <Flame className="w-7 h-7" />,
    color: 'from-amber-500 to-orange-500',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    reward: '$350',
    totalQuestions: 6,
  },
  {
    id: 'hard',
    name: 'Hard',
    subtitle: 'Advanced',
    icon: <Skull className="w-7 h-7" />,
    color: 'from-red-500 to-rose-600',
    border: 'border-red-500/40',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    reward: '$500',
    totalQuestions: 4,
  },
];

const MAX_PER_SECTION = 3;
const MAX_TOTAL = 6;

export default function Level2Skills() {
  const navigate = useNavigate();
  const { team, updateTeam } = useAuth();
  const { getChallenges, submitAnswer } = useGame();
  const { playSound } = useSound();

  const [activeSection, setActiveSection] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);

  const [challenges, setChallenges] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [level2Progress, setLevel2Progress] = useState(null);

  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadChallenges = useCallback(async (section) => {
    const data = await getChallenges(2, section);
    setChallenges(data.challenges || []);
    setCompleted(data.completed || []);
    if (data.level2Progress) setLevel2Progress(data.level2Progress);
  }, [getChallenges]);

  useEffect(() => {
    if (activeSection) {
      loadChallenges(activeSection);
      setActiveChallenge(null);
      setSelectedOption(null);
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // Load initial progress on mount
  useEffect(() => {
    async function init() {
      const data = await getChallenges(2, 'easy');
      if (data.level2Progress) setLevel2Progress(data.level2Progress);
    }
    init();
  }, [getChallenges]);

  const totalAnswered = level2Progress?.totalCompleted ?? 0;
  const sectionProgress = level2Progress?.sectionProgress ?? {};
  const slotsRemaining = MAX_TOTAL - totalAnswered;

  const handleSelectSection = (sectionId) => {
    playSound('click');
    setActiveSection(sectionId);
  };

  const handleSelectChallenge = (challenge) => {
    playSound('click');
    setActiveChallenge(challenge);
    setSelectedOption(null);
    setResult(null);
  };

  const handleOptionClick = async (letter) => {
    if (isSubmitting || result) return;
    setSelectedOption(letter);
    setIsSubmitting(true);
    playSound('click');

    try {
      const response = await submitAnswer(activeChallenge.id, letter, 2, activeSection);

      if (response.correct) {
        playSound('cash');
        setResult({ correct: true, reward: response.reward });
      } else {
        playSound('error');
        setResult({ correct: false, penalty: response.penalty || 0 });
      }

      setCompleted(prev => [...prev, activeChallenge.id]);
      if (typeof response.newCash === 'number') updateTeam({ cash: response.newCash });

      setLevel2Progress(prev => {
        if (!prev) return prev;
        const newSP = { ...prev.sectionProgress };
        newSP[activeSection] = (newSP[activeSection] || 0) + 1;
        return { ...prev, sectionProgress: newSP, totalCompleted: prev.totalCompleted + 1 };
      });
    } catch (err) {
      console.error('Submit error:', err);
      setResult({ correct: false, error: err?.message || 'Server error' });
    }

    setIsSubmitting(false);
  };

  const handleNext = () => {
    setActiveChallenge(null);
    setSelectedOption(null);
    setResult(null);
    if (activeSection) loadChallenges(activeSection);
  };

  const handleBack = () => {
    playSound('click');
    if (activeChallenge) {
      if (!isSubmitting) {
        setActiveChallenge(null);
        setSelectedOption(null);
        setResult(null);
      }
    } else if (activeSection) {
      setActiveSection(null);
    } else {
      navigate('/dashboard');
    }
  };

  const activeSectionData = SECTIONS.find(s => s.id === activeSection);
  const availableChallenges = challenges.filter(c => !completed.includes(c.id));

  const sectionDone = (sectionId) => sectionProgress[sectionId] || 0;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gta-dark/70 border-b border-gta-green/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-500 hover:text-gta-green transition-colors font-condensed tracking-wider uppercase text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{activeChallenge ? 'Back to Questions' : activeSection ? 'Back to Sections' : 'Back'}</span>
            </button>

            <div className="flex items-center gap-4">
              <LevelTimer levelNumber={2} />
              <div className="flex items-center gap-2 px-3 py-1 rounded bg-gta-dark/80 border border-gta-purple/30">
                <Code2 className="w-4 h-4 text-gta-purple" />
                <span className="font-mono text-sm text-gta-purple">{totalAnswered}/{MAX_TOTAL}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gta-gold" />
                <span className="cash-display text-xl">${team?.cash?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <span className="level-badge mb-4 inline-block">Level 2</span>
          <h1
            className="text-4xl font-bold text-white mb-2 uppercase tracking-[3px]"
            style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}
          >
            CODE ARENA
          </h1>
          <p className="text-gray-500 font-condensed tracking-wider uppercase text-sm">
            Answer 6 questions total &bull; Max 3 per section &bull; Choose wisely
          </p>
        </motion.div>

        {totalAnswered > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="gta-card p-4 mb-6 border-gta-purple/30 bg-gta-purple/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-gta-purple flex-shrink-0" />
                <p className="text-gta-purple font-mono text-sm">
                  {slotsRemaining > 0
                    ? `${slotsRemaining} question slot${slotsRemaining > 1 ? 's' : ''} remaining`
                    : 'All 6 question slots used!'}
                </p>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: MAX_TOTAL }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${i < totalAnswered ? 'bg-gta-purple' : 'bg-gray-700'}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!activeSection && (
            <motion.div
              key="sections"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-6"
            >
              {SECTIONS.map((section, idx) => {
                const done = sectionDone(section.id);
                const locked = totalAnswered >= MAX_TOTAL || done >= MAX_PER_SECTION;
                const full = done >= MAX_PER_SECTION;

                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={!locked ? { scale: 1.02, x: 10 } : {}}
                    onClick={() => !locked && handleSelectSection(section.id)}
                    className={`gta-card p-6 transition-all ${
                      locked
                        ? 'opacity-60 cursor-not-allowed border-gray-700/30'
                        : 'cursor-pointer hover:border-gta-pink/50'
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`w-16 h-16 bg-gradient-to-br ${section.color} rounded-xl flex items-center justify-center flex-shrink-0 ${locked ? 'grayscale' : ''}`}
                      >
                        {locked ? <Lock className="w-7 h-7 text-white/60" /> : section.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-digital text-white">{section.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded font-mono ${section.bg} ${section.text}`}>
                            {section.reward} each
                          </span>
                          {full && (
                            <span className="text-xs px-2 py-0.5 rounded font-mono bg-gray-600/30 text-gray-400">
                              MAX REACHED
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 font-mono text-sm mb-2">{section.subtitle}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gta-dark rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(done / MAX_PER_SECTION) * 100}%` }}
                              className={`h-full bg-gradient-to-r ${section.color}`}
                            />
                          </div>
                          <span className="text-gray-500 font-mono text-xs">
                            {done}/{MAX_PER_SECTION}
                          </span>
                        </div>
                      </div>
                      {!locked && <ChevronRight className="w-6 h-6 text-gta-purple" />}
                    </div>
                  </motion.div>
                );
              })}

              {totalAnswered >= MAX_TOTAL && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="gta-card p-10 text-center border-gta-gold/30"
                >
                  <Trophy className="w-16 h-16 text-gta-gold mx-auto mb-4" />
                  <h3 className="text-2xl font-digital text-white mb-2">Round 2 Complete!</h3>
                  <p className="text-gray-400 font-mono mb-4">You have used all 6 question slots.</p>
                  <button onClick={() => navigate('/dashboard')} className="gta-button">
                    Back to Dashboard
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeSection && !activeChallenge && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={`gta-card p-4 mb-6 ${activeSectionData.border} ${activeSectionData.bg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${activeSectionData.color} rounded-lg flex items-center justify-center`}>
                      {activeSectionData.icon}
                    </div>
                    <div>
                      <h3 className={`font-digital text-lg ${activeSectionData.text}`}>{activeSectionData.name} Section</h3>
                      <p className="text-gray-500 text-xs font-mono">
                        {sectionDone(activeSection)}/{MAX_PER_SECTION} answered &bull; {slotsRemaining} global slot{slotsRemaining !== 1 ? 's' : ''} left
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono text-sm ${activeSectionData.text}`}>{activeSectionData.reward} each</span>
                </div>
              </div>

              {slotsRemaining <= 0 || sectionDone(activeSection) >= MAX_PER_SECTION ? (
                <div className="gta-card p-10 text-center">
                  <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-digital text-white mb-2">
                    {sectionDone(activeSection) >= MAX_PER_SECTION ? 'Section Limit Reached' : 'All Slots Used'}
                  </h3>
                  <p className="text-gray-400 font-mono text-sm mb-4">
                    {sectionDone(activeSection) >= MAX_PER_SECTION
                      ? `You have answered ${MAX_PER_SECTION} questions in this section.`
                      : 'You have no remaining question slots.'}
                  </p>
                  <button onClick={() => setActiveSection(null)} className="gta-button">
                    Back to Sections
                  </button>
                </div>
              ) : availableChallenges.length === 0 ? (
                <div className="gta-card p-10 text-center">
                  <Trophy className="w-12 h-12 text-gta-gold mx-auto mb-4" />
                  <h3 className="text-xl font-digital text-white mb-2">No More Questions</h3>
                  <p className="text-gray-400 font-mono text-sm mb-4">All questions in this section have been answered.</p>
                  <button onClick={() => setActiveSection(null)} className="gta-button">
                    Back to Sections
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {availableChallenges.map((ch, index) => (
                    <motion.div
                      key={ch.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 }}
                      whileHover={{ scale: 1.01, x: 6 }}
                      onClick={() => handleSelectChallenge(ch)}
                      className="gta-card p-5 cursor-pointer hover:border-gta-pink/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${activeSectionData.color} rounded-lg flex items-center justify-center font-digital text-white text-lg`}>
                            Q{index + 1}
                          </div>
                          <div>
                            <h4 className="text-white font-mono text-sm line-clamp-1">{ch.question}</h4>
                            <span className={`text-xs font-mono ${activeSectionData.text}`}>+${ch.reward}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-500" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeSection && activeChallenge && (
            <motion.div
              key="mcq"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="gta-card p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <span className={`px-3 py-1 bg-gradient-to-r ${activeSectionData.color} rounded text-white font-digital text-sm`}>
                    {activeSectionData.name}
                  </span>
                  <span className={`font-mono text-sm ${activeSectionData.text}`}>+${activeChallenge.reward}</span>
                </div>

                <h3 className="text-lg md:text-xl font-digital text-white mb-5 whitespace-pre-line leading-relaxed">
                  {activeChallenge.question}
                </h3>

                {activeChallenge.patternImage && (
                  <div className="mb-5 flex justify-center">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 inline-block">
                      <img
                        src={activeChallenge.patternImage}
                        alt="Pattern"
                        className="max-w-full max-h-48 rounded"
                      />
                    </div>
                  </div>
                )}

                {activeChallenge.codeImage && (
                  <div className="mb-5 flex justify-center">
                    <div className="bg-white rounded-lg p-2 inline-block shadow-lg shadow-black/30">
                      <img
                        src={activeChallenge.codeImage}
                        alt="Code snippet"
                        className="max-w-full rounded"
                        style={{ maxHeight: '400px' }}
                      />
                    </div>
                  </div>
                )}

                {activeChallenge.optionImages ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const imgSrc = activeChallenge.optionImages[letter];
                      if (!imgSrc) return null;
                      const isSelected = selectedOption === letter;
                      const showResult = result !== null;
                      const isCorrect = showResult && result.correct && isSelected;
                      const isWrong = showResult && !result.correct && isSelected;

                      return (
                        <motion.button
                          key={letter}
                          whileHover={!result ? { scale: 1.03 } : {}}
                          whileTap={!result ? { scale: 0.97 } : {}}
                          onClick={() => handleOptionClick(letter)}
                          disabled={!!result || isSubmitting}
                          className={`relative rounded-xl border-2 p-3 transition-all overflow-hidden ${
                            isCorrect
                              ? 'border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                              : isWrong
                              ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                              : isSelected
                              ? 'border-gta-purple bg-gta-purple/10'
                              : 'border-gray-700/50 bg-gta-dark/50 hover:border-gray-500/70'
                          } ${result && !isSelected ? 'opacity-50' : ''}`}
                        >
                          <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center font-digital text-white text-sm z-10">
                            {letter}
                          </div>
                          <div className="bg-white rounded-lg p-1 mt-6">
                            <img
                              src={imgSrc}
                              alt={`Option ${letter}`}
                              className="w-full rounded"
                            />
                          </div>
                          {isCorrect && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                          )}
                          {isWrong && (
                            <div className="absolute top-2 right-2">
                              <XCircle className="w-6 h-6 text-red-500" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid gap-3 mb-6">
                    {(activeChallenge.options || []).map((optText, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = selectedOption === letter;
                      const showResult = result !== null;
                      const isCorrect = showResult && result.correct && isSelected;
                      const isWrong = showResult && !result.correct && isSelected;

                      return (
                        <motion.button
                          key={letter}
                          whileHover={!result ? { scale: 1.01 } : {}}
                          whileTap={!result ? { scale: 0.98 } : {}}
                          onClick={() => handleOptionClick(letter)}
                          disabled={!!result || isSubmitting}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                            isCorrect
                              ? 'border-green-500 bg-green-500/10'
                              : isWrong
                              ? 'border-red-500 bg-red-500/10'
                              : isSelected
                              ? 'border-gta-purple bg-gta-purple/10'
                              : 'border-gray-700/50 bg-gta-dark/50 hover:border-gray-500/70'
                          } ${result && !isSelected ? 'opacity-50' : ''}`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-digital text-sm flex-shrink-0 ${
                              isCorrect
                                ? 'bg-green-500 text-white'
                                : isWrong
                                ? 'bg-red-500 text-white'
                                : isSelected
                                ? 'bg-gta-purple text-white'
                                : 'bg-gray-700/50 text-gray-300'
                            }`}
                          >
                            {letter}
                          </div>
                          <span className="text-white font-mono text-sm flex-1">{optText}</span>
                          {isCorrect && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                          {isWrong && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-4 rounded-lg mb-4 flex items-center gap-3 ${
                        result.correct
                          ? 'bg-green-500/10 border border-green-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                      }`}
                    >
                      {result.correct ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-green-500" />
                          <span className="text-green-400 font-mono">Correct! +${result.reward}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-red-500" />
                          <span className="text-red-400 font-mono">
                            Wrong!{result.penalty ? ` -$${result.penalty}` : ''}
                          </span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {result && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={handleNext}
                    className="gta-button w-full"
                  >
                    Next
                  </motion.button>
                )}

                {isSubmitting && !result && (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-gta-purple border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
