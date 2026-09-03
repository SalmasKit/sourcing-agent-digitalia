import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, registerApi, logoutApi, storage } from '../services/api';

const AuthContext = createContext(null);

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
      storage.clearSession();
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  // ── Listen for automatic session expiry (triggered by Axios interceptor) ─
  const handleSessionExpired = useCallback(() => {
    storage.clearSession();
    setToken(null);
    setUser(null);
    console.warn('[Auth] Session expired — user has been signed out.');
  }, []);

  useEffect(() => {
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [handleSessionExpired]);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const data = await loginApi(email, password);
    if (data?.token && data?.user) {
      setToken(data.token);
      setUser(data.user);
      storage.setSession(data.token, data.refreshToken ?? '', data.user);
      return true;
    }
    return false;
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const register = async (name, email, password, role = 'RECRUITER') => {
    const data = await registerApi(name, email, password, role);
    if (data?.token && data?.user) {
      setToken(data.token);
      setUser(data.user);
      storage.setSession(data.token, data.refreshToken ?? '', data.user);
      return true;
    }
    // If backend returned user object without token, auto-login or set user
    if (data?.user) {
      return login(email, password);
    }
    return false;
  };

  // ── Logout — invalidates token server-side ───────────────────────────────
  const logout = async () => {
    await logoutApi(); // calls POST /auth/logout + clears localStorage
    setToken(null);
    setUser(null);
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

