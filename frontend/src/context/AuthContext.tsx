import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { api } from '../services/api';
import { MOCK_USERS } from '../services/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBackendConnected: boolean;
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => void;
  refreshHealth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(MOCK_USERS[0]); // Defaults to Ghouse (Admin / ML Lead)
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(true); // Demo mode enabled by default for seamless standalone use

  const refreshHealth = async (): Promise<boolean> => {
    const online = await api.checkHealth();
    setIsBackendConnected(online);
    if (!online && !demoMode) {
      setDemoMode(true);
    }
    return online;
  };

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Attempt to load current user from API if tokens exist and backend is online
  useEffect(() => {
    if (isBackendConnected && api.getAccessToken()) {
      api.getMe()
        .then((u) => {
          setUser(u);
          setDemoMode(false);
        })
        .catch(() => {
          // Token expired or invalid
        });
    }
  }, [isBackendConnected]);

  const login = async (email: string, password: string) => {
    if (!demoMode && isBackendConnected) {
      await api.login(email, password);
      const me = await api.getMe();
      setUser(me);
    } else {
      // Demo login
      const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        setUser(matched);
      } else {
        setUser({ id: Date.now(), email, role: 'analyst' });
      }
    }
  };

  const register = async (email: string, password: string) => {
    if (!demoMode && isBackendConnected) {
      await api.register(email, password);
      await login(email, password);
    } else {
      const newUser: User = { id: Date.now(), email, role: 'analyst' };
      setUser(newUser);
    }
  };

  const logout = () => {
    api.clearTokens();
    setUser(null);
  };

  const switchDemoRole = (role: UserRole) => {
    if (user) {
      setUser({ ...user, role });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isBackendConnected,
        demoMode,
        setDemoMode,
        login,
        register,
        logout,
        switchDemoRole,
        refreshHealth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
