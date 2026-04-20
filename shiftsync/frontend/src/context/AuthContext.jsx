import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  employee: null,
  accessToken: localStorage.getItem('accessToken'),
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        employee: action.payload.employee,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false, accessToken: null };
    case 'UPDATE_EMPLOYEE':
      return { ...state, employee: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      try {
        const { data } = await authAPI.me();
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: data.data.user,
            employee: data.data.employee,
            accessToken: token,
          },
        });
      } catch {
        localStorage.removeItem('accessToken');
        dispatch({ type: 'LOGOUT' });
      }
    };
    loadUser();
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authAPI.login(credentials);
    localStorage.setItem('accessToken', data.data.accessToken);
    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: {
        user: data.data.user,
        employee: data.data.employee,
        accessToken: data.data.accessToken,
      },
    });
    return data.data;
  }, []);

  const register = useCallback(async (userData) => {
    const { data } = await authAPI.register(userData);
    localStorage.setItem('accessToken', data.data.accessToken);
    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: {
        user: data.data.user,
        employee: data.data.employee,
        accessToken: data.data.accessToken,
      },
    });
    return data.data;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('accessToken');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const isAdmin = state.user?.role === 'admin';
  const isManager = state.user?.role === 'manager';
  const isEmployee = state.user?.role === 'employee';
  const canManage = isAdmin || isManager;

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, isAdmin, isManager, isEmployee, canManage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
