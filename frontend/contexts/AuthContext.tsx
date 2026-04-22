import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const TOKEN_KEY = 'studymatch_token';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  profile_photo?: string;
  university?: string;
  course?: string;
  study_style?: string;
  grade_goal?: string;
  location_preference?: string;
  onboarding_completed: boolean;
  group_id?: string;
  subscription_tier?: string;
  referral_code?: string;
  is_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (userData: User, authToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasChecked = useRef(false);

  const checkAuth = useCallback(async () => {
    try {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setToken(savedToken);
      } else {
        // Token invalid/expired - clear it
        await AsyncStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasChecked.current) {
      hasChecked.current = true;
      checkAuth();
    }
  }, [checkAuth]);

  const login = async (userData: User, authToken: string) => {
    await AsyncStorage.setItem(TOKEN_KEY, authToken);
    setToken(authToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.log('Logout error:', error);
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (!savedToken) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.log('Refresh user failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
