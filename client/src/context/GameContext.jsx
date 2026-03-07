import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const GameContext = createContext(null);

const configuredApiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE_URL = import.meta.env.DEV
  ? (configuredApiBase || 'http://localhost:3001')
  : configuredApiBase;
const API_URL = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

export function GameProvider({ children }) {
  const { socket, team, updateTeam, token } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [heistAlert, setHeistAlert] = useState(null);
  const [notification, setNotification] = useState(null);
  const [teamProgress, setTeamProgress] = useState(null);
  const [targetLocks, setTargetLocks] = useState({}); // targetTeamId -> { attackerId, heistId }
  const [defenderHeistEvents, setDefenderHeistEvents] = useState([]); // wrong answer/code events for defender
  const [fullscreenDisqualified, setFullscreenDisqualified] = useState(false);
  const [eventConfig, setEventConfig] = useState({
    currentLevel: 1,
    isEventActive: true
  });

  useEffect(() => {
    if (socket) {
      socket.on('leaderboardUpdate', (data) => {
        setLeaderboard(data);
        if (team?.id) {
          const self = data.find(t => t.id === team.id);
          if (self) {
            updateTeam({
              cash: self.cash,
              currentLevel: self.currentLevel,
              isOnline: self.isOnline,
              heistStatus: self.heistStatus
            });
          }
        }
      });

      socket.on('teamUpdate', (data) => {
        if (data.team) {
          updateTeam(data.team);
        }
      });

      socket.on('heistAlert', (data) => {
        setHeistAlert(data);
      });

      socket.on('heistBlocked', (data) => {
        setNotification({
          type: 'success',
          message: `${data.attackerName}'s heist was blocked!`
        });
      });

      socket.on('heistResult', (data) => {
        setNotification({
          type: data.success ? 'danger' : 'success',
          message: data.success 
            ? `${data.attackerName} stole $${data.stolenAmount} from ${data.targetName}!`
            : `${data.attackerName}'s heist failed! ${data.targetName} gained $${data.transferAmount}!`
        });
      });

      socket.on('powerUpReceived', (powerUp) => {
        setNotification({
          type: 'success',
          message: `Power-up received: ${powerUp.name}!`
        });
      });

      socket.on('notification', (data) => {
        setNotification(data);
      });

      socket.on('announcement', (data) => {
        setAnnouncements(prev => [data, ...prev].slice(0, 10));
        setNotification({
          type: 'info',
          message: data.message
        });
      });

      socket.on('levelChange', (data) => {
        setEventConfig(prev => ({
          ...prev,
          currentLevel: data.level,
          levelStartTime: data.levelStartTime ?? prev.levelStartTime
        }));
        if (team?.id) {
          updateTeam({ currentLevel: data.level });
        }
        setNotification({
          type: 'info',
          message: data.level === 0 ? 'All levels have been locked!' : `Level ${data.level} is now active!`
        });
      });

      socket.on('heistStarted', (data) => {
        setNotification({
          type: 'warning',
          message: `🚨 ${data.attackerName} is attempting a heist on ${data.targetName}!`
        });
      });

      // Target lock updates
      socket.on('targetLockUpdate', (data) => {
        setTargetLocks(prev => {
          const next = { ...prev };
          if (data.locked) {
            next[data.targetTeamId] = { attackerId: data.attackerId };
          } else {
            delete next[data.targetTeamId];
          }
          return next;
        });
      });

      // Defender events: wrong answers/codes during heist
      socket.on('heistWrongAnswer', (data) => {
        setDefenderHeistEvents(prev => [...prev, { type: 'wrongAnswer', ...data, timestamp: Date.now() }]);
        setNotification({
          type: 'danger',
          message: `🚨 ${data.message}`
        });
      });

      socket.on('heistWrongCode', (data) => {
        setDefenderHeistEvents(prev => [...prev, { type: 'wrongCode', ...data, timestamp: Date.now() }]);
        setNotification({
          type: 'warning',
          message: '🔐 Attacker entered wrong safe code!'
        });
      });

      socket.on('heistTimerFreeze', (data) => {
        setNotification({
          type: 'danger',
          message: `❄️ Defender froze your timer! -${data.reduction}s`
        });
      });

      socket.on('disqualified', () => {
        setFullscreenDisqualified(true);
      });

      socket.on('undisqualified', () => {
        setFullscreenDisqualified(false);
      });

      return () => {
        socket.off('leaderboardUpdate');
        socket.off('teamUpdate');
        socket.off('heistAlert');
        socket.off('heistBlocked');
        socket.off('heistResult');
        socket.off('powerUpReceived');
        socket.off('notification');
        socket.off('announcement');
        socket.off('levelChange');
        socket.off('heistStarted');
        socket.off('targetLockUpdate');
        socket.off('heistWrongAnswer');
        socket.off('heistWrongCode');
        socket.off('heistTimerFreeze');
        socket.off('disqualified');
        socket.off('undisqualified');
      };
    }
  }, [socket, updateTeam, team]);

  // Fetch initial leaderboard
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (token) {
      fetchAnnouncements();
    }
  }, [token]);

  useEffect(() => {
    const interval = setInterval(fetchLeaderboard, 5000); // RT-02: Reduced from 2s (socket events handle real-time)
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(fetchAnnouncements, 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchEventConfig();
    }
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(fetchEventConfig, 10000); // RT-02: Reduced from 2s (rarely changes)
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (team?.id) {
      fetchTeamProgress(team.id);
    }
  }, [team?.id]);

  useEffect(() => {
    if (!token || !team?.id) return undefined;
    const interval = setInterval(() => fetchTeamProgress(team.id), 5000); // RT-02: Reduced from 2s
    return () => clearInterval(interval);
  }, [token, team?.id]);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/leaderboard`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/announcements`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (response.data?.announcements) {
        setAnnouncements(response.data.announcements);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  };

  const fetchEventConfig = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/event-config`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (response.data?.eventConfig) {
        setEventConfig(response.data.eventConfig);
      }
    } catch (error) {
      console.error('Failed to fetch event config:', error);
    }
  };

  const fetchTeamProgress = async (teamId) => {
    try {
      const response = await axios.get(
        `${API_URL}/team/${teamId}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (response.data?.team) {
        updateTeam({
          ...response.data.team,
          powerUps: response.data.powerUps
        });
      }
      setTeamProgress(response.data.progress || null);
      return response.data.progress;
    } catch (error) {
      return null;
    }
  };

  const submitAnswer = async (challengeId, answer, level, zone) => {
    try {
      const response = await axios.post(
        `${API_URL}/challenges/submit`,
        {
          challengeId,
          answer,
          level,
          zone
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (team?.id) {
        fetchTeamProgress(team.id);
      }
      return response.data;
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Submission failed' };
    }
  };

  const getChallenges = async (level, zone) => {
    try {
      const response = await axios.get(
        `${API_URL}/challenges/${level}/${zone}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      return response.data;
    } catch (error) {
      return { challenges: [], completed: [] };
    }
  };

  const initiateHeist = async (targetTeamId) => {
    try {
      const response = await axios.post(
        `${API_URL}/heist/initiate`, 
        { targetTeamId },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      return response.data;
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Heist initiation failed', locked: error.response?.data?.locked };
    }
  };

  const submitCompoundAnswer = async (heistId, challengeId, answer) => {
    try {
      const response = await axios.post(
        `${API_URL}/heist/compound`,
        { heistId, challengeId, answer },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      return response.data;
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Submission failed', heistFailed: error.response?.data?.heistFailed };
    }
  };

  const submitSafeAnswer = async (heistId, answer) => {
    try {
      const response = await axios.post(
        `${API_URL}/heist/safe`,
        { heistId, answer },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      return response.data;
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Submission failed', heistFailed: error.response?.data?.heistFailed };
    }
  };

  const fetchHeistLocks = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/heist/locks`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (response.data?.locks) {
        setTargetLocks(response.data.locks);
      }
      return response.data?.locks || {};
    } catch (error) {
      return {};
    }
  };

  const useDefenderPowerup = async (powerUpType) => {
    try {
      const response = await axios.post(
        `${API_URL}/heist/use-powerup`,
        { powerUpType },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      return response.data;
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to use power-up' };
    }
  };

  const clearDefenderHeistEvents = () => {
    setDefenderHeistEvents([]);
  };

  const clearHeistAlert = () => {
    setHeistAlert(null);
  };

  const clearNotification = () => {
    setNotification(null);
  };

  const value = {
    leaderboard,
    announcements,
    heistAlert,
    notification,
    eventConfig,
    teamProgress,
    targetLocks,
    defenderHeistEvents,
    fullscreenDisqualified,
    fetchLeaderboard,
    fetchEventConfig,
    fetchTeamProgress,
    submitAnswer,
    getChallenges,
    initiateHeist,
    submitCompoundAnswer,
    submitSafeAnswer,
    fetchHeistLocks,
    useDefenderPowerup,
    clearHeistAlert,
    clearNotification,
    clearDefenderHeistEvents
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
