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
  switchTenant: (tenantId: string) => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenants: [],
      tenantId: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { user, token, tenants } = response;

          set({
            user,
            token,
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
        return state.token !== null && state.user !== null;
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
