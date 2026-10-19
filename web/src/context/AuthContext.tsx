import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  /** ADMIN is the platform-wide super-admin role. */
  role: UserRole;
  timezone: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function checkAuth() {
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void checkAuth();
  }, []);

  const login = async (data: any) => {
    const res = await apiClient.post('/auth/login', data);
    setUser(res.data.user);
  };

  const signup = async (data: any) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await apiClient.post('/auth/signup', { ...data, timezone });
    setUser(res.data.user);
  };

  const logout = async () => {
    await apiClient.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
