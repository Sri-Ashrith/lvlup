import { motion } from 'framer-motion';
import { Shield, Zap, Clock, Eye, DollarSign } from 'lucide-react';

const POWER_UP_ICONS = {
  GUARDIAN_ANGEL: Shield,
  DOUBLE_CASH: DollarSign,
  SHIELD: Shield,
  HINT_MASTER: Eye,
  TIME_FREEZE: Clock,
};

const POWER_UP_COLORS = {
  GUARDIAN_ANGEL: 'from-blue-500 to-cyan-500',
  DOUBLE_CASH: 'from-green-500 to-emerald-500',
  SHIELD: 'from-purple-500 to-pink-500',
  HINT_MASTER: 'from-yellow-500 to-orange-500',
  TIME_FREEZE: 'from-cyan-500 to-blue-500',
};

export default function PowerUpCard({ powerUp, onUse, showUseButton = false }) {
  const Icon = POWER_UP_ICONS[powerUp.id] || Zap;
  const gradientColors = POWER_UP_COLORS[powerUp.id] || 'from-gta-green to-emerald-500';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="powerup-card flex items-center gap-4"
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${gradientColors} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-condensed text-sm truncate uppercase tracking-wider">
          {powerUp.name}
        </h4>
        <p className="text-gray-400 text-xs font-mono line-clamp-2">
          {powerUp.description}
        </p>
      </div>
      {showUseButton && onUse && (
        <button
          onClick={() => onUse(powerUp)}
          className="gta-button text-xs py-2 px-3"
        >
          USE
        </button>
      )}
    </motion.div>
  );
}
