import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { Users, ArrowLeft, Key, AlertCircle } from 'lucide-react';

export default function TeamLogin() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { loginTeam } = useAuth();
  const { playSound } = useSound();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    playSound('click');

    const result = await loginTeam(accessCode.toUpperCase());
    
    if (result.success) {
      playSound('success');
      navigate('/dashboard');
    } else {
      playSound('error');
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at top, rgba(45,226,166,0.05) 0%, transparent 50%)'
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => { playSound('click'); navigate('/'); }}
          className="flex items-center gap-2 text-gray-500 hover:text-gta-green transition-colors mb-8 font-condensed tracking-wider uppercase text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </motion.button>

        {/* Login Card */}
        <div className="gta-card p-8 border-gta-green/20">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 border-2 border-gta-green rounded-lg flex items-center justify-center mx-auto mb-4"
              style={{ boxShadow: '0 0 30px rgba(45,226,166,0.2)' }}
            >
              <Users className="w-10 h-10 text-gta-green" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-[4px]"
              style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
              TEAM ACCESS
            </h1>
            <p className="text-gray-500 font-condensed text-sm tracking-[2px] uppercase">
              Enter your crew's access code
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gta-green/60" />
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="ACCESS CODE"
                className="gta-input pl-12 text-center text-xl tracking-[0.3em] uppercase"
                maxLength={10}
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-gta-red bg-gta-red/5 border border-gta-red/30 rounded p-3"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-mono text-sm">{error}</span>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || !accessCode}
              className="gta-button w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ripple"
            >
              {isLoading ? (
                <span className="loading-dots">Authenticating</span>
              ) : (
                <>
                  <span>ENTER THE GAME</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-xs font-mono">
              Don't have a code? Contact the event organizers.
            </p>
          </div>

          {/* Bottom divider */}
          <div className="mt-6 pt-6 border-t border-gta-green/10">
            <p className="text-gray-600 text-xs font-condensed text-center tracking-wider uppercase">
              Your access code was provided by the event organizers
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
