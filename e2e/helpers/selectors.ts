/**
 * Selector utilities for Playwright E2E tests.
 *
 * Prefer data-testid attributes for stable selectors that survive
 * refactors. Use these helpers for consistency across all tests.
 */

/**
 * Returns a CSS selector targeting `[data-testid="<id>"]`.
 */
export function byTestId(id: string): string {
  return `[data-testid="${id}"]`;
}

/**
 * Returns a CSS selector targeting a data-testid within a parent data-testid.
 */
export function byNestedTestId(parentId: string, childId: string): string {
  return `[data-testid="${parentId}"] [data-testid="${childId}"]`;
}

// ─── Common page selectors ───────────────────────────────────

export const selectors = {
  // Layout
  sidebar: byTestId('sidebar'),
  header: byTestId('header'),
  mainContent: byTestId('main-content'),

  // Auth
  loginForm: byTestId('login-form'),
  emailInput: byTestId('login-email'),
  passwordInput: byTestId('login-password'),
  loginButton: byTestId('login-submit'),
  logoutButton: byTestId('logout-button'),

  // Dashboard
  dashboard: byTestId('dashboard'),
  dashboardStats: byTestId('dashboard-stats'),

  // Tickets
  ticketBoard: byTestId('ticket-board'),
  ticketCard: byTestId('ticket-card'),
  ticketDetail: byTestId('ticket-detail'),
  ticketCreateButton: byTestId('ticket-create'),

  // Assets
  assetList: byTestId('asset-list'),
  assetDetail: byTestId('asset-detail'),
  assetCreateButton: byTestId('asset-create'),

  // Navigation
  navTickets: byTestId('nav-tickets'),
  navAssets: byTestId('nav-assets'),
  navSettings: byTestId('nav-settings'),

  // Common
  loadingSpinner: byTestId('loading'),
  emptyState: byTestId('empty-state'),
  errorState: byTestId('error-state'),
  toast: byTestId('toast'),
} as const;
