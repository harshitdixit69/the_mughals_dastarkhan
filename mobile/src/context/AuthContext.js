import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, setToken, removeToken, setUser, removeUser, getToken, getUser, setOnUnauthorized } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect to login on 401
    setOnUnauthorized(() => {
      setUserState(null);
    });
    // Load persisted session
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const profile = await authApi.getProfile();
          setUserState(profile);
        }
      } catch {
        await removeToken();
        await removeUser();
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    await setToken(data.access_token);
    await setUser(data.user);
    setUserState(data.user);
    return data;
  };

  const register = async (formData) => {
    const data = await authApi.register(formData);
    await setToken(data.access_token);
    await setUser(data.user);
    setUserState(data.user);
    return data;
  };

  const logout = async () => {
    await removeToken();
    await removeUser();
    setUserState(null);
  };

  const refreshProfile = async () => {
    try {
      const profile = await authApi.getProfile();
      setUserState(profile);
      return profile;
    } catch { return null; }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
