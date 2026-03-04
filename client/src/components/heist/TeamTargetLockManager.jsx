import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Lock, Skull, Users, DollarSign, Shield, Eye, EyeOff } from 'lucide-react';

/**
 * Team target selection with lock system.
 * - Locked teams (being heisted) are greyed out
 * - Other teams' money is hidden ($______)
 * - Only one active heist per target
 */
export default function TeamTargetLockManager({ 
  teams, 
  currentTeamId, 
  targetLocks, 
  onSelectTarget, 
  selectedTarget,
  isSubmitting 
}) {
  const availableTargets = teams.filter(t => t.id !== currentTeamId);

  const isLocked = (teamId) => {
    return targetLocks && targetLocks[teamId];
  };

  const getLockedBy = (teamId) => {
    if (!targetLocks || !targetLocks[teamId]) return null;
    return targetLocks[teamId].attackerId;
  };

  return (
    <div>
      <h2 className="text-xl font-digital text-white mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-gta-red" />
        SELECT TARGET
      </h2>

      {availableTargets.length > 0 ? (
        <div className="grid gap-3">
          <AnimatePresence>
            {availableTargets.map((target, index) => {
              const locked = isLocked(target.id);
              const lockedByMe = locked && getLockedBy(target.id) === currentTeamId;
              const selectable = !locked && !isSubmitting;

              return (
                <motion.div
                  key={target.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => {
                    if (selectable) onSelectTarget(target);
                  }}
                  className={`
                    gta-card p-4 transition-all relative overflow-hidden
                    ${locked && !lockedByMe 
                      ? 'opacity-40 cursor-not-allowed border-gray-800 grayscale' 
                      : selectedTarget?.id === target.id 
                        ? 'border-gta-red ring-2 ring-gta-red/50 cursor-pointer' 
                        : 'hover:border-gta-red/50 cursor-pointer'
                    }
                  `}
                >
                  {/* Lock overlay */}
                  {locked && !lockedByMe && (
                    <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center">
                      <div className="flex items-center gap-2 bg-gta-dark/90 px-4 py-2 rounded border border-gta-red/30">
                        <Lock className="w-4 h-4 text-gta-red" />
                        <span className="text-gta-red font-digital text-sm tracking-wider">TARGET LOCKED</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        locked ? 'bg-gray-800' : 'bg-gradient-to-br from-gta-red to-pink-600'
                      }`}>
                        {locked ? (
                          <Lock className="w-6 h-6 text-gray-500" />
                        ) : (
                          <Skull className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-digital text-white">{target.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${target.isOnline ? 'bg-green-500' : 'bg-gray-600'}`} />
                          <span className="text-gray-500 text-xs font-mono">
                            {target.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {/* Hidden money display */}
                      <div className="flex items-center gap-1 justify-end">
                        <DollarSign className="w-4 h-4 text-gray-600" />
                        <span className="font-digital text-xl text-gray-600 tracking-[4px]">______</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 text-xs font-mono justify-end">
                        <EyeOff className="w-3 h-3" />
                        <span>Balance hidden</span>
                      </div>
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {selectedTarget?.id === target.id && (
                    <motion.div
                      layoutId="target-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gta-red to-transparent"
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="gta-card p-12 text-center">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-digital text-white mb-2">No Targets Available</h3>
          <p className="text-gray-400 font-mono">No other teams to target.</p>
        </div>
      )}
    </div>
  );
}
