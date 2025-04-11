import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function AuthCallbackPage() {
  const { verifyAuth, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // When this page loads after Google redirect, verify the auth status
    // (which checks the session cookie set by the backend)
    verifyAuth();
  }, [verifyAuth]);

  useEffect(() => {
    // Once loading is finished and user is authenticated, redirect to mail page
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    } 
    // Optional: Handle case where authentication failed after callback
    else if (!isLoading && !isAuthenticated) {
      console.error('Authentication failed after callback.');
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Show a loading indicator while verifying
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Authenticating...</div> 
    </div>
  );
}
