import type { Response, CookieOptions } from 'express';
import { config } from '../config/index.js';

const TOKEN_COOKIE = 'opsweave_token';
const CSRF_COOKIE = 'opsweave_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Cookie options for the httpOnly JWT token cookie.
 */
function tokenCookieOptions(): CookieOptions {
  const isProduction = config.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api',
    maxAge: parseExpiry(config.jwtExpiresIn),
  };
}

/**
 * Cookie options for the CSRF cookie (readable by JavaScript).
 */
function csrfCookieOptions(): CookieOptions {
  const isProduction = config.nodeEnv === 'production';
  return {
    httpOnly: false, // Must be readable by frontend JS
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: parseExpiry(config.jwtExpiresIn),
  };
}

/**
 * Set auth cookies (httpOnly JWT + CSRF token) on a response.
 */
export function setAuthCookies(res: Response, token: string, csrfToken: string): void {
  res.cookie(TOKEN_COOKIE, token, tokenCookieOptions());
  res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions());
}

/**
 * Clear auth cookies on logout.
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(TOKEN_COOKIE, { path: '/api' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

/**
 * Read the JWT token from the cookie.
 */
export function getTokenFromCookie(cookies: Record<string, string> | undefined): string | null {
  return cookies?.[TOKEN_COOKIE] ?? null;
}

/**
 * Parse JWT expiry string (e.g., '8h', '1d', '30m') to milliseconds.
 */
function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 8 * 60 * 60 * 1000; // default 8h
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 3600000);
}
