import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { checkSession, loginUser, logoutUser, registerUser } from '../services/api';
import { User, LoginFormData, RegisterFormData, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (data: LoginFormData) => Promise<User>;
  register: (data: RegisterFormData) => Promise<User>;
  logout: () => Promise<void>;
}

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null
};

// Create empty functions that satisfy the type requirements
const dummyLogin = async (): Promise<User> => {
  throw new Error('Login not implemented');
};

const dummyRegister = async (): Promise<User> => {
  throw new Error('Register not implemented');
};

const dummyLogout = async (): Promise<void> => {
  throw new Error('Logout not implemented');
};

export const AuthContext = createContext<AuthContextType>({
  ...defaultAuthState,
  login: dummyLogin,
  register: dummyRegister,
  logout: dummyLogout
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { isAuthenticated, user } = await checkSession();
        setAuthState({
          isAuthenticated,
          user: user || null,
          loading: false,
          error: null
        });
      } catch (error) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: 'Failed to check authentication status'
        });
      }
    };

    checkAuth();
  }, []);

  const login = async (data: LoginFormData): Promise<User> => {
    console.log('AuthContext: Starting login process');
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await loginUser(data);
      console.log('AuthContext: Login successful, user:', user);
      setAuthState({
        isAuthenticated: true,
        user,
        loading: false,
        error: null
      });
      return user;
    } catch (error: any) {
      console.error('AuthContext: Login error:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: error.response?.data?.message || 'Login failed'
      });
      throw error;
    }
  };

  const register = async (data: RegisterFormData): Promise<User> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await registerUser(data);
      setAuthState({
        isAuthenticated: true,
        user,
        loading: false,
        error: null
      });
      return user;
    } catch (error: any) {
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: error.response?.data?.message || 'Registration failed'
      });
      throw error;
    }
  };

  const logout = async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    try {
      await logoutUser();
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null
      });
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Logout failed'
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};