import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Organization } from '../types';
import { authApi } from '../lib/api';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string; organization_name: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('certiflow_user');
      return saved && saved !== 'undefined' && saved !== 'null' ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [organization, setOrganization] = useState<Organization | null>(() => {
    try {
      const saved = localStorage.getItem('certiflow_org');
      return saved && saved !== 'undefined' && saved !== 'null' ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('certiflow_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('certiflow_token');
      if (storedToken) {
        try {
          const userData = await authApi.me();
          let org: Organization | null = null;
          try {
            const savedOrg = localStorage.getItem('certiflow_org');
            org = savedOrg && savedOrg !== 'undefined' && savedOrg !== 'null' ? JSON.parse(savedOrg) : null;
          } catch {
            org = null;
          }

          const parsedUser: User = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role || 'organizer',
            is_active: userData.status === 'active',
            created_at: userData.created_at || new Date().toISOString(),
          };

          setUser(parsedUser);
          setOrganization(org);
          localStorage.setItem('certiflow_user', JSON.stringify(parsedUser));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (data: { email: string; password: string }) => {
    const res = await authApi.login(data);
    const parsedUser: User = {
      id: res.user_id,
      name: res.user_name,
      email: res.user_email,
      role: 'organizer',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    const parsedOrg: Organization = {
      id: res.organization_id || 'default-org',
      name: res.organization_name || 'Primary Workspace',
      created_at: new Date().toISOString(),
    };

    localStorage.setItem('certiflow_token', res.access_token);
    localStorage.setItem('certiflow_user', JSON.stringify(parsedUser));
    localStorage.setItem('certiflow_org', JSON.stringify(parsedOrg));
    setToken(res.access_token);
    setUser(parsedUser);
    setOrganization(parsedOrg);
  };

  const register = async (data: { name: string; email: string; password: string; organization_name: string }) => {
    const res = await authApi.register(data);
    const parsedUser: User = {
      id: res.user_id,
      name: res.user_name,
      email: res.user_email,
      role: 'organizer',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    const parsedOrg: Organization = {
      id: res.organization_id || 'default-org',
      name: res.organization_name || data.organization_name,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem('certiflow_token', res.access_token);
    localStorage.setItem('certiflow_user', JSON.stringify(parsedUser));
    localStorage.setItem('certiflow_org', JSON.stringify(parsedOrg));
    setToken(res.access_token);
    setUser(parsedUser);
    setOrganization(parsedOrg);
  };

  const logout = () => {
    localStorage.removeItem('certiflow_token');
    localStorage.removeItem('certiflow_user');
    localStorage.removeItem('certiflow_org');
    setToken(null);
    setUser(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
