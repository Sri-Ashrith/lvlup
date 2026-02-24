import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { Shield, ArrowLeft, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const { playSound } = useSound();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    playSound('click');

    try {
      const sanitizedPassword = password.trim();
      const result = await loginAdmin(sanitizedPassword);
      
      if (result.success) {
        playSound('success');
        navigate('/admin');
      } else {
        playSound('error');
        setError(result.error);
      }
    } catch {
      playSound('error');
      setError('Unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Red ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at top, rgba(251,113,133,0.05) 0%, transparent 50%)'
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
          className="flex items-center gap-2 text-gray-500 hover:text-gta-red transition-colors mb-8 font-condensed tracking-wider uppercase text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </motion.button>

        {/* Login Card */}
        <div className="gta-card p-8 border-gta-red/20">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 border-2 border-gta-red rounded-lg flex items-center justify-center mx-auto mb-4"
              style={{ boxShadow: '0 0 30px rgba(251,113,133,0.2)' }}
            >
              <Shield className="w-10 h-10 text-gta-red" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-[4px]"
              style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
              ADMIN ACCESS
            </h1>
            <p className="text-gray-500 font-condensed text-sm tracking-[2px] uppercase">
              Authorized personnel only
            </p>
          </div>

          {/* Warning banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gta-red/5 border border-gta-red/20 rounded p-3 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-gta-red flex-shrink-0" />
            <p className="text-gta-red text-xs font-condensed tracking-wider uppercase">
              Restricted Area • All access attempts are logged
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gta-red/60" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ADMIN PASSWORD"
                className="gta-input pl-12 pr-12"
                style={{ borderColor: 'rgba(251,113,133,0.3)' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gta-red/40 hover:text-gta-red transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
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
              disabled={isLoading || !password.trim()}
              className="gta-button gta-button-danger w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ripple"
            >
              {isLoading ? (
                <span className="loading-dots">Verifying</span>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>ACCESS CONTROL PANEL</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Contact organizer for access */}
          <div className="mt-6 pt-6 border-t border-gta-red/10">
            <p className="text-gray-600 text-xs font-condensed text-center tracking-wider uppercase">
              Contact event organizers for admin credentials
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
