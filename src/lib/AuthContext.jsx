import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      await checkUserAuth();
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected auth error:', error);
      setAuthError({
        type: 'unknown',
        message: error?.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        throw error;
      }

      if (!data?.user) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      } else {
        setUser({
          ...data.user,
          role: data.user.user_metadata?.role || 'user'
        });
        setIsAuthenticated(true);
        setAuthError(null);
      }
    } catch (error) {
      console.error('User auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: 'auth_required',
        message: 'Authentication required'
      });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error);
    }

    if (shouldRedirect) {
      window.location.href = appParams.loginUrl || '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = appParams.loginUrl || '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
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
