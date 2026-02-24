import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useSound } from '../../context/SoundContext';
import axios from 'axios';
import { 
  ArrowLeft, 
  Trophy,
  Clock,
  DollarSign,
  FileText,
  Upload,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Star
} from 'lucide-react';

export default function Level4Showdown() {
  const navigate = useNavigate();
  const { team, token } = useAuth();
  const { playSound } = useSound();
  
  const [stage, setStage] = useState('problem'); // problem, prepare, present, complete
  const [presentationTime, setPresentationTime] = useState(120); // 2 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [submission, setSubmission] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const problemStatement = {
    title: 'The Grand Showdown',
    description: `Build a creative solution that addresses a real-world problem using technology.
    
You have 30 minutes to prepare your idea and 2 minutes to present it.

Your solution will be judged on:
• Innovation (25 points)
• Technical Feasibility (25 points)
• Impact (25 points)
• Presentation (25 points)

Present your idea clearly and convince the judges why your solution matters.`,
    criteria: ['Innovation', 'Technical Feasibility', 'Impact', 'Presentation']
  };

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && presentationTime > 0) {
      const timer = setInterval(() => {
        setPresentationTime(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playSound('alert');
            return 0;
          }
          // L3-07: Throttle countdown — play at 30, 20, 10, 5, 4, 3, 2, 1
          if (prev === 30 || prev === 20 || prev === 10 || prev <= 5) {
            playSound('countdown');
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTimerRunning, presentationTime, playSound]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!submission.trim()) return;
    setSubmitError('');
    try {
      // L4-01: Send submission to server
      await axios.post('http://localhost:3001/api/level4/submit', 
        { submission: submission.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      playSound('success');
      setSubmitted(true);
      setStage('present');
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit. Try again.');
      playSound('alert');
    }
  };

  const toggleTimer = () => {
    playSound('click');
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    playSound('click');
    setPresentationTime(120);
    setIsTimerRunning(false);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gta-dark/70 border-b border-gta-green/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
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
          <span className="level-badge mb-4 inline-block bg-gradient-to-r from-gta-gold to-orange-500">Final Level</span>
          <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-[3px]" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
            GRAND SHOWDOWN
          </h1>
          <p className="text-gray-500 font-condensed tracking-wider uppercase text-sm">
            Present your solution and claim victory
          </p>
        </motion.div>

        {/* Stages Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          {['problem', 'prepare', 'present'].map((s, index) => (
            <div
              key={s}
              className={`flex items-center gap-2 ${
                stage === s ? 'text-gta-gold' : 'text-gray-500'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-digital ${
                stage === s 
                  ? 'bg-gta-gold text-gta-dark' 
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {index + 1}
              </div>
              <span className="font-mono text-sm capitalize hidden sm:inline">{s}</span>
              {index < 2 && <div className="w-8 h-px bg-gray-600 mx-2" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Problem Statement */}
          {stage === 'problem' && (
            <motion.div
              key="problem"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="gta-card p-8 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6 text-gta-gold" />
                  <h2 className="text-2xl font-digital text-white">{problemStatement.title}</h2>
                </div>
                
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 font-mono whitespace-pre-line leading-relaxed">
                    {problemStatement.description}
                  </p>
                </div>
              </div>

              {/* Scoring Criteria */}
              <div className="gta-card p-6 mb-8">
                <h3 className="text-lg font-digital text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-gta-gold" />
                  Scoring Criteria
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {problemStatement.criteria.map((criterion, index) => (
                    <div key={criterion} className="text-center p-4 bg-gta-dark/50 rounded-lg">
                      <div className="w-12 h-12 bg-gradient-to-br from-gta-gold/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-gta-gold font-digital text-lg">25</span>
                      </div>
                      <p className="text-gray-300 font-mono text-sm">{criterion}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => { playSound('click'); setStage('prepare'); }}
                  className="gta-button px-8 py-4"
                >
                  Start Preparing
                </button>
              </div>
            </motion.div>
          )}

          {/* Preparation Stage */}
          {stage === 'prepare' && (
            <motion.div
              key="prepare"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="gta-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Upload className="w-6 h-6 text-gta-cyan" />
                  <h2 className="text-2xl font-digital text-white">Submit Your Idea</h2>
                </div>

                <p className="text-gray-400 font-mono mb-6">
                  Describe your solution in detail. Include the problem you're solving, 
                  your approach, and the expected impact.
                </p>

                <textarea
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                  placeholder="Describe your innovative solution..."
                  className="gta-input min-h-[200px] resize-y mb-6"
                  disabled={submitted}
                />

                {!submitted ? (
                  <>
                    {submitError && (
                      <p className="text-gta-red font-mono text-sm mb-4">{submitError}</p>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={!submission.trim()}
                      className="gta-button gta-button-success w-full py-4 disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5 inline mr-2" />
                      Submit Solution
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-green-500 font-digital text-xl mb-4">Submission Complete!</p>
                    <button
                      onClick={() => setStage('present')}
                      className="gta-button"
                    >
                      Proceed to Presentation
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Presentation Stage */}
          {stage === 'present' && (
            <motion.div
              key="present"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Timer Card */}
              <div className="gta-card p-8 text-center mb-8">
                <h2 className="text-xl font-digital text-white mb-6 flex items-center justify-center gap-2">
                  <Clock className="w-6 h-6 text-gta-cyan" />
                  Presentation Timer
                </h2>

                <div className={`text-7xl md:text-9xl font-digital mb-8 ${
                  presentationTime <= 30 ? 'text-gta-red timer-warning' : 'text-gta-cyan'
                }`}>
                  {formatTime(presentationTime)}
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={toggleTimer}
                    className={`gta-button px-8 py-4 ${isTimerRunning ? 'gta-button-danger' : 'gta-button-success'}`}
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="w-5 h-5 inline mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 inline mr-2" />
                        {presentationTime === 120 ? 'Start' : 'Resume'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetTimer}
                    className="gta-button"
                  >
                    <RotateCcw className="w-5 h-5 inline mr-2" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Submission Preview */}
              <div className="gta-card p-6 mb-8">
                <h3 className="text-lg font-digital text-white mb-4">Your Submission</h3>
                <p className="text-gray-300 font-mono whitespace-pre-line">{submission}</p>
              </div>

              {/* Tips */}
              <div className="gta-card p-6 border-gta-gold/30 bg-gta-gold/5">
                <h3 className="text-lg font-digital text-gta-gold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Presentation Tips
                </h3>
                <ul className="space-y-2 text-gray-300 font-mono text-sm">
                  <li>• Start with the problem you're solving</li>
                  <li>• Explain your solution clearly and concisely</li>
                  <li>• Highlight the technical aspects</li>
                  <li>• End with the potential impact</li>
                </ul>
              </div>

              {/* Complete Button */}
              <div className="text-center mt-8">
                <button
                  onClick={() => { playSound('success'); setStage('complete'); }}
                  className="gta-button gta-button-success px-8 py-4"
                >
                  <Trophy className="w-5 h-5 inline mr-2" />
                  Complete Presentation
                </button>
              </div>
            </motion.div>
          )}

          {/* Completion Stage */}
          {stage === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="gta-card p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <Trophy className="w-24 h-24 text-gta-gold mx-auto mb-6" />
              </motion.div>
              
              <h2 className="text-3xl font-digital text-gta-gold mb-4">
                PRESENTATION COMPLETE!
              </h2>
              
              <p className="text-gray-300 font-mono text-lg mb-8">
                Your presentation has been recorded. The judges will score your solution and the results will be announced shortly.
              </p>

              <p className="text-gray-500 font-mono text-sm mb-8">
                Scores will be added to your cash balance based on judge evaluation.
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
