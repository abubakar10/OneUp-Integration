import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingAuth, setProcessingAuth] = useState(true);
  
  const { loginWithMSAL, isAuthenticated } = useAuth();
  const { instance, inProgress } = useMsal();
  const isMsalAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the intended destination or default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';

  // Wait for MSAL to initialize and check authentication status
  useEffect(() => {
    // Wait for MSAL to finish initialization
    if (inProgress === "startup" || inProgress === "handleRedirect") {
      return;
    }

    // Check if user is authenticated through our context
    if (isAuthenticated()) {
      navigate(from, { replace: true });
      return;
    }

    // If MSAL shows user is authenticated but not in our context,
    // let AuthContext handle the token exchange and sync
    if (isMsalAuthenticated) {
      // Give AuthContext time to handle the authentication
      setTimeout(() => {
        if (isAuthenticated()) {
          navigate(from, { replace: true });
        } else {
          setProcessingAuth(false);
        }
      }, 1000);
      return;
    }

    // No authentication found, show login form
    setProcessingAuth(false);
  }, [inProgress, isAuthenticated, isMsalAuthenticated, navigate, from]);

  // Handle OAuth callback (legacy)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const urlError = urlParams.get('error');

    if (urlError) {
      setError('Authentication failed. Please try again.');
      return;
    }

    if (code) {
      handleOAuthCallback(code);
    }
  }, []);

  const handleOAuthCallback = async (code) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5216/api/auth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const data = await response.json();
      
      // Store authentication data
      login(data.token, data.user);
      
      // Redirect to intended destination
      navigate(from, { replace: true });
      
    } catch (err) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await loginWithMSAL();
      // Redirect will be handled by the useEffect above
    } catch (err) {
      setError(err.message || 'Failed to authenticate with Microsoft 365');
      setLoading(false);
    }
  };

  // Show loading screen while processing authentication
  if (processingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Processing authentication...</h2>
          <p className="text-sm text-gray-600">Please wait while we complete your login.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
            </svg>
          </div>
          <h2 className="mt-6 flex items-center justify-center text-3xl font-extrabold text-gray-900">
            OneUp Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in with your Microsoft 365 account to access the dashboard
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586.

10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error}
                </h3>
              </div>
            </div>
          </div>
        )}

        <div>
          <button
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Redirecting to Microsoft...
              </div>
            ) : (
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                </svg>
                Sign in with Microsoft 365
              </div>
            )}
          </button>
        </div>

        <div className="text-center">
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">ITCS Organization Access</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            This application is restricted to ITCS organization members.
            Contact your administrator if you cannot access the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;