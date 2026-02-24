import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * CustomCursor — neon dot with smooth trailing effect
 * Magnetic hover attraction on interactive elements
 * Hidden on mobile / touch devices
 */
export default function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Smooth spring-based trailing
  const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
  const trailX = useSpring(cursorX, springConfig);
  const trailY = useSpring(cursorY, springConfig);

  const magnetRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    cursorX.set(e.clientX);
    cursorY.set(e.clientY);
    if (!isVisible) setIsVisible(true);
  }, [cursorX, cursorY, isVisible]);

  useEffect(() => {
    // Skip on touch devices
    if ('ontouchstart' in window) return;

    window.addEventListener('mousemove', handleMouseMove);
    
    // Magnetic hover detection on buttons & links
    const handleMouseOver = (e) => {
      const target = e.target.closest('button, a, [data-magnetic]');
      if (target) {
        setIsHovering(true);
        magnetRef.current = target;
      }
    };
    const handleMouseOut = (e) => {
      const target = e.target.closest('button, a, [data-magnetic]');
      if (target) {
        setIsHovering(false);
        magnetRef.current = null;
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [handleMouseMove]);

  // Don't render on touch devices
  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null;

  return (
    <>
      {/* Injected CSS to hide native cursor globally */}
      <style>{`
        *, *::before, *::after { cursor: none !important; }
      `}</style>

      {/* Main dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[99999] mix-blend-difference"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        <motion.div
          animate={{
            width: isHovering ? 26 : 7,
            height: isHovering ? 26 : 7,
            opacity: isVisible ? 1 : 0,
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          className="rounded-full bg-gta-green"
          style={{
            boxShadow: isHovering
              ? '0 0 18px rgba(0,255,156,0.55), 0 0 34px rgba(0,255,156,0.25)'
              : '0 0 6px rgba(0,255,156,0.45)',
          }}
        />
      </motion.div>

      {/* Trail ring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[99998]"
        style={{
          x: trailX,
          y: trailY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        <motion.div
          animate={{
            width: isHovering ? 44 : 16,
            height: isHovering ? 44 : 16,
            opacity: isVisible ? (isHovering ? 0.45 : 0.28) : 0,
            borderColor: isHovering
              ? 'rgba(0,255,156,0.55)'
              : 'rgba(0,255,156,0.22)',
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="rounded-full border"
        />
      </motion.div>
    </>
  );
}
