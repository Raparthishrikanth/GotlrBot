import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Configure backend URLs
export const DJANGO_API_URL = 'http://localhost:8000/api';
export const FASTAPI_API_URL = 'http://localhost:8001';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configure Axios defaults when token is loaded/changed
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      
      // Fetch user profile from Django
      axios.get(`${DJANGO_API_URL}/profile/`)
        .then(res => {
          setUser(res.data);
        })
        .catch(err => {
          console.error("Failed to fetch profile, clearing token.", err);
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${DJANGO_API_URL}/login/`, { username, password });
      const { access } = response.data;
      setToken(access);
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { 
        success: false, 
        error: error.response?.data?.detail || "Invalid credentials. Please try again." 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password, firstName, lastName, role = 'free_user') => {
    setLoading(true);
    try {
      await axios.post(`${DJANGO_API_URL}/register/`, {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role
      });
      // Automatically log in after registration
      return await login(username, password);
    } catch (error) {
      console.error("Registration failed:", error);
      const errors = error.response?.data;
      let errorMsg = "Registration failed. Please fill all fields correctly.";
      if (errors && typeof errors === 'object') {
        errorMsg = Object.entries(errors)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join('\n');
      }
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
