import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("expense_tracker_user");
    const storedToken = localStorage.getItem("expense_tracker_token");
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch {
        localStorage.removeItem("expense_tracker_user");
        localStorage.removeItem("expense_tracker_token");
      }
    }
    setLoading(false);
  }, []);

  const persistAuth = (profile, apiToken) => {
    setUser(profile);
    setToken(apiToken);
    localStorage.setItem("expense_tracker_user", JSON.stringify(profile));
    localStorage.setItem("expense_tracker_token", apiToken);
  };

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("expense_tracker_user");
    localStorage.removeItem("expense_tracker_token");
  };

  const login = async ({ email, password }) => {
    setAuthError(null);
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    const payload = response.data?.data || {};
    if (!payload.token || !payload.user) {
      throw new Error("Invalid login response");
    }
    persistAuth(payload.user, payload.token);
    return payload.user;
  };

  const register = async ({ name, email, password }) => {
    setAuthError(null);
    const response = await axios.post(`${API_BASE}/auth/register`, { name, email, password });
    const payload = response.data?.data || {};
    if (!payload.token || !payload.user) {
      throw new Error("Invalid signup response");
    }
    persistAuth(payload.user, payload.token);
    return payload.user;
  };

  const logout = () => {
    clearAuth();
  };

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      authenticated: Boolean(user && token),
      authHeader,
      authError,
      login,
      register,
      logout,
      setAuthError,
    }),
    [user, token, loading, authError, authHeader]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
