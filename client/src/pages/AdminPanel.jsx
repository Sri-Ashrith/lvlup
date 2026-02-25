import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useSound } from '../context/SoundContext';
import axios from 'axios';
import { 
  ArrowLeft, 
  Shield,
  Users,
  DollarSign,
  Zap,
  Trophy,
  Settings,
  Send,
  Plus,
  Minus,
  Volume2,
  VolumeX,
  LogOut,
  RefreshCw,
  AlertTriangle,
  Play,
  Pause,
  Eye,
  Clock,
  Target,
  Skull,
  Star,
  Megaphone
} from 'lucide-react';
import Leaderboard from '../components/Leaderboard';

const configuredApiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE_URL = import.meta.env.DEV
  ? (configuredApiBase || 'http://localhost:3001')
  : configuredApiBase;
const API_URL = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
  const { leaderboard, fetchLeaderboard } = useGame();
  const { playSound, toggleMute, isMuted } = useSound();
  
  const [teams, setTeams] = useState([]);
  const [eventState, setEventState] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [cashAmount, setCashAmount] = useState(100);
  const [selectedPowerUp, setSelectedPowerUp] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [newTeamName, setNewTeamName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const POWER_UPS = [
    { id: 'GUARDIAN_ANGEL', name: 'Guardian Angel' },
    { id: 'DOUBLE_CASH', name: 'Double Cash' },
    { id: 'SHIELD', name: 'Shield' },
    { id: 'HINT_MASTER', name: 'Hint Master' },
    { id: 'TIME_FREEZE', name: 'Time Freeze' },
  ];

  useEffect(() => {
    loadEventState();
    const interval = setInterval(loadEventState, 5000);
    return () => clearInterval(interval);
  }, []);

  const authConfig = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

  const loadEventState = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/event-state`, authConfig);
      setEventState(response.data);
      setTeams(response.data.teams);
    } catch (error) {
      console.error('Failed to load event state:', error);
    }
  };

  const handleAddCash = async (amount) => {
    if (!selectedTeam) return;
    playSound('click');
    setIsLoading(true);
    
    try {
      await axios.post(`${API_URL}/admin/add-cash`, {
        teamId: selectedTeam.id,
        amount: amount
      }, authConfig);
      playSound('cash');
      await loadEventState();
      fetchLeaderboard();
    } catch (error) {
      playSound('error');
      console.error('Failed to add cash:', error);
    }
    
    setIsLoading(false);
  };

  const handleDropPowerUp = async () => {
    if (!selectedTeam || !selectedPowerUp) return;
    playSound('click');
    setIsLoading(true);
    
    try {
      await axios.post(`${API_URL}/admin/drop-powerup`, {
        teamId: selectedTeam.id,
        powerUpId: selectedPowerUp
      }, authConfig);
      playSound('powerup');
      setSelectedPowerUp('');
      await loadEventState();
    } catch (error) {
      playSound('error');
      console.error('Failed to drop power-up:', error);
    }
    
    setIsLoading(false);
  };

  const handleRemovePowerUp = async (powerUpId) => {
    if (!selectedTeam || !powerUpId) return;
    playSound('click');
    setIsLoading(true);

    try {
      await axios.post(`${API_URL}/admin/remove-powerup`, {
        teamId: selectedTeam.id,
        powerUpId
      }, authConfig);
      await loadEventState();
    } catch (error) {
      playSound('error');
      console.error('Failed to remove power-up:', error);
    }

    setIsLoading(false);
  };

  const handleSetLevel = async (level) => {
    playSound('click');
    setIsLoading(true);
    setEventState(prev => prev ? { ...prev, eventConfig: { ...prev.eventConfig, currentLevel: level } } : prev);
    
    try {
      await axios.post(`${API_URL}/admin/set-level`, { level }, authConfig);
      await loadEventState();
      fetchLeaderboard();
    } catch (error) {
      playSound('error');
      console.error('Failed to set level:', error);
    }
    
    setIsLoading(false);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    playSound('click');
    setIsLoading(true);
    
    try {
      await axios.post(`${API_URL}/admin/create-team`, { name: newTeamName }, authConfig);
      playSound('success');
      setNewTeamName('');
      await loadEventState();
      fetchLeaderboard();
    } catch (error) {
      playSound('error');
      console.error('Failed to create team:', error);
    }
    
    setIsLoading(false);
  };

  const handleAnnouncement = async () => {
    if (!announcement.trim()) return;
    playSound('click');
    setIsLoading(true);
    
    try {
      await axios.post(`${API_URL}/admin/announcement`, { 
        message: announcement,
        type: 'info'
      }, authConfig);
      playSound('success');
      setAnnouncement('');
    } catch (error) {
      playSound('error');
      console.error('Failed to send announcement:', error);
    }
    
    setIsLoading(false);
  };

  const selectedTeamPowerUps = selectedTeam
    ? (eventState?.teams?.find(t => t.id === selectedTeam.id)?.powerUps || [])
    : [];

  const handleLogout = () => {
    playSound('click');
    logout();
    navigate('/');
  };

  const totalCash = teams.reduce((sum, t) => sum + t.cash, 0);
  const onlineTeams = teams.filter(t => t.isOnline).length;
  const activeHeists = eventState?.heists?.length || 0;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gta-dark/70 border-b border-gta-red/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 border-2 border-gta-red rounded flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(251,113,133,0.15)' }}>
                <Shield className="w-6 h-6 text-gta-red" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white uppercase tracking-[3px]" style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}>ADMIN CONTROL</h1>
                <p className="text-gray-500 text-xs font-condensed tracking-wider uppercase">Event Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => { playSound('click'); loadEventState(); }}
                className="p-2 text-gray-500 hover:text-gta-green transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => { playSound('click'); toggleMute(); }}
                className="p-2 text-gray-500 hover:text-gta-green transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gta-red transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="gta-card p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-gta-green" />
              <div>
                <p className="text-gray-400 text-xs font-mono">Teams</p>
                <p className="text-2xl font-gta-heading text-white">{teams.length}</p>
              </div>
            </div>
          </div>
          <div className="gta-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-mono">Online</p>
                <p className="text-2xl font-gta-heading text-green-500">{onlineTeams}</p>
              </div>
            </div>
          </div>
          <div className="gta-card p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-gta-yellow" />
              <div>
                <p className="text-gray-400 text-xs font-mono">Total Cash</p>
                <p className="text-2xl font-gta-heading text-gta-yellow">${totalCash.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="gta-card p-4">
            <div className="flex items-center gap-3">
              <Skull className="w-8 h-8 text-gta-red" />
              <div>
                <p className="text-gray-400 text-xs font-mono">Active Heists</p>
                <p className="text-2xl font-gta-heading text-gta-red">{activeHeists}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - RESP-01: scrollable on mobile */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin">
          {['dashboard', 'teams', 'controls'].map((tab) => (
            <button
              key={tab}
              onClick={() => { playSound('click'); setActiveTab(tab); }}
              className={`gta-button text-sm py-2 px-4 capitalize whitespace-nowrap flex-shrink-0 ${
                activeTab === tab ? '' : 'opacity-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 gap-8"
            >
              {/* Live Leaderboard */}
              <div className="gta-card p-6">
                <h2 className="text-xl font-gta-heading text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-gta-yellow" />
                  Live Leaderboard
                </h2>
                <Leaderboard data={leaderboard} compact />
              </div>

              {/* Event Control */}
              <div className="space-y-6">
                {/* Current Level */}
                <div className="gta-card p-6">
                  <h2 className="text-xl font-gta-heading text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-gta-green" />
                    Current Level
                  </h2>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-mono text-sm">Active Level:</span>
                      <span className="px-3 py-1 rounded-full bg-gta-yellow/20 border border-gta-yellow text-gta-yellow font-gta-heading text-sm">
                        {eventState?.eventConfig?.currentLevel || 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gta-yellow/80 font-mono text-xs">
                      <span className="w-2 h-2 rounded-full bg-gta-yellow animate-pulse" />
                      Live Unlock
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleSetLevel(level)}
                        disabled={isLoading}
                        className={`gta-button py-3 ${
                          eventState?.eventConfig?.currentLevel === level 
                            ? 'border-gta-yellow bg-gta-yellow/20 shadow-[0_0_20px_rgba(245,213,71,0.35)] relative' 
                            : ''
                        }`}
                      >
                        {level}
                        {eventState?.eventConfig?.currentLevel === level && (
                          <span className="absolute -top-2 -right-2 text-[10px] px-2 py-0.5 rounded-full bg-gta-yellow text-black font-bold">
                            Active
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Announcement */}
                <div className="gta-card p-6">
                  <h2 className="text-xl font-gta-heading text-white mb-4 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-gta-yellow" />
                    Broadcast Announcement
                  </h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={announcement}
                      onChange={(e) => setAnnouncement(e.target.value)}
                      placeholder="Type announcement..."
                      className="gta-input flex-1"
                    />
                    <button
                      onClick={handleAnnouncement}
                      disabled={isLoading || !announcement.trim()}
                      className="gta-button gta-button-danger disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Create Team */}
                <div className="gta-card p-6">
                  <h2 className="text-xl font-gta-heading text-white mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-500" />
                    Create Team
                  </h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Team name..."
                      className="gta-input flex-1"
                    />
                    <button
                      onClick={handleCreateTeam}
                      disabled={isLoading || !newTeamName.trim()}
                      className="gta-button gta-button-success disabled:opacity-50"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <motion.div
              key="teams"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="gta-card p-6">
                <h2 className="text-xl font-gta-heading text-white mb-4">All Teams</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 font-mono text-sm border-b border-gta-green/20">
                        <th className="pb-3">Team</th>
                        <th className="pb-3">Access Code</th>
                        <th className="pb-3">Cash</th>
                        <th className="pb-3">Level</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team) => (
                        <tr key={team.id} className="border-b border-gta-green/10 hover:bg-gta-green/5">
                          <td className="py-3 font-gta-heading text-white">{team.name}</td>
                          <td className="py-3 font-mono text-gta-green">{team.accessCode}</td>
                          <td className="py-3 cash-display">${team.cash.toLocaleString()}</td>
                          <td className="py-3 font-gta-heading text-gta-green">{team.currentLevel}</td>
                          <td className="py-3">
                            <span className={`flex items-center gap-2 ${team.isOnline ? 'text-green-500' : 'text-gray-500'}`}>
                              <div className={`w-2 h-2 rounded-full ${team.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                              {team.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => { playSound('click'); setSelectedTeam(team); setActiveTab('controls'); }}
                              className="gta-button text-xs py-1 px-3"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Controls Tab */}
          {activeTab === 'controls' && (
            <motion.div
              key="controls"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 gap-8"
            >
              {/* Team Selector */}
              <div className="gta-card p-6">
                <h2 className="text-xl font-gta-heading text-white mb-4">Select Team</h2>
                <div className="grid gap-2 max-h-96 overflow-y-auto">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => { playSound('click'); setSelectedTeam(team); }}
                      className={`p-3 rounded-lg flex items-center justify-between transition-all ${
                        selectedTeam?.id === team.id 
                          ? 'bg-gta-green/30 border border-gta-green' 
                          : 'bg-gta-dark/50 hover:bg-gta-green/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${team.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <span className="font-gta-heading text-white">{team.name}</span>
                      </div>
                      <span className="cash-display">${team.cash.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Actions */}
              {selectedTeam && (
                <div className="space-y-6">
                  {/* Selected Team Info */}
                  <div className="gta-card p-6">
                    <h2 className="text-xl font-gta-heading text-white mb-2">{selectedTeam.name}</h2>
                    <p className="text-gray-400 font-mono text-sm">
                      Code: {selectedTeam.accessCode} • Cash: ${selectedTeam.cash.toLocaleString()}
                    </p>
                  </div>

                  {/* Cash Control */}
                  <div className="gta-card p-6">
                    <h3 className="text-lg font-gta-heading text-white mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-gta-yellow" />
                      Cash Control
                    </h3>
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(parseInt(e.target.value) || 0)}
                        className="gta-input flex-1"
                        min="0"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAddCash(cashAmount)}
                        disabled={isLoading}
                        className="gta-button gta-button-success flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add ${cashAmount}
                      </button>
                      <button
                        onClick={() => handleAddCash(-cashAmount)}
                        disabled={isLoading}
                        className="gta-button gta-button-danger flex items-center justify-center gap-2"
                      >
                        <Minus className="w-4 h-4" />
                        Deduct ${cashAmount}
                      </button>
                    </div>
                  </div>

                  {/* Power-up Drop */}
                  <div className="gta-card p-6">
                    <h3 className="text-lg font-gta-heading text-white mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-gta-yellow" />
                      Drop Power-up
                    </h3>
                    <select
                      value={selectedPowerUp}
                      onChange={(e) => setSelectedPowerUp(e.target.value)}
                      className="gta-input mb-4"
                    >
                      <option value="">Select power-up...</option>
                      {POWER_UPS.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleDropPowerUp}
                      disabled={isLoading || !selectedPowerUp}
                      className="gta-button w-full disabled:opacity-50"
                    >
                      Drop Power-up
                    </button>
                  </div>

                  {/* Power-up Remove */}
                  <div className="gta-card p-6">
                    <h3 className="text-lg font-gta-heading text-white mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-gta-green" />
                      Remove Power-up
                    </h3>
                    <div className="space-y-2">
                      {selectedTeamPowerUps.length > 0 ? (
                        selectedTeamPowerUps.map((p, idx) => (
                          <div
                            key={`${p.id}-${idx}`}
                            className="flex items-center justify-between bg-gta-dark/50 border border-gta-green/20 rounded-lg px-3 py-2"
                          >
                            <span className="text-white font-mono text-sm">{p.name}</span>
                            <button
                              onClick={() => handleRemovePowerUp(p.id)}
                              disabled={isLoading}
                              className="gta-button gta-button-danger text-xs px-3 py-1"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-sm font-mono">No power-ups on this team.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}


        </AnimatePresence>
      </main>
    </div>
  );
}

