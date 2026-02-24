import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react';

/**
 * MissionCard — classified operation file
 * Features: 3D tilt on hover, neon animated border, blueprint texture, "CLASSIFIED" stamp
 */

const RISK_COLORS = {
  Low: { text: 'text-gta-green', border: 'border-gta-green/30', bg: 'bg-gta-green/10' },
  Medium: { text: 'text-gta-gold', border: 'border-gta-gold/30', bg: 'bg-gta-gold/10' },
  High: { text: 'text-gta-red', border: 'border-gta-red/30', bg: 'bg-gta-red/10' },
};

const STATUS_CONFIG = {
  Locked: { icon: Lock, color: 'text-gray-600', label: 'LOCKED' },
  Active: { icon: AlertTriangle, color: 'text-gta-green', label: 'ACTIVE' },
  Completed: { icon: CheckCircle, color: 'text-gta-gold', label: 'COMPLETED' },
};

export default function MissionCard({ mission, index = 0 }) {
  const cardRef = useRef(null);
  const inViewRef = useRef(null);
  const isInView = useInView(inViewRef, { once: true, margin: '-80px' });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const risk = RISK_COLORS[mission.risk] || RISK_COLORS.Low;
  const status = STATUS_CONFIG[mission.status] || STATUS_CONFIG.Locked;
  const StatusIcon = status.icon;

  // 3D tilt based on mouse position over card
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -12, y: x * 12 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div ref={inViewRef}>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: index * 0.12, ease: 'easeOut' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="relative group"
        style={{
          perspective: '1000px',
        }}
      >
        <motion.div
          animate={{
            rotateX: tilt.x,
            rotateY: tilt.y,
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative bg-gta-surface border border-gta-surface-2 rounded-sm overflow-hidden"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Neon animated border glow */}
          <div
            className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              boxShadow: '0 0 15px rgba(0,255,156,0.15), inset 0 0 15px rgba(0,255,156,0.05)',
            }}
          />

          {/* Top neon accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isHovered ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gta-green to-transparent origin-center"
          />

          {/* Blueprint texture background */}
          <div
            className="absolute inset-0 opacity-[0.015] pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,255,156,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,255,156,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />

          {/* Card content */}
          <div className="relative p-5 md:p-6">

            {/* Header: Operation label + Status */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[10px] font-condensed tracking-[3px] uppercase text-gray-600 block mb-1">
                  Operation
                </span>
                <h3 className="font-condensed text-lg md:text-xl text-white uppercase tracking-wider leading-tight">
                  {mission.name}
                </h3>
              </div>
              <div className={`flex items-center gap-1.5 ${status.color}`}>
                <StatusIcon className="w-4 h-4" />
                <span className="text-[10px] font-condensed tracking-[2px] uppercase">
                  {status.label}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-gradient-to-r from-gta-green/20 via-gta-green/10 to-transparent mb-4" />

            {/* Risk + Reward row */}
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-sm text-xs font-condensed tracking-wider uppercase ${risk.text} ${risk.bg} ${risk.border} border`}>
                Risk: {mission.risk}
              </div>
              <div className="font-digital text-gta-green text-base md:text-lg tracking-wider">
                ${mission.reward?.toLocaleString()}
              </div>
            </div>

            {/* Description */}
            {mission.description && (
              <p className="text-gray-500 text-xs font-mono leading-relaxed mt-3">
                {mission.description}
              </p>
            )}
          </div>

          {/* "CLASSIFIED" stamp overlay for locked missions */}
          {mission.status === 'Locked' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="text-4xl md:text-5xl font-gta text-red-500/10 uppercase tracking-widest -rotate-12 select-none"
                style={{
                  textShadow: '0 0 20px rgba(255,59,59,0.05)',
                }}
              >
                CLASSIFIED
              </div>
            </div>
          )}

          {/* Bottom accent */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gta-green/10 to-transparent" />
        </motion.div>
      </motion.div>
    </div>
  );
}
