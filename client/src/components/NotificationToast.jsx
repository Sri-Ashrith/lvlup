import { motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, DollarSign } from 'lucide-react';

const NOTIFICATION_STYLES = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-500',
    iconColor: 'text-green-500'
  },
  danger: {
    icon: AlertCircle,
    bgColor: 'bg-gta-red/10',
    borderColor: 'border-gta-red/30',
    textColor: 'text-gta-red',
    iconColor: 'text-gta-red'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-500',
    iconColor: 'text-yellow-500'
  },
  info: {
    icon: Info,
    bgColor: 'bg-gta-green/10',
    borderColor: 'border-gta-green/30',
    textColor: 'text-gta-green',
    iconColor: 'text-gta-green'
  },
  cash: {
    icon: DollarSign,
    bgColor: 'bg-gta-yellow/10',
    borderColor: 'border-gta-yellow/30',
    textColor: 'text-gta-yellow',
    iconColor: 'text-gta-yellow'
  }
};

export default function NotificationToast({ notification, onClose }) {
  const style = NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.info;
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -50, x: '-50%' }}
      className={`fixed top-4 left-1/2 z-50 ${style.bgColor} ${style.borderColor} border rounded-lg p-4 shadow-lg backdrop-blur-md max-w-md w-full mx-4`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
        <p className={`flex-1 font-mono text-sm ${style.textColor}`}>
          {notification.message}
        </p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
