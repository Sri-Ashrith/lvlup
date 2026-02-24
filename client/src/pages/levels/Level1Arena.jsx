import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useSound } from '../../context/SoundContext';
import { 
  ArrowLeft, 
  Brain, 
  Bot, 
  Cpu, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Lightbulb,
  Send,
  Trophy,
  Zap
} from 'lucide-react';

export default function Level1Arena() {
  const navigate = useNavigate();
  const { team, updateTeam } = useAuth();
  const { getChallenges, submitAnswer } = useGame();
  const { playSound } = useSound();
  
  const [activeZone, setActiveZone] = useState('logic');
  const [challenges, setChallenges] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const zones = [
    { id: 'logic', name: 'Logic Puzzles', icon: <Brain className="w-6 h-6" />, color: 'from-purple-500 to-pink-500' },
    { id: 'ai', name: 'AI Detection', icon: <Bot className="w-6 h-6" />, color: 'from-cyan-500 to-blue-500' },
    { id: 'tech', name: 'Tech Guessing', icon: <Cpu className="w-6 h-6" />, color: 'from-green-500 to-emerald-500' },
  ];

  useEffect(() => {
    loadChallenges();
  }, [activeZone]);

  const loadChallenges = async () => {
    const data = await getChallenges(1, activeZone);
    setChallenges(data.challenges);
    setCompleted(data.completed);
    setCurrentChallenge(null);
    setAnswer('');
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentChallenge || !answer.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    playSound('click');
    
    const response = await submitAnswer(currentChallenge.id, answer, 1, activeZone);
    
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
        loadChallenges();
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

  const activeZoneData = zones.find(z => z.id === activeZone);
  const availableChallenges = challenges.filter(c => !completed.includes(c.id));

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gta-dark/70 border-b border-gta-green/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { playSound('click'); navigate('/dashboard'); }}
              className="flex items-center gap-2 text-gray-500 hover:text-gta-green transition-colors font-condensed tracking-wider uppercase text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
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
          <p className="text-gray-500 font-condensed tracking-wider uppercase text-sm">
            Complete challenges across different zones to earn cash
          </p>
        </motion.div>

        {/* Zone Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-4 mb-8"
        >
          {zones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => {
                playSound('click');
                setActiveZone(zone.id);
                setCurrentChallenge(null);
                setAnswer('');
                setResult(null);
                setShowHint(false);
              }}
              className={`gta-card p-4 flex items-center gap-3 transition-all ${
                activeZone === zone.id 
                  ? 'border-gta-pink ring-2 ring-gta-pink/50' 
                  : 'hover:border-gta-purple/50'
              }`}
            >
              <div className={`w-10 h-10 bg-gradient-to-br ${zone.color} rounded-lg flex items-center justify-center`}>
                {zone.icon}
              </div>
              <span className="font-digital text-white">{zone.name}</span>
            </button>
          ))}
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="gta-card p-4 mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 font-mono text-sm">Zone Progress</span>
            <span className="text-gta-purple font-digital">
              {completed.length} / {challenges.length + completed.length}
            </span>
          </div>
          <div className="h-2 bg-gta-dark rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completed.length / (challenges.length + completed.length || 1)) * 100}%` }}
              className="h-full bg-gradient-to-r from-gta-purple to-gta-pink"
            />
          </div>
        </motion.div>

        {/* Challenge Selection or Active Challenge */}
        <AnimatePresence mode="wait">
          {!currentChallenge ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {availableChallenges.length > 0 ? (
                <div className="grid gap-4">
                  {availableChallenges.map((challenge, index) => (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => { playSound('click'); setCurrentChallenge(challenge); }}
                      className="gta-card p-6 cursor-pointer hover:border-gta-pink/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${activeZoneData.color} rounded-lg flex items-center justify-center`}>
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-digital text-white">
                              Challenge #{index + 1}
                            </h3>
                            <p className="text-gray-400 text-sm font-mono">
                              Reward: <span className="text-gta-gold">${challenge.reward}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-gta-purple">
                          <Send className="w-6 h-6" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="gta-card p-12 text-center">
                  <Trophy className="w-16 h-16 text-gta-gold mx-auto mb-4" />
                  <h3 className="text-2xl font-digital text-white mb-2">Zone Complete!</h3>
                  <p className="text-gray-400 font-mono">
                    You've completed all challenges in this zone.
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="challenge"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="gta-card p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <span className={`px-3 py-1 bg-gradient-to-r ${activeZoneData.color} rounded text-white font-digital text-sm`}>
                  {activeZoneData.name}
                </span>
                <button
                  onClick={() => { playSound('click'); setCurrentChallenge(null); setAnswer(''); setResult(null); setShowHint(false); }}
                  className="text-gray-400 hover:text-white transition-colors font-mono text-sm"
                >
                  ← Back to list
                </button>
              </div>

              <h3 className="text-xl font-digital text-white mb-4">
                {currentChallenge.question}
              </h3>

              {/* Hint */}
              {currentChallenge.hint && (
                <div className="mb-6">
                  {showHint ? (
                    <div className="bg-gta-gold/10 border border-gta-gold/30 rounded-lg p-4 flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-gta-gold flex-shrink-0 mt-0.5" />
                      <p className="text-gta-gold font-mono text-sm">{currentChallenge.hint}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => { playSound('click'); setShowHint(true); }}
                      className="flex items-center gap-2 text-gta-gold hover:text-yellow-400 transition-colors font-mono text-sm"
                    >
                      <Lightbulb className="w-4 h-4" />
                      Show Hint
                    </button>
                  )}
                </div>
              )}

              {/* Answer Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className="gta-input"
                    disabled={isSubmitting || result?.success}
                  />
                </div>

                {/* Result */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-4 rounded-lg flex items-center gap-3 ${
                        result.success 
                          ? 'bg-green-500/10 border border-green-500/30' 
                          : 'bg-gta-red/10 border border-gta-red/30'
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
                          <XCircle className="w-6 h-6 text-gta-red" />
                          <span className="text-gta-red font-mono">
                            Wrong answer. Try again!
                          </span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-mono text-sm">
                    Reward: <span className="text-gta-gold">${currentChallenge.reward}</span>
                  </span>
                  <div className="flex gap-2">
                    {/* L1-01: Skip button — move to next challenge without answering */}
                    <button
                      type="button"
                      onClick={() => { playSound('click'); setCurrentChallenge(null); setAnswer(''); setResult(null); setShowHint(false); }}
                      disabled={isSubmitting}
                      className="gta-button opacity-60 hover:opacity-100 text-sm disabled:opacity-30"
                    >
                      Skip
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !answer.trim() || result?.success}
                      className="gta-button disabled:opacity-50"
                    >
                    {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                  </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
