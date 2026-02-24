import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/**
 * HeroSection — cinematic GTA V-style hero
 * Features:
 *  - Parallax background on mouse move
 *  - Animated fog/smoke layers
 *  - Neon edge-glow pulsing title
 *  - Grain overlay
 *  - Scroll-driven fade-out
 */

const TAGLINE = 'PLAN THE HEIST. RUN THE CITY. OWN THE GAME.';

export default function HeroSection() {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Parallax based on mouse position
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX / width - 0.5) * 2;   // -1 → 1
    const y = (e.clientY / height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Scroll-driven opacity
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 0.95]);

  return (
    <motion.section
      ref={containerRef}
      style={{ opacity: heroOpacity, scale: heroScale }}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      {/* === BACKGROUND LAYERS === */}

      {/* Dark gradient base */}
      <div className="absolute inset-0 bg-gta-hero" />

      {/* Parallax grid overlay */}
      <motion.div
        className="absolute inset-0 grid-bg opacity-30"
        style={{
          transform: `translate(${mousePos.x * -8}px, ${mousePos.y * -8}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      />

      {/* Fog / smoke layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute bottom-0 left-0 right-0 h-[60%] animate-smoke opacity-20"
          style={{
            background: 'radial-gradient(ellipse at 30% 100%, rgba(0,255,156,0.06) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-[50%] animate-smoke opacity-15"
          style={{
            background: 'radial-gradient(ellipse at 70% 100%, rgba(0,255,156,0.04) 0%, transparent 55%)',
            animationDelay: '5s',
          }}
        />
      </div>

      {/* Noise/grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />

      {/* Scanline */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute left-0 right-0 h-[2px] bg-gta-green/5 animate-scanline"
        />
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(2,2,2,0.85) 100%)',
        }}
      />

      {/* Central neon glow blob (parallax) */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full animate-neon-pulse pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,255,156,0.12) 0%, transparent 70%)',
          transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`,
          transition: 'transform 0.4s ease-out',
        }}
      />

      {/* === CONTENT === */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">

        {/* Decorative top line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-40 h-[2px] mx-auto mb-10"
          style={{ background: 'linear-gradient(90deg, transparent, #00FF9C, transparent)' }}
        />

        {/* Logo */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, filter: 'blur(20px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, delay: 0.4, ease: 'easeOut' }}
          className="mb-4"
        >
          <img
            src="/Logo.png"
            alt="LEVEL UP"
            className="w-[260px] md:w-[380px] lg:w-[480px] mx-auto"
            style={{
              filter: 'drop-shadow(0 0 40px rgba(0,255,156,0.25)) drop-shadow(0 4px 0 rgba(0,0,0,0.9))',
            }}
          />
        </motion.div>

        {/* 3D LEVEL UP heading */}
        <motion.h1
          initial={{ opacity: 0, y: 40, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="font-gta text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wider mb-6 relative"
          style={{
            color: '#fff',
            textShadow: `
              0 0 10px rgba(0,255,156,0.5),
              0 0 30px rgba(0,255,156,0.3),
              0 0 60px rgba(0,255,156,0.15),
              0 4px 0 #0A1A12,
              0 6px 0 #050D09,
              0 8px 20px rgba(0,0,0,0.8)
            `,
            WebkitTextStroke: '1px rgba(0,255,156,0.15)',
          }}
        >
          LEVEL UP
        </motion.h1>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <div className="h-[1px] w-12 md:w-20 bg-gradient-to-r from-transparent to-gta-green/60" />
          <p className="text-sm md:text-base lg:text-lg font-condensed tracking-[0.35em] uppercase text-gta-green/80">
            {TAGLINE}
          </p>
          <div className="h-[1px] w-12 md:w-20 bg-gradient-to-l from-transparent to-gta-green/60" />
        </motion.div>

        {/* Sub-description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto font-mono leading-relaxed"
        >
          Enter the underground. Complete challenges. Execute heists.
          <br className="hidden md:block" />
          <span className="text-gta-green/70">Only the ruthless will survive.</span>
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] font-condensed tracking-[0.3em] uppercase text-gray-600">
          Scroll down
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-[1px] h-6 bg-gradient-to-b from-gta-green/50 to-transparent"
        />
      </motion.div>
    </motion.section>
  );
}
