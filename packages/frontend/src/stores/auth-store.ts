import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, TenantRole } from '@opsweave/shared';
import { authApi } from '@/api/auth';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  language: 'de' | 'en';
  is_superadmin: boolean;
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    role: TenantRole;
    is_default: boolean;
  }>;
}

interface AuthState {
  user: AuthUser | null;
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
      tenantId: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { user, token } = response;

          const defaultTenant = user.tenants.find((t) => t.is_default);
          const tenantId = defaultTenant?.id ?? user.tenants[0]?.id ?? null;

          set({
            user,
            token,
            tenantId,
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
        token: state.token,
        tenantId: state.tenantId,
      }),
    },
  ),
);
