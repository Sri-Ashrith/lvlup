import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GTALoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0); // 0: black, 1: logo, 2: loading, 3: fade out
  const [loadingText, setLoadingText] = useState('INITIALIZING MISSION');

  const loadingMessages = [
    'INITIALIZING MISSION',
    'LOADING ARSENAL',
    'CONNECTING TO HQ',
    'DEPLOYING AGENTS',
    'SYNCHRONIZING DATA',
    'MISSION READY',
  ];

  useEffect(() => {
    // Phase 0 -> 1: Show logo after a brief black screen
    const t1 = setTimeout(() => setPhase(1), 300);
    // Phase 1 -> 2: Show loading after logo appears
    const t2 = setTimeout(() => setPhase(2), 800);
    // Phase 2 -> 3: Start fade out
    const t3 = setTimeout(() => setPhase(3), 2800);
    // Complete
    const t4 = setTimeout(() => onComplete?.(), 3400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  // Cycle through loading messages
  useEffect(() => {
    if (phase < 2) return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % loadingMessages.length;
      setLoadingText(loadingMessages[i]);
    }, 400);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
          style={{ background: '#050505' }}
        >
          {/* Subtle ambient glow */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, rgba(0,255,156,0.12) 0%, transparent 70%)' }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-10"
              style={{ background: 'linear-gradient(0deg, rgba(0,255,156,0.08), transparent)' }}
            />
          </div>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
            animate={phase >= 1 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative z-10 text-center"
          >
            {/* Top decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={phase >= 1 ? { scaleX: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="w-48 h-[2px] mx-auto mb-6"
              style={{ background: 'linear-gradient(90deg, transparent, #00FF9C, transparent)' }}
            />

            {/* Main title */}
            <h1
              className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-wider"
              style={{
                fontFamily: "'Pricedown', 'Impact', 'Arial Black', sans-serif",
                color: '#FFFFFF',
                textShadow: '0 0 30px rgba(0,255,156,0.4), 0 0 60px rgba(0,255,156,0.2), 0 2px 0 rgba(0,0,0,0.8)',
                letterSpacing: '4px'
              }}
            >
              <span className="block" style={{
                background: 'linear-gradient(180deg, #00FF9C, #00CC7A)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(0,255,156,0.5))'
              }}>
                LEVEL UP
              </span>
            </h1>

            {/* Bottom decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={phase >= 1 ? { scaleX: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="w-48 h-[2px] mx-auto mt-6"
              style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}
            />

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mt-4 text-sm tracking-[0.5em] uppercase"
              style={{
                fontFamily: "'Oswald', 'Impact', sans-serif",
                color: '#D4AF37',
                textShadow: '0 0 10px rgba(212,175,55,0.3)'
              }}
            >
              Execute. Upgrade. Dominate.
            </motion.p>
          </motion.div>

          {/* Loading section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6"
          >
            {/* Circular loader */}
            <div className="relative w-12 h-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: '#00FF9C',
                  borderRightColor: 'rgba(0,255,156,0.3)',
                }}
              />
              <div className="absolute inset-2 rounded-full border border-[#00FF9C]/20" />
            </div>

            {/* Loading text */}
            <motion.p
              key={loadingText}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs tracking-[0.4em] uppercase"
              style={{
                fontFamily: "'Oswald', 'Impact', sans-serif",
                color: '#999999',
              }}
            >
              {loadingText}...
            </motion.p>
          </motion.div>

          {/* Bottom branding */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 0.3 } : {}}
            className="absolute bottom-6 text-center"
          >
            <p className="text-[10px] tracking-[0.3em] uppercase"
              style={{ fontFamily: "'Oswald', sans-serif", color: '#666' }}>
              LEVEL UP • 2026
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
