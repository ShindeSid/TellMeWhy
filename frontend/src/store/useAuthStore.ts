import { create } from "zustand";

import { ApiRequestError, login as apiLogin, logout as apiLogout, me, setAuthToken, signup as apiSignup } from "@/lib/api";
import type { AuthUser } from "@/types/api";

const TOKEN_STORAGE_KEY = "tellmewhy.auth-token";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;

  signup: (email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

function persistToken(token: string | null) {
  setAuthToken(token);
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  signup: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiSignup(email, password);
      persistToken(res.token);
      set({ user: res.user, isLoading: false });
      return true;
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Signup failed";
      set({ isLoading: false, error: message });
      return false;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiLogin(email, password);
      persistToken(res.token);
      set({ user: res.user, isLoading: false });
      return true;
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Login failed";
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: async () => {
    try {
      await apiLogout();
    } catch {
      // token already invalid/expired - fine, we're clearing it locally anyway
    }
    persistToken(null);
    set({ user: null });
  },

  restoreSession: async () => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return;
    setAuthToken(stored);
    try {
      const user = await me();
      if (user) {
        set({ user });
      } else {
        persistToken(null); // expired
      }
    } catch {
      persistToken(null);
    }
  },

  clearError: () => set({ error: null }),
}));
