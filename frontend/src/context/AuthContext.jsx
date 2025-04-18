import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { checkAuthStatus, logout as apiLogout, getUserProfile } from '@/services/api';
import { API_BASE_URL } from '@/services/api';

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

  useEffect(() => {
    const handleAuthMessage = (event) => {
      const expectedOrigin = (new URL(API_BASE_URL)).origin;

      if (event.origin !== expectedOrigin) {
        console.warn(`Message received from unexpected origin: ${event.origin}. Expected: ${expectedOrigin}`);
        return;
      }

      if (event.data === 'authSuccess') {
        console.log('Received authSuccess message from popup.');
        verifyAuth(); 
      }
    };

    window.addEventListener('message', handleAuthMessage);

    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
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
