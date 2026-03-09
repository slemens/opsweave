// =============================================================================
// OpsWeave — License Types & Validation Helpers
// =============================================================================
// Offline JWT (RS256) licensing. Public key in the app, private key with us.
// Community Edition = no key = default limits apply.
// NEVER hard-block features — soft warning + limit hint.
// =============================================================================

import { COMMUNITY_LIMITS } from '../constants/index.js';

// ---------------------------------------------------------------------------
// License Payload (JWT Claims)
// ---------------------------------------------------------------------------

export interface LicenseFeatures {
  oidcAuth: boolean;
  samlAuth: boolean;
  verticalCatalogs: boolean;
  advancedReporting: boolean;
  customerPortal: boolean;
  emailInbound: boolean;
}

export interface LicenseLimits {
  maxAssets: number; // -1 = unlimited
  maxUsers: number;
  maxWorkflows: number;
  maxFrameworks: number;
  maxMonitoringSources: number;
}

export interface LicensePayload {
  iss: 'opsweave';
  sub: string; // Tenant / customer name
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expiration (Unix timestamp)
  edition: 'enterprise';
  limits: LicenseLimits;
  features: LicenseFeatures;
}

// ---------------------------------------------------------------------------
// Effective Limits (resolved from license or community defaults)
// ---------------------------------------------------------------------------

export interface EffectiveLimits {
  limits: LicenseLimits;
  features: LicenseFeatures;
  edition: 'community' | 'enterprise';
  isExpired: boolean;
}

// ---------------------------------------------------------------------------
// Community Defaults
// ---------------------------------------------------------------------------

export const COMMUNITY_LICENSE_LIMITS: LicenseLimits = {
  maxAssets: COMMUNITY_LIMITS.maxAssets,
  maxUsers: COMMUNITY_LIMITS.maxUsers,
  maxWorkflows: COMMUNITY_LIMITS.maxWorkflows,
  maxFrameworks: COMMUNITY_LIMITS.maxFrameworks,
  maxMonitoringSources: COMMUNITY_LIMITS.maxMonitoringSources,
};

export const COMMUNITY_LICENSE_FEATURES: LicenseFeatures = {
  oidcAuth: false,
  samlAuth: false,
  verticalCatalogs: false,
  advancedReporting: false,
  customerPortal: false,
  emailInbound: false,
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Check whether the current count is within the allowed limit.
 * A limit of -1 means unlimited.
 */
export function isWithinLimit(current: number, limit: number): boolean {
  if (limit === -1) return true;
  return current < limit;
}

/**
 * Check whether a license payload has expired.
 * Compares the `exp` claim against the current time.
 */
export function isLicenseExpired(license: LicensePayload): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return license.exp < nowSeconds;
}

/**
 * Resolve effective limits from a license payload.
 * If no license is provided (Community Edition) or the license is expired,
 * community defaults are returned.
 */
export function getEffectiveLimits(
  license: LicensePayload | null,
): EffectiveLimits {
  // No license → Community Edition
  if (!license) {
    return {
      limits: { ...COMMUNITY_LICENSE_LIMITS },
      features: { ...COMMUNITY_LICENSE_FEATURES },
      edition: 'community',
      isExpired: false,
    };
  }

  // Expired license → fall back to Community limits
  const expired = isLicenseExpired(license);
  if (expired) {
    return {
      limits: { ...COMMUNITY_LICENSE_LIMITS },
      features: { ...COMMUNITY_LICENSE_FEATURES },
      edition: 'enterprise', // still enterprise, but expired
      isExpired: true,
    };
  }

  // Valid Enterprise license
  return {
    limits: { ...license.limits },
    features: { ...license.features },
    edition: 'enterprise',
    isExpired: false,
  };
}

/**
 * Check whether a specific feature is enabled for the given license.
 * Community edition always returns false for enterprise features.
 */
export function isFeatureEnabled(
  license: LicensePayload | null,
  feature: keyof LicenseFeatures,
): boolean {
  const effective = getEffectiveLimits(license);
  return effective.features[feature];
}
