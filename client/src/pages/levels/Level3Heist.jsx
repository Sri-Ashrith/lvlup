import { useState, useEffect, useCallback } from 'react';
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
  Users,
  Zap
} from 'lucide-react';

// Heist components
import TeamTargetLockManager from '../../components/heist/TeamTargetLockManager';
import HeistTimer from '../../components/heist/HeistTimer';
import CompoundStage from '../../components/heist/CompoundStage';
import SafeCrackStage from '../../components/heist/SafeCrackStage';
import DefenderPowerupSystem from '../../components/heist/DefenderPowerupSystem';
import MoneyPercentageMeter from '../../components/heist/MoneyPercentageMeter';
import HackerTypewriter from '../../components/heist/HackerTypewriter';
import LevelTimer from '../../components/LevelTimer';

export default function Level3Heist() {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { 
    leaderboard, 
    initiateHeist, 
    submitCompoundAnswer, 
    submitSafeAnswer,
    fetchHeistLocks,
    useDefenderPowerup,
    targetLocks,
    defenderHeistEvents,
    clearDefenderHeistEvents,
    heistAlert,
    eventConfig
  } = useGame();
  const { playSound } = useSound();

  // Redirect to dashboard if this level is locked
  useEffect(() => {
    if (eventConfig.currentLevel !== 3) {
      navigate('/dashboard');
    }
  }, [eventConfig.currentLevel, navigate]);
  
  // Core state
  const [stage, setStage] = useState('select'); // select, compound, breached, safe, result, defending
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [heistData, setHeistData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Compound stage state
  const [compoundChallenges, setCompoundChallenges] = useState([]);
  const [currentCompoundIndex, setCurrentCompoundIndex] = useState(0);
  const [compoundProgress, setCompoundProgress] = useState(0);
  const [compoundWrongCount, setCompoundWrongCount] = useState(0);
  
  // Safe stage state (new puzzle-based system)
  const [safePuzzles, setSafePuzzles] = useState([]);      // 4 puzzle objects { id, code }
  const [safeHint, setSafeHint] = useState('?');            // revealed last character
  const [safeHintIndex, setSafeHintIndex] = useState(3);    // hint position (always 3)
  const [safeAttempts, setSafeAttempts] = useState(6);     // attempts remaining
  const [safeMaxAttempts, setSafeMaxAttempts] = useState(6);
  const [safeSuccess, setSafeSuccess] = useState(false);
  
  // Result
  const [result, setResult] = useState(null);
  
  // Defender state
  const [defenderWrongAnswers, setDefenderWrongAnswers] = useState(0);
  const [defenderWrongCodes, setDefenderWrongCodes] = useState(0);
  const [freezeUsed, setFreezeUsed] = useState(false);
  const [guardianUsed, setGuardianUsed] = useState(false);

  // Fetch target locks on mount and periodically
  useEffect(() => {
    fetchHeistLocks();
    const interval = setInterval(fetchHeistLocks, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check if this team is being attacked (defending mode)
  useEffect(() => {
    if (heistAlert && stage === 'select') {
      setStage('defending');
    }
  }, [heistAlert]);

  // Track defender events
  useEffect(() => {
    const wrongAnswers = defenderHeistEvents.filter(e => e.type === 'wrongAnswer').length;
    const wrongCodes = defenderHeistEvents.filter(e => e.type === 'wrongCode').length;
    setDefenderWrongAnswers(wrongAnswers);
    setDefenderWrongCodes(wrongCodes);
  }, [defenderHeistEvents]);

  // Handle time up
  const handleTimeUp = useCallback(() => {
    playSound('error');
    setResult({ success: false, message: "Time's up! The heist has failed." });
    setStage('result');
  }, [playSound]);

  // Target selection
  const handleSelectTarget = (target) => {
    playSound('click');
    setSelectedTarget(target);
  };

  // Start heist
  const startHeist = async () => {
    if (!selectedTarget) return;
    
    playSound('heist');
    setIsSubmitting(true);
    
    const response = await initiateHeist(selectedTarget.id);
    
    if (response.blocked) {
      playSound('error');
      setResult({ success: false, message: response.message });
      setStage('result');
    } else if (response.locked) {
      playSound('error');
      setResult({ success: false, message: 'Target is locked — another team is already heisting them!' });
      setStage('result');
    } else if (response.error) {
      playSound('error');
      setResult({ success: false, message: response.error });
      setStage('result');
    } else if (response.heistId) {
      setHeistData({
        heistId: response.heistId,
        timeLimit: response.timeLimit,
        startTime: Date.now()
      });
      setCompoundChallenges(response.compoundChallenges || []);
      setCurrentCompoundIndex(0);
      setCompoundProgress(0);
      setCompoundWrongCount(0);
      setStage('compound');
    }
    
    setIsSubmitting(false);
  };

  // Submit compound answer
  const handleCompoundSubmit = async (challengeId, answer) => {
    if (!answer.trim() || isSubmitting) return;
    
    playSound('click');
    setIsSubmitting(true);
    
    try {
      const response = await submitCompoundAnswer(heistData.heistId, challengeId, answer);
      
      if (response.heistFailed) {
        playSound('error');
        setResult({ 
          success: false, 
          message: response.message || '3 wrong answers! Heist failed!',
          transferAmount: response.transferAmount
        });
        setStage('result');
      } else if (response.correct) {
        playSound('success');
        setCompoundProgress(prev => prev + 1);
        
        if (response.stageComplete) {
          // Store safe data and transition to breached interstitial
          const sc = response.safeChallenge;
          setSafePuzzles(sc?.puzzles || []);
          setSafeHint(sc?.hint || '?');
          setSafeHintIndex(sc?.hintIndex ?? 3);
          setSafeAttempts(sc?.maxAttempts || 6);
          setSafeMaxAttempts(sc?.maxAttempts || 6);
          setSafeSuccess(false);
          setStage('breached');
        } else {
          setCurrentCompoundIndex(prev => prev + 1);
        }
      } else {
        playSound('error');
        setCompoundWrongCount(response.wrongCount || (compoundWrongCount + 1));
      }
    } catch (err) {
      console.error('Compound submit error:', err);
      playSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit safe code
  const handleSafeSubmit = async (code) => {
    if (!code || isSubmitting) return;
    
    playSound('click');
    setIsSubmitting(true);
    
    try {
      const response = await submitSafeAnswer(heistData.heistId, code);
      
      if (response.heistSuccess === true) {
        playSound('cash');
        setSafeSuccess(true);
        setTimeout(() => {
          setResult({ 
            success: true, 
            message: `Heist successful! You stole $${response.stolenAmount?.toLocaleString()}!`,
            stolenAmount: response.stolenAmount,
            moneyPercent: response.moneyPercent
          });
          setStage('result');
        }, 1500);
      } else if (response.heistSuccess === false) {
        playSound('error');
        setResult({ 
          success: false, 
          message: `Heist failed! You lost $${response.transferAmount?.toLocaleString()} to the defender.`,
          transferAmount: response.transferAmount
        });
        setStage('result');
      } else {
        playSound('error');
        setSafeAttempts(response.attemptsRemaining || (safeAttempts - 1));
      }
    } catch (err) {
      console.error('Safe submit error:', err);
      playSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Defender powerup usage
  const handleDefenderPowerup = async (type) => {
    const response = await useDefenderPowerup(type);
    if (response.success) {
      playSound('powerup');
      if (type === 'FREEZE_TIMER') setFreezeUsed(true);
      if (type === 'GUARDIAN_ANGEL') setGuardianUsed(true);
    }
  };

  // Reset for new heist
  const resetHeist = () => {
    setStage('select');
    setSelectedTarget(null);
    setHeistData(null);
    setCompoundChallenges([]);
    setCurrentCompoundIndex(0);
    setCompoundProgress(0);
    setCompoundWrongCount(0);
    setSafePuzzles([]);
    setSafeHint('?');
    setSafeHintIndex(3);
    setSafeAttempts(6);
    setSafeMaxAttempts(6);
    setSafeSuccess(false);
    setResult(null);
    setDefenderWrongAnswers(0);
    setDefenderWrongCodes(0);
    setFreezeUsed(false);
    setGuardianUsed(false);
    clearDefenderHeistEvents();
  };

  const isInHeist = stage === 'compound' || stage === 'breached' || stage === 'safe';

  return (
    <div className="min-h-screen pb-24">
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
                isInHeist ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-4">
              <LevelTimer levelNumber={3} />
              {isInHeist && heistData && (
                <MoneyPercentageMeter startTime={heistData.startTime} compact />
              )}
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gta-gold" />
                <span className="cash-display text-xl">${team?.cash?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
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
            {stage === 'compound' && 'Stage 1: Enter the Compound — Answer questions to breach security'}
            {stage === 'breached' && 'Stage 1 Complete — Compound Breached'}
            {stage === 'safe' && 'Stage 2: Crack the Safe — Solve the puzzles and enter the code'}
            {stage === 'result' && 'Heist Complete'}
            {stage === 'defending' && 'Your vault is under attack!'}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* TARGET SELECTION */}
          {stage === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Warning */}
              <div className="gta-card p-4 mb-8 border-gta-red/30 bg-gta-red/5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-gta-red flex-shrink-0" />
                  <p className="text-gta-red font-mono text-sm">
                    Warning: If your heist fails, you'll lose 30% of your cash to the defender!
                  </p>
                </div>
              </div>

              <TeamTargetLockManager
                teams={leaderboard}
                currentTeamId={team?.id}
                targetLocks={targetLocks}
                onSelectTarget={handleSelectTarget}
                selectedTarget={selectedTarget}
                isSubmitting={isSubmitting}
              />

              {selectedTarget && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mt-8"
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

          {/* COMPOUND STAGE */}
          {stage === 'compound' && heistData && (
            <motion.div
              key="compound"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CompoundStage
                challenges={compoundChallenges}
                currentIndex={currentCompoundIndex}
                progress={compoundProgress}
                wrongCount={compoundWrongCount}
                onSubmit={handleCompoundSubmit}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          )}

          {/* BREACHED TRANSITION */}
          {stage === 'breached' && (
            <motion.div
              key="breached"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto text-center"
            >
              <div className="gta-card p-10 border-gta-green/30 bg-gta-green/5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                >
                  <Unlock className="w-20 h-20 text-gta-green mx-auto mb-6" />
                </motion.div>

                <HackerTypewriter
                  lines={[
                    { text: '> COMPOUND BREACHED!', className: 'text-3xl font-digital text-gta-green mb-3 uppercase tracking-wider', delay: 400 },
                    { text: "> You've made it through the security compound.", className: 'text-gray-400 font-mono text-sm mb-2', delay: 1200 },
                    { text: '> Now crack the safe to steal the money.', className: 'text-gray-300 font-mono text-base mb-1', delay: 2400 },
                    { text: '> Solve the pseudo-code puzzles to discover the 4-character safe code.', className: 'text-gray-300 font-mono text-base mb-8', delay: 3600 },
                  ]}
                  charSpeed={30}
                  onComplete={() => {}}
                />

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 6.5 }}
                  onClick={() => { playSound('click'); setStage('safe'); }}
                  className="gta-button px-8 py-4 text-lg"
                >
                  <Lock className="w-5 h-5 inline mr-2" />
                  Proceed to Stage 2 — Crack the Safe
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* SAFE CRACKING STAGE */}
          {stage === 'safe' && safePuzzles.length > 0 && (
            <motion.div
              key="safe"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SafeCrackStage
                puzzles={safePuzzles}
                hint={safeHint}
                hintIndex={safeHintIndex}
                attemptsRemaining={safeAttempts}
                maxAttempts={safeMaxAttempts}
                onSubmit={handleSafeSubmit}
                isSubmitting={isSubmitting}
                success={safeSuccess}
              />
            </motion.div>
          )}

          {/* DEFENDING MODE */}
          {stage === 'defending' && (
            <motion.div
              key="defending"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-lg mx-auto"
            >
              <div className="gta-card p-8 heist-alert text-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Shield className="w-16 h-16 text-gta-red mx-auto mb-4" />
                </motion.div>
                <h2 className="text-2xl font-digital text-gta-red mb-2">VAULT UNDER ATTACK!</h2>
                <p className="text-gray-400 font-mono text-sm mb-4">
                  {heistAlert?.attackerName} is attempting to rob your team.
                </p>
                <p className="text-gray-500 font-mono text-xs">
                  Use power-ups below to defend your vault.
                </p>
              </div>

              <DefenderPowerupSystem
                wrongAnswerCount={defenderWrongAnswers}
                wrongCodeCount={defenderWrongCodes}
                onUsePowerup={handleDefenderPowerup}
                freezeUsed={freezeUsed}
                guardianUsed={guardianUsed}
              />

              <div className="mt-6 text-center">
                <button
                  onClick={() => setStage('select')}
                  className="gta-button px-6 py-3"
                >
                  Return to Target Select
                </button>
              </div>
            </motion.div>
          )}

          {/* RESULT */}
          {stage === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="gta-card p-12 text-center max-w-lg mx-auto"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                {result.success ? (
                  <div className="relative">
                    <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.5, 0] }}
                      transition={{ repeat: 3, duration: 0.6 }}
                      className="absolute inset-0 bg-green-500/10 rounded-full"
                    />
                  </div>
                ) : (
                  <XCircle className="w-24 h-24 text-gta-red mx-auto mb-6" />
                )}
              </motion.div>
              
              <h2 className={`text-3xl font-digital mb-4 ${result.success ? 'text-green-500' : 'text-gta-red'}`}>
                {result.success ? 'HEIST SUCCESSFUL!' : 'HEIST FAILED!'}
              </h2>
              
              <p className="text-gray-300 font-mono text-lg mb-4">
                {result.message}
              </p>

              {result.moneyPercent && (
                <p className="text-gray-500 font-mono text-sm mb-2">
                  Money percentage at completion: {result.moneyPercent}%
                </p>
              )}

              {result.transferAmount && (
                <p className="text-gta-red font-mono text-sm mb-4">
                  Penalty: -${result.transferAmount.toLocaleString()} transferred to defender
                </p>
              )}
              
              <div className="flex gap-3 justify-center mt-8">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="gta-button gta-button-danger px-6 py-3"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* GLOBAL HEIST TIMER & MONEY METER (bottom center) */}
      {isInHeist && heistData && (
        <HeistTimer
          startTime={heistData.startTime}
          timeLimit={heistData.timeLimit}
          levelEndTime={
            eventConfig?.levelStartTime && eventConfig?.levelTimers?.[3]
              ? eventConfig.levelStartTime + eventConfig.levelTimers[3] * 1000
              : null
          }
          onTimeUp={handleTimeUp}
        />
      )}
    </div>
  );
}
