import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useSound } from '../../context/SoundContext';
import { 
  ArrowLeft, 
  Target,
  Skull,
  Shield,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Users
} from 'lucide-react';

export default function Level3Heist() {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { leaderboard, initiateHeist, submitCompoundAnswer, submitSafeAnswer } = useGame();
  const { playSound } = useSound();
  
  const [stage, setStage] = useState('select'); // select, compound, safe, result
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [heistData, setHeistData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [heistEndTime, setHeistEndTime] = useState(null); // PERF-02: absolute end time
  const [compoundProgress, setCompoundProgress] = useState([]);
  const [currentCompound, setCurrentCompound] = useState(0);
  const [safeChallenge, setSafeChallenge] = useState(null);
  const [safeAttempts, setSafeAttempts] = useState(3);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PERF-02: Timer based on absolute Date.now() to avoid background tab drift
  useEffect(() => {
    if (!heistEndTime || !(stage === 'compound' || stage === 'safe')) return;
    
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((heistEndTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        handleTimeUp();
        return;
      }
      // L3-07: Throttle countdown sound
      if (remaining === 30 || remaining === 20 || remaining === 10 || remaining <= 5) {
        playSound('countdown');
      }
    }, 500); // 500ms for accuracy despite tab throttle
    return () => clearInterval(timer);
  }, [heistEndTime, stage]);

  const handleTimeUp = () => {
    playSound('error');
    setResult({ success: false, message: "Time's up! Heist failed." });
    setStage('result');
  };

  const availableTargets = leaderboard.filter(t => 
    t.id !== team?.id && t.cash > 0
  );

  const startHeist = async () => {
    if (!selectedTarget) return;
    
    playSound('heist');
    setIsSubmitting(true);
    
    const response = await initiateHeist(selectedTarget.id);
    
    if (response.blocked) {
      playSound('error');
      setResult({ success: false, message: response.message });
      setStage('result');
    } else if (response.heistId) {
      setHeistData(response);
      setTimeLeft(response.timeLimit);
      setHeistEndTime(Date.now() + response.timeLimit * 1000); // PERF-02
      setStage('compound');
    }
    
    setIsSubmitting(false);
  };

  const handleCompoundSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim() || isSubmitting) return;
    
    playSound('click');
    setIsSubmitting(true);
    
    const challenge = heistData.compoundChallenges[currentCompound];
    const response = await submitCompoundAnswer(heistData.heistId, challenge.id, answer);
    
    if (response.correct) {
      playSound('success');
      setCompoundProgress(prev => [...prev, challenge.id]);
      
      if (response.stageComplete) {
        setSafeChallenge(response.safeChallenge);
        setStage('safe');
        setTimeLeft(response.safeChallenge.timeLimit || 120);
      } else {
        setCurrentCompound(prev => prev + 1);
      }
    } else {
      playSound('error');
    }
    
    setAnswer('');
    setIsSubmitting(false);
  };

  const handleSafeSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim() || isSubmitting) return;
    
    playSound('click');
    setIsSubmitting(true);
    
    const response = await submitSafeAnswer(heistData.heistId, answer);
    
    if (response.heistSuccess) {
      playSound('cash');
      setResult({ 
        success: true, 
        message: `Heist successful! You stole $${response.stolenAmount}!` 
      });
      setStage('result');
    } else if (response.heistSuccess === false) {
      playSound('error');
      setResult({ 
        success: false, 
        message: `Heist failed! You lost $${response.transferAmount} to the defender.` 
      });
      setStage('result');
    } else {
      playSound('error');
      setSafeAttempts(response.attemptsRemaining);
    }
    
    setAnswer('');
    setIsSubmitting(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gta-dark/70 border-b border-gta-green/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { 
                playSound('click'); 
                if (stage === 'select' || stage === 'result') {
                  navigate('/dashboard');
                }
              }}
              className={`flex items-center gap-2 text-gray-500 hover:text-gta-green transition-colors font-condensed tracking-wider uppercase text-sm ${
                stage !== 'select' && stage !== 'result' ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-4">
              {(stage === 'compound' || stage === 'safe') && (
                <div className={`flex items-center gap-2 ${timeLeft <= 30 ? 'timer-warning' : ''}`}>
                  <Clock className={`w-5 h-5 ${timeLeft <= 30 ? 'text-gta-red' : 'text-gta-cyan'}`} />
                  <span className={`timer-display text-xl ${timeLeft <= 30 ? 'text-gta-red' : ''}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gta-gold" />
                <span className="cash-display text-xl">${team?.cash?.toLocaleString() || 0}</span>
              </div>
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
          <span className="level-badge mb-4 inline-block bg-gradient-to-r from-gta-red to-pink-600">Level 3</span>
          <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-[3px]" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
            TECH HEIST
          </h1>
          <p className="text-gray-500 font-condensed tracking-wider uppercase text-sm">
            {stage === 'select' && 'Choose a target and attempt to steal their cash'}
            {stage === 'compound' && 'Break into the compound - answer quick questions'}
            {stage === 'safe' && 'Crack the safe - you have 3 attempts'}
            {stage === 'result' && 'Heist Complete'}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Target Selection */}
          {stage === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="gta-card p-4 mb-8 border-gta-red/30 bg-gta-red/5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-gta-red flex-shrink-0" />
                  <p className="text-gta-red font-mono text-sm">
                    Warning: If your heist fails, you'll lose 30% of your cash to the defender!
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-digital text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-gta-red" />
                Select Target
              </h2>

              {availableTargets.length > 0 ? (
                <div className="grid gap-4 mb-8">
                  {availableTargets.map((target, index) => (
                    <motion.div
                      key={target.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => { playSound('click'); setSelectedTarget(target); }}
                      className={`gta-card p-4 cursor-pointer transition-all ${
                        selectedTarget?.id === target.id 
                          ? 'border-gta-red ring-2 ring-gta-red/50' 
                          : 'hover:border-gta-red/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-gta-red to-pink-600 rounded-xl flex items-center justify-center">
                            <Skull className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-digital text-white">{target.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${target.isOnline ? 'bg-green-500' : 'bg-gray-600'}`} />
                              <span className="text-gray-500 text-xs font-mono">
                                {target.isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="cash-display text-xl">${target.cash.toLocaleString()}</p>
                          <p className="text-gray-500 text-xs font-mono">Available to steal</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="gta-card p-12 text-center mb-8">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-digital text-white mb-2">No Targets Available</h3>
                  <p className="text-gray-400 font-mono">
                    All other teams have $0 cash.
                  </p>
                </div>
              )}

              {selectedTarget && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <button
                    onClick={startHeist}
                    disabled={isSubmitting}
                    className="gta-button gta-button-danger px-8 py-4 text-lg"
                  >
                    {isSubmitting ? (
                      <span className="loading-dots">Initiating Heist</span>
                    ) : (
                      <>
                        <Skull className="w-5 h-5 inline mr-2" />
                        START HEIST ON {selectedTarget.name}
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Compound Stage */}
          {stage === 'compound' && heistData && (
            <motion.div
              key="compound"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="gta-card p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-gta-cyan" />
                  <span className="font-digital text-gta-cyan">COMPOUND BREACH</span>
                </div>
                <span className="text-gray-400 font-mono text-sm">
                  {currentCompound + 1} / {heistData.compoundChallenges.length}
                </span>
              </div>

              {/* Progress */}
              <div className="h-2 bg-gta-dark rounded-full overflow-hidden mb-6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentCompound) / heistData.compoundChallenges.length) * 100}%` }}
                  className="h-full bg-gradient-to-r from-gta-cyan to-gta-purple"
                />
              </div>

              <h3 className="text-xl font-digital text-white mb-6">
                {heistData.compoundChallenges[currentCompound]?.question}
              </h3>

              <form onSubmit={handleCompoundSubmit} className="space-y-4">
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
                  {isSubmitting ? 'Checking...' : 'Submit'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Safe Cracking Stage */}
          {stage === 'safe' && safeChallenge && (
            <motion.div
              key="safe"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="gta-card p-8 heist-alert"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Unlock className="w-5 h-5 text-gta-gold" />
                  <span className="font-digital text-gta-gold">SAFE CRACKING</span>
                </div>
                <span className="text-gta-red font-mono text-sm">
                  {safeAttempts} attempts remaining
                </span>
              </div>

              <h3 className="text-xl font-digital text-white mb-6">
                {safeChallenge.question}
              </h3>

              <form onSubmit={handleSafeSubmit} className="space-y-4">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Enter the code..."
                  className="gta-input text-center text-2xl tracking-widest"
                  disabled={isSubmitting}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !answer.trim()}
                  className="gta-button gta-button-success w-full disabled:opacity-50"
                >
                  {isSubmitting ? 'Cracking...' : 'CRACK SAFE'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Result Stage */}
          {stage === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="gta-card p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                {result.success ? (
                  <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
                ) : (
                  <XCircle className="w-24 h-24 text-gta-red mx-auto mb-6" />
                )}
              </motion.div>
              
              <h2 className={`text-3xl font-digital mb-4 ${result.success ? 'text-green-500' : 'text-gta-red'}`}>
                {result.success ? 'HEIST SUCCESSFUL!' : 'HEIST FAILED!'}
              </h2>
              
              <p className="text-gray-300 font-mono text-lg mb-8">
                {result.message}
              </p>
              
              <button
                onClick={() => navigate('/dashboard')}
                className="gta-button px-8 py-4"
              >
                Return to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
