import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { checkAuthStatus, logout as apiLogout, getUserProfile } from '@/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const verifyAuth = useCallback(async () => {
    setIsLoading(true);
    setUserProfile(null);
    try {
      const response = await checkAuthStatus();
      const authStatus = response.data.isAuthenticated;
      setIsAuthenticated(authStatus);
      if (authStatus) {
        try {
          const profileResponse = await getUserProfile();
          setUserProfile(profileResponse.data);
        } catch (profileError) {
          console.error("Failed to fetch user profile:", profileError);
          if (profileError.response && profileError.response.status === 401) {
            setIsAuthenticated(false);
          }
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  const logout = async () => {
    try {
      await apiLogout();
      setIsAuthenticated(false);
      setUserProfile(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, userProfile, logout, verifyAuth }}>
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
