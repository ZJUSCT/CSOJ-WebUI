"use client";

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { useSWRConfig } from 'swr';
import { User } from '@/lib/types';
import api from '@/lib/api';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const { mutate } = useSWRConfig();

  const fetchUserProfile = useCallback(async (token: string) => {
    try {
      const response = await api.get('/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuthState({
        token,
        user: response.data.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch user profile, logging out.', error);
      logout();
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('csoj_jwt');
    setAuthState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    // Clear all SWR cache on logout
    mutate(() => true, undefined, { revalidate: false });
  }, [mutate]);

  useEffect(() => {
    const token = localStorage.getItem('csoj_jwt');
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        if (decoded.exp! * 1000 > Date.now()) {
          fetchUserProfile(token);
        } else {
          logout();
        }
      } catch (e) {
        console.error("Invalid token", e);
        logout();
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, [fetchUserProfile, logout]);

  const login = (token: string) => {
    localStorage.setItem('csoj_jwt', token);
    fetchUserProfile(token);
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};