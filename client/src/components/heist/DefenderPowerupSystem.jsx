import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Snowflake, Zap } from 'lucide-react';

/**
 * Defender power-up system.
 * Displays available power-ups for the defending team during a heist.
 * - Freeze Timer: -30s from attacker timer
 * - Guardian Angel: -25% stolen money
 */
export default function DefenderPowerupSystem({ 
  heistId, 
  wrongAnswerCount, 
  wrongCodeCount,
  onUsePowerup,
  freezeUsed,
  guardianUsed
}) {
  const [activating, setActivating] = useState(null);

  const handleActivate = async (type) => {
    if (activating) return;
    setActivating(type);
    await onUsePowerup(type);
    setTimeout(() => setActivating(null), 1000);
  };

  const powerups = [
    {
      id: 'FREEZE_TIMER',
      name: 'Freeze Timer',
      description: 'Reduce attacker timer by 30 seconds',
      icon: Snowflake,
      color: 'cyan',
      borderColor: 'border-gta-cyan',
      bgColor: 'bg-gta-cyan/10',
      textColor: 'text-gta-cyan',
      shadowColor: 'shadow-gta-cyan/20',
      available: wrongAnswerCount > 0 && !freezeUsed,
      trigger: 'Triggered by wrong compound answer',
      used: freezeUsed
    },
    {
      id: 'GUARDIAN_ANGEL',
      name: 'Guardian Angel',
      description: 'Reduce stolen money by 25%',
      icon: Shield,
      color: 'gold',
      borderColor: 'border-gta-gold',
      bgColor: 'bg-gta-gold/10',
      textColor: 'text-gta-gold',
      shadowColor: 'shadow-gta-gold/20',
      available: wrongCodeCount > 0 && !guardianUsed,
      trigger: 'Triggered by wrong safe code',
      used: guardianUsed
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-gta-gold" />
        <span className="font-digital text-sm text-gta-gold tracking-wider">DEFENDER POWERUPS</span>
      </div>

      {powerups.map(pu => {
        const Icon = pu.icon;
        return (
          <motion.div
            key={pu.id}
            layout
            className={`
              p-3 rounded border transition-all relative overflow-hidden
              ${pu.available 
                ? `${pu.borderColor} ${pu.bgColor} cursor-pointer hover:shadow-lg ${pu.shadowColor}` 
                : pu.used 
                  ? 'border-gray-700 bg-gray-900/50 opacity-50'
                  : 'border-gray-800 bg-gta-dark/50 opacity-30'
              }
            `}
            onClick={() => pu.available && handleActivate(pu.id)}
          >
            {/* Activation flash */}
            <AnimatePresence>
              {activating === pu.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  exit={{ opacity: 0 }}
                  className={`absolute inset-0 ${pu.bgColor}`}
                />
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pu.bgColor} border ${pu.borderColor}/30`}>
                <Icon className={`w-5 h-5 ${pu.textColor}`} />
              </div>
              <div className="flex-1">
                <div className={`font-digital text-sm ${pu.available ? pu.textColor : 'text-gray-500'}`}>
                  {pu.name}
                </div>
                <div className="text-[10px] font-mono text-gray-500">
                  {pu.used ? 'USED' : pu.available ? 'READY' : pu.trigger}
                </div>
              </div>
              {pu.available && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`px-2 py-1 rounded text-xs font-digital ${pu.textColor} ${pu.bgColor} border ${pu.borderColor}/50`}
                >
                  USE
                </motion.div>
              )}
              {pu.used && (
                <span className="text-xs font-mono text-gray-600">ACTIVATED</span>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
