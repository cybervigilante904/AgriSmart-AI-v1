import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  language: string;
  country?: string;
  region?: string;
  address?: string;
  phoneNumber?: string;
  cellPhoneNumber?: string;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    name: string,
    language?: string,
    country?: string,
    region?: string,
    phoneCountryCode?: string,
    phoneNumber?: string,
    recoveryQuestion?: string,
      recoveryAnswer?: string,
      profileImageUrl?: string,
      address?: string,
      cellPhoneNumber?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_SESSION_DURATION_MS = 4 * 24 * 60 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedAt = Number(localStorage.getItem('authTokenStoredAt'));

    if (!storedToken || !storedAt || Date.now() - storedAt >= AUTH_SESSION_DURATION_MS) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTokenStoredAt');
      setIsLoading(false);
      return;
    }

    verifyStoredToken(storedToken);
  }, []);

  const verifyStoredToken = async (storedToken: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: storedToken })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(storedToken);
      } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authTokenStoredAt');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTokenStoredAt');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authTokenStoredAt', String(Date.now()));
      if (data.user?.profileImageUrl) {
        localStorage.setItem('agriSmartProfileImage', data.user.profileImageUrl);
      }
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const register = async (
    email: string, 
    password: string, 
    name: string, 
    language: string = 'English',
    country?: string,
    region?: string,
    phoneCountryCode?: string,
    phoneNumber?: string,
    recoveryQuestion?: string,
    recoveryAnswer?: string,
    profileImageUrl?: string,
    address?: string,
    cellPhoneNumber?: string
  ) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          name, 
          language,
          country,
          region,
          phoneCountryCode,
          phoneNumber,
          recoveryQuestion,
          recoveryAnswer,
          profileImageUrl,
          address,
          cellPhoneNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      // Auto-login after registration with full user data
      return login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTokenStoredAt');
    localStorage.removeItem('agriSmartProfileImage');
  };

  const updateProfile = async (data: Partial<AuthUser>) => {
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...data })
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Update failed' };
      }

      // Update user state with all fields from server
      setUser(result.user as AuthUser);
      if (result.user?.profileImageUrl) {
        localStorage.setItem('agriSmartProfileImage', result.user.profileImageUrl);
      }
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Update failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
