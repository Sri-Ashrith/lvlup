import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Users, Shield } from 'lucide-react';

/**
 * ActionButtons — cinematic CTA buttons with glitch hover + neon pulse
 *  - "ENTER THE UNDERGROUND" → Team Login
 *  - "ACCESS CONTROL ROOM"  → Admin Login
 */

function GlitchButton({ children, icon: Icon, onClick, variant = 'primary', delay = 0 }) {
  const [isGlitching, setIsGlitching] = useState(false);

  const isPrimary = variant === 'primary';

  const handleMouseEnter = () => {
    setIsGlitching(true);
    // Brief glitch flash
    setTimeout(() => setIsGlitching(false), 200);
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onMouseEnter={handleMouseEnter}
      onClick={onClick}
      data-magnetic
      className={`
        group relative overflow-hidden px-10 md:px-14 py-4 md:py-5
        font-condensed text-sm md:text-base tracking-[3px] uppercase
        border-2 rounded-sm transition-all duration-300 ease-in-out
        flex items-center justify-center gap-3
        ${isPrimary
          ? 'border-gta-green text-white hover:text-gta-green hover:shadow-[0_0_30px_rgba(0,255,156,0.3),0_0_60px_rgba(0,255,156,0.1)]'
          : 'border-gta-red text-white hover:text-gta-red hover:shadow-[0_0_30px_rgba(255,59,59,0.3),0_0_60px_rgba(255,59,59,0.1)]'
        }
        bg-gta-surface hover:bg-gta-surface-2
      `}
    >
      {/* Neon pulse outline animation */}
      <span
        className={`
          absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500
          ${isPrimary ? 'animate-pulse-neon' : ''}
        `}
      />

      {/* Sweep highlight on hover */}
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out">
        <span
          className="block w-full h-full"
          style={{
            background: isPrimary
              ? 'linear-gradient(90deg, transparent, rgba(0,255,156,0.08), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255,59,59,0.08), transparent)',
          }}
        />
      </span>

      {/* Glitch flash overlay */}
      {isGlitching && (
        <span className="absolute inset-0 bg-gta-green/5 mix-blend-overlay pointer-events-none" />
      )}

      {/* Content */}
      <Icon className="w-5 h-5 relative z-10" />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

export default function ActionButtons({ onTeamLogin, onAdminLogin }) {
  return (
    <section className="relative py-20 md:py-28 px-4">
      <div className="max-w-3xl mx-auto text-center">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-[11px] font-condensed tracking-[5px] uppercase text-gray-600 mb-10"
        >
          Choose your entry point
        </motion.p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
          <GlitchButton
            icon={Users}
            onClick={onTeamLogin}
            variant="primary"
            delay={0.1}
          >
            Enter the Underground
          </GlitchButton>

          <GlitchButton
            icon={Shield}
            onClick={onAdminLogin}
            variant="danger"
            delay={0.2}
          >
            Access Control Room
          </GlitchButton>
        </div>

        {/* Bottom flicker text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-gray-700 text-xs font-condensed tracking-[0.3em] uppercase animate-text-flicker"
        >
          Press any button to continue
        </motion.p>
      </div>
    </section>
  );
}
