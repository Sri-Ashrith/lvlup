import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin)
).replace(/\/$/, '');
const API_URL = `${API_BASE_URL}/api`;
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_BASE_URL).replace(/\/$/, '');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // PERF-03

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Restore session from localStorage
      const storedUser = localStorage.getItem('user');
      const storedTeam = localStorage.getItem('team');
      
      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedTeam) setTeam(JSON.parse(storedTeam));
    }
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    if (token && !socket) {
      // AUTH-08: Send JWT token with socket connection for server-side auth
      const newSocket = io(SOCKET_URL, {
        auth: { token }
      });
      
      // PERF-03: Track connection status
      newSocket.on('connect', () => setConnectionStatus('connected'));
      newSocket.on('disconnect', () => setConnectionStatus('disconnected'));
      newSocket.on('connect_error', () => setConnectionStatus('error'));
      newSocket.io.on('reconnect_attempt', () => setConnectionStatus('reconnecting'));
      newSocket.io.on('reconnect', () => setConnectionStatus('connected'));
      
      setSocket(newSocket);
      
      return () => {
        newSocket.close();
      };
    }
  }, [token, socket]);

  useEffect(() => {
    if (socket && team) {
      socket.emit('joinTeamRoom', team.id);
    }
    if (socket && user?.role === 'admin') {
      socket.emit('joinAdminRoom');
    }
  }, [socket, team, user]);

  const loginTeam = async (accessCode) => {
    try {
      const response = await axios.post(`${API_URL}/auth/team-login`, { accessCode });
      const { token: newToken, team: teamData, powerUps } = response.data;
      
      setToken(newToken);
      setUser({ role: 'team', teamId: teamData.id });
      setTeam({ ...teamData, powerUps });
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify({ role: 'team', teamId: teamData.id }));
      localStorage.setItem('team', JSON.stringify({ ...teamData, powerUps }));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const loginAdmin = async (password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/admin-login`, { password });
      const { token: newToken, role } = response.data;
      
      setToken(newToken);
      setUser({ role });
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify({ role }));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true };
    } catch (error) {
      if (!error.response) {
        return { success: false, error: 'Cannot reach server. Check VITE_API_URL/VITE_SOCKET_URL and backend availability.' };
      }
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setTeam(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('team');
    delete axios.defaults.headers.common['Authorization'];
    if (socket) {
      socket.close();
      setSocket(null);
    }
  };

  const updateTeam = (newTeamData) => {
    setTeam(prev => {
      const updated = { ...prev, ...newTeamData };
      localStorage.setItem('team', JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    user,
    team,
    token,
    socket,
    connectionStatus, // PERF-03
    isAuthenticated: !!token,
    isLoading,
    loginTeam,
    loginAdmin,
    logout,
    updateTeam
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
