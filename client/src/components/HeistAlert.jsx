import { motion } from 'framer-motion';
import { AlertTriangle, Shield, X, Skull } from 'lucide-react';

export default function HeistAlert({ alert, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className="gta-card p-8 max-w-md w-full heist-alert text-center"
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
        >
          <AlertTriangle className="w-20 h-20 text-gta-red mx-auto mb-4" />
        </motion.div>
        
        <h2 className="text-3xl font-bold text-gta-red mb-2 glitch uppercase tracking-[3px]" data-text="HEIST ALERT"
          style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>
          HEIST ALERT
        </h2>
        
        <p className="text-xl text-white font-mono mb-4">
          <span className="text-gta-red">{alert.attackerName}</span> is attempting to breach your vault!
        </p>
        
        <div className="bg-gta-red/20 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-gta-red">
            <Skull className="w-5 h-5" />
            <span className="font-mono text-sm">
              Your defenses are being tested. If they succeed, you'll lose 50% of your cash!
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-gray-400 mb-6">
          <Shield className="w-5 h-5" />
          <span className="font-mono text-sm">
            Power-ups are automatically activated
          </span>
        </div>
        
        <button
          onClick={onClose}
          className="gta-button w-full py-3"
        >
          <X className="w-5 h-5 inline mr-2" />
          ACKNOWLEDGE
        </button>
      </motion.div>
    </motion.div>
  );
}
