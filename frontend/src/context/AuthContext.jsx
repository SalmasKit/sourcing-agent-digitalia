import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, registerApi, logoutApi, storage } from '../services/api';

const AuthContext = createContext(null);

// Default guest user shown when no session exists
const GUEST_USER = {
  id: 'usr-guest',
  name: 'Sarah Connor',
  email: 'sarah.connor@digitalia.io',
  role: 'Head of Technical Sourcing'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session from localStorage on mount ──────────────────────────
  useEffect(() => {
    const savedToken = storage.getAccessToken();
    const savedUser  = storage.getUser();

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    } else {
      setUser(GUEST_USER);
    }
    setLoading(false);
  }, []);

  // ── Listen for automatic session expiry (triggered by Axios interceptor) ─
  const handleSessionExpired = useCallback(() => {
    setToken(null);
    setUser(GUEST_USER);
    // Optionally show a toast / modal here
    console.warn('[Auth] Session expired — user has been signed out.');
  }, []);

  useEffect(() => {
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [handleSessionExpired]);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const data = await loginApi(email, password);
    if (data?.token) {
      setToken(data.token);
      setUser(data.user);
      // storage.setSession already called inside loginApi for real backend;
      // handle mock path (no server) as well:
      if (!storage.getAccessToken()) {
        storage.setSession(data.token, data.refreshToken ?? '', data.user);
      }
      return true;
    }
    return false;
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const register = async (name, email, password) => {
    const data = await registerApi(name, email, password);
    // Mock path returns token directly; real backend requires a subsequent login
    if (data?.token) {
      setToken(data.token);
      setUser(data.user);
      storage.setSession(data.token, data.refreshToken ?? '', data.user);
      return true;
    }
    // If real backend returned only user, auto-login
    if (data?.user) {
      return login(email, password);
    }
    return false;
  };

  // ── Logout — invalidates token server-side ───────────────────────────────
  const logout = async () => {
    await logoutApi(); // calls POST /auth/logout + clears localStorage
    setToken(null);
    setUser(GUEST_USER);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
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
