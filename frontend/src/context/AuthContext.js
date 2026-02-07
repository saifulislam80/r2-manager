import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Set axios default header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await axios.get(`${process.env.REACT_APP_API_URL}/auth/me`);
          setUser(res.data.data);
        } catch (error) {
          console.error('Error loading user:', error);
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const register = async (name, email, password) => {
    const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/register`, {
      name,
      email,
      password
    });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/login`, {
      email,
      password
    });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await axios.get(`${process.env.REACT_APP_API_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    }
    setToken(null);
    setUser(null);
  };

  const forgotPassword = async (email) => {
    const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/forgotpassword`, {
      email
    });
    return res.data;
  };

  const resetPassword = async (resetToken, password) => {
    const res = await axios.put(`${process.env.REACT_APP_API_URL}/auth/resetpassword/${resetToken}`, {
      password
    });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const value = {
    user,
    token,
    loading,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};