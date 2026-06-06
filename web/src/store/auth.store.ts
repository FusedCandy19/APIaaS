import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  role: string;
  plan: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  updateUserPlan: (plan: string) => void;
}

// Helper to get initial state from localStorage
const getStoredAuth = () => {
  try {
    const user = localStorage.getItem('apiaas_user');
    const accessToken = localStorage.getItem('apiaas_access');
    const refreshToken = localStorage.getItem('apiaas_refresh');

    if (user && accessToken && refreshToken) {
      return {
        user: JSON.parse(user) as User,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      };
    }
  } catch (e) {
    console.error('Failed to parse stored auth', e);
  }
  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  };
};

const initialAuth = getStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  ...initialAuth,
  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('apiaas_user', JSON.stringify(user));
    localStorage.setItem('apiaas_access', accessToken);
    localStorage.setItem('apiaas_refresh', refreshToken);
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('apiaas_user');
    localStorage.removeItem('apiaas_access');
    localStorage.removeItem('apiaas_refresh');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
  setAccessToken: (accessToken) => {
    localStorage.setItem('apiaas_access', accessToken);
    set({ accessToken });
  },
  updateUserPlan: (plan) => {
    set((state) => {
      if (state.user) {
        const updatedUser = { ...state.user, plan };
        localStorage.setItem('apiaas_user', JSON.stringify(updatedUser));
        return { user: updatedUser };
      }
      return {};
    });
  },
}));
