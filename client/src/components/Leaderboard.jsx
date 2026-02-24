import { motion } from 'framer-motion';
import { DollarSign, Wifi, WifiOff, Skull, Crown } from 'lucide-react';

export default function Leaderboard({ data, currentTeamId, compact = false }) {
  const getRankStyle = (rank) => {
    switch (rank) {
      case 1: return 'leaderboard-rank-1';
      case 2: return 'leaderboard-rank-2';
      case 3: return 'leaderboard-rank-3';
      default: return '';
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-gta-yellow" />;
    if (rank === 2) return <Crown className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Crown className="w-5 h-5 text-amber-700" />;
    return <span className="text-gray-600 font-condensed text-sm tracking-wider">#{rank}</span>;
  };

  return (
    <div className="space-y-2">
      {data.map((team, index) => {
        const rank = index + 1;
        const isCurrentTeam = team.id === currentTeamId;
        
        return (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              leaderboard-row p-3 md:p-4 rounded-lg flex items-center justify-between
              ${getRankStyle(rank)}
              ${isCurrentTeam ? 'bg-gta-green/10 border border-gta-green/30' : 'bg-gta-dark/50'}
            `}
          >
            <div className="flex items-center gap-3 md:gap-4">
              {/* Rank */}
              <div className="w-8 h-8 flex items-center justify-center">
                {getRankIcon(rank)}
              </div>
              
              {/* Team Info */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${team.isOnline ? 'bg-gta-green' : 'bg-gray-700'}`} />
                <div>
                  <p className={`font-condensed text-sm md:text-base uppercase tracking-wider ${isCurrentTeam ? 'text-gta-green' : 'text-white'}`}>
                    {team.name}
                    {isCurrentTeam && <span className="text-gta-green ml-2 text-xs">(You)</span>}
                  </p>
                  {!compact && (
                    <p className="text-gray-500 text-xs font-mono">
                      Level {team.currentLevel}
                      {team.heistStatus !== 'none' && (
                        <span className="ml-2 text-gta-red">
                          • {team.heistStatus === 'attacking' ? '⚔️ Attacking' : '🛡️ Defending'}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Cash */}
            <div className="flex items-center gap-1 cash-display text-lg md:text-xl">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
              <span>{team.cash.toLocaleString()}</span>
            </div>
          </motion.div>
        );
      })}
      
      {data.length === 0 && (
        <div className="text-center py-8">
          <Skull className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 font-mono">No teams yet</p>
        </div>
      )}
    </div>
  );
}
