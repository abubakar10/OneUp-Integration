import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';

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
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const { instance } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing authentication and restore it
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setLoading(false);
      return;
    }

    // If no stored auth, check for MSAL accounts
    const checkMsalAccounts = async () => {
      try {
        const accounts = instance.getAllAccounts();
        if (accounts.length > 0) {
          const account = accounts[0];
          
          // Get access token silently
          const response = await instance.acquireTokenSilent({
            scopes: ['User.Read', 'GroupMember.Read.All'],
            account: account,
          });

          if (response?.accessToken) {
            // Exchange token with backend to get our JWT
            const backendToken = await exchangeTokenForBackend(response.accessToken);
            
            // Create user data from MSAL account
            const userData = {
              id: account.homeAccountId,
              displayName: account.name,
              email: account.username,
              jobTitle: '',
              department: ''
            };
            
            await login(backendToken, userData);
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('MSAL account sync failed:', error);
        setLoading(false);
      }
    };

    // Delay to let MSAL initialize completely
    const timeoutId = setTimeout(checkMsalAccounts, 500);
    return () => clearTimeout(timeoutId);
  }, [instance]);

  const login = async (backendToken, userData) => {
    localStorage.setItem('authToken', backendToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(backendToken);
    setUser(userData);
    setLoading(false);
    // Navigate to dashboard after successful login
    navigate('/dashboard');
  };

  const loginWithMSAL = async () => {
    try {
      const loginRequest = {
        scopes: ['User.Read', 'GroupMember.Read.All'],
        prompt: 'select_account',
      };
      
      await instance.loginRedirect(loginRequest);
      // Redirect happens, this function won't complete
    } catch (error) {
      console.error('MSAL Login failed:', error);
      throw error;
    }
  };

  const exchangeTokenForBackend = async (msalToken) => {
    try {
      const response = await fetch('http://localhost:5216/api/auth/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: msalToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to exchange token with backend');
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear local state first
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      
      // Navigate to login page
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: force redirect to login
      navigate('/login');
    }
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  const getAuthHeaders = () => {
    if (!token) return {};
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const value = {
    user,
    token,
    loading,
    login,
    loginWithMSAL,
    logout,
    isAuthenticated,
    getAuthHeaders
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};