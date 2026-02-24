import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useSound } from '../../context/SoundContext';
import { 
  ArrowLeft, 
  Brain, 
  Code, 
  MessageSquare, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Lightbulb,
  Send,
  Trophy,
  AlertTriangle,
  Lock
} from 'lucide-react';

export default function Level2Skills() {
  const navigate = useNavigate();
  const { team, updateTeam } = useAuth();
  const { getChallenges, submitAnswer } = useGame();
  const { playSound } = useSound();
  
  const [activeTrack, setActiveTrack] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [trackAttempted, setTrackAttempted] = useState(false);

  const tracks = [
    { 
      id: 'brain', 
      name: 'Brain.exe', 
      subtitle: 'High Cash Track',
      icon: <Brain className="w-8 h-8" />, 
      color: 'from-red-500 to-pink-500',
      description: 'Complex algorithms & logic puzzles',
      cashLevel: 'HIGH'
    },
    { 
      id: 'nocode', 
      name: 'Build Without Code', 
      subtitle: 'Mid Cash Track',
      icon: <Code className="w-8 h-8" />, 
      color: 'from-blue-500 to-cyan-500',
      description: 'No-code tools & platforms',
      cashLevel: 'MID'
    },
    { 
      id: 'prompt', 
      name: 'Prompt Wars', 
      subtitle: 'Low Cash Track',
      icon: <MessageSquare className="w-8 h-8" />, 
      color: 'from-green-500 to-emerald-500',
      description: 'AI prompting techniques',
      cashLevel: 'LOW'
    },
  ];

  useEffect(() => {
    if (activeTrack) {
      loadChallenges();
    }
  }, [activeTrack]);

  const loadChallenges = async () => {
    const data = await getChallenges(2, activeTrack);
    setChallenges(data.challenges);
    setCompleted(data.completed);
    setCurrentChallenge(null);
    setAnswer('');
    setResult(null);
    setTrackAttempted(data.completed.length > 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentChallenge || !answer.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    playSound('click');
    
    const response = await submitAnswer(currentChallenge.id, answer, 2, activeTrack);
    
    if (response.correct) {
      playSound('cash');
      setResult({ success: true, reward: response.reward });
      setCompleted(prev => [...prev, currentChallenge.id]);
      setTrackAttempted(true);
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

  const activeTrackData = tracks.find(t => t.id === activeTrack);
  const availableChallenges = challenges.filter(c => !completed.includes(c.id));

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gta-dark/70 border-b border-gta-green/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { 
                playSound('click'); 
                if (activeTrack) {
                  setActiveTrack(null);
                } else {
                  navigate('/dashboard');
                }
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-gta-green transition-colors font-condensed tracking-wider uppercase text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{activeTrack ? 'Back to Tracks' : 'Back'}</span>
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
          <span className="level-badge mb-4 inline-block">Level 2</span>
          <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-[3px]" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
            SKILL ARENAS
          </h1>
          <p className="text-gray-500 font-condensed tracking-wider uppercase text-sm">
            Choose your track wisely. Higher rewards come with higher penalties.
          </p>
        </motion.div>

        {/* Warning */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="gta-card p-4 mb-8 border-yellow-500/30 bg-yellow-500/5"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <p className="text-yellow-500 font-mono text-sm">
              Wrong answers will deduct cash from your balance! Be careful.
            </p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!activeTrack ? (
            /* Track Selection */
            <motion.div
              key="tracks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-6"
            >
              {tracks.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 10 }}
                  onClick={() => { playSound('click'); setActiveTrack(track.id); }}
                  className="gta-card p-6 cursor-pointer hover:border-gta-pink/50 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${track.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      {track.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-digital text-white">
                          {track.name}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                          track.cashLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                          track.cashLevel === 'MID' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {track.cashLevel} CASH
                        </span>
                      </div>
                      <p className="text-gray-400 font-mono text-sm mb-2">
                        {track.subtitle}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {track.description}
                      </p>
                    </div>
                    <Send className="w-6 h-6 text-gta-purple" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            /* Challenge View */
            <motion.div
              key="challenges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Progress */}
              <div className="gta-card p-4 mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 font-mono text-sm">Track Progress</span>
                  <span className="text-gta-purple font-digital">
                    {completed.length} / {challenges.length + completed.length}
                  </span>
                </div>
                <div className="h-2 bg-gta-dark rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(completed.length / (challenges.length + completed.length || 1)) * 100}%` }}
                    className={`h-full bg-gradient-to-r ${activeTrackData.color}`}
                  />
                </div>
              </div>

              {!currentChallenge ? (
                /* Challenge List */
                availableChallenges.length > 0 ? (
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
                            <div className={`w-12 h-12 bg-gradient-to-br ${activeTrackData.color} rounded-lg flex items-center justify-center`}>
                              {activeTrackData.icon}
                            </div>
                            <div>
                              <h3 className="text-lg font-digital text-white">
                                Challenge #{index + 1}
                              </h3>
                              <div className="flex items-center gap-4 text-sm font-mono">
                                <span className="text-gta-gold">+${challenge.reward}</span>
                                <span className="text-gta-red">-${challenge.penalty}</span>
                              </div>
                            </div>
                          </div>
                          <Send className="w-6 h-6 text-gta-purple" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="gta-card p-12 text-center">
                    <Trophy className="w-16 h-16 text-gta-gold mx-auto mb-4" />
                    <h3 className="text-2xl font-digital text-white mb-2">Track Complete!</h3>
                    <p className="text-gray-400 font-mono mb-4">
                      You've completed all challenges in this track.
                    </p>
                    <button
                      onClick={() => setActiveTrack(null)}
                      className="gta-button"
                    >
                      Choose Another Track
                    </button>
                  </div>
                )
              ) : (
                /* Active Challenge */
                <div className="gta-card p-8">
                  <div className="flex items-center justify-between mb-6">
                    <span className={`px-3 py-1 bg-gradient-to-r ${activeTrackData.color} rounded text-white font-digital text-sm`}>
                      {activeTrackData.name}
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

                  {/* Stakes */}
                  <div className="flex items-center gap-6 mb-6 p-4 bg-gta-dark/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-500 font-mono">+${currentChallenge.reward}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-gta-red" />
                      <span className="text-gta-red font-mono">-${currentChallenge.penalty}</span>
                    </div>
                  </div>

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
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      className="gta-input"
                      disabled={isSubmitting || result?.success}
                    />

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
                                Wrong! -${result.penalty}
                              </span>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={isSubmitting || !answer.trim() || result?.success}
                      className="gta-button w-full disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
