import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/api/auth';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  language: string;
  isSuperAdmin: boolean;
  activeTenantId: string;
  role: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  isDefault: boolean;
}

interface AuthState {
  user: AuthUser | null;
  tenants: TenantInfo[];
  tenantId: string | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuth: () => void;
  switchTenant: (tenantId: string) => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
  isAuthenticated: () => boolean;
}

/**
 * Check if the httpOnly auth cookie exists by attempting /auth/me.
 * The cookie itself is not readable by JS, but its presence
 * is indicated by the opsweave_csrf cookie.
 */
function hasCsrfCookie(): boolean {
  return document.cookie.includes('opsweave_csrf=');
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenants: [],
      tenantId: null,
      token: null, // Kept for backward compat but no longer the primary auth mechanism
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { user, token, tenants } = response;

          set({
            user,
            token, // Still stored for API client backward compat
            tenants,
            tenantId: user.activeTenantId,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Login failed';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore errors during logout
        } finally {
          set({
            user: null,
            token: null,
            tenants: [],
            tenantId: null,
            error: null,
          });
        }
      },

      // Synchronous state clear — used by the API client on 401 without calling the server
      clearAuth: () => {
        set({ user: null, token: null, tenants: [], tenantId: null, error: null });
      },

      switchTenant: (tenantId: string) => {
        set({ tenantId });
      },

      setUser: (user: AuthUser | null) => {
        set({ user });
      },

      setToken: (token: string | null) => {
        set({ token });
      },

      clearError: () => {
        set({ error: null });
      },

      isAuthenticated: () => {
        const state = get();
        // Primary: check httpOnly cookie presence via CSRF cookie
        // Fallback: check token in store (backward compat)
        return (hasCsrfCookie() || state.token !== null) && state.user !== null;
      },
    }),
    {
      name: 'opsweave_auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        tenantId: state.tenantId,
        tenants: state.tenants,
      }),
    },
  ),
);
