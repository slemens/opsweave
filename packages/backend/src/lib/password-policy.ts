/**
 * Password Policy — Configurable per tenant via tenants.settings JSON.
 *
 * Default policy (Community): min 8 chars, no other requirements.
 * Tenants can configure stricter policies in Settings → Organization.
 */

import bcrypt from 'bcryptjs';

// ─── Types ──────────────────────────────────────────────

export interface PasswordPolicy {
  /** Minimum password length (default: 8) */
  min_length: number;
  /** Require at least one uppercase letter (default: false) */
  require_uppercase: boolean;
  /** Require at least one lowercase letter (default: false) */
  require_lowercase: boolean;
  /** Require at least one digit (default: false) */
  require_digit: boolean;
  /** Require at least one special character (default: false) */
  require_special: boolean;
  /** Password expiry in days, 0 = never expires (default: 0) */
  expiry_days: number;
  /** Number of previous passwords to remember (default: 0) */
  history_count: number;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  min_length: 8,
  require_uppercase: false,
  require_lowercase: false,
  require_digit: false,
  require_special: false,
  expiry_days: 0,
  history_count: 0,
};

// ─── Validation ─────────────────────────────────────────

export interface PolicyViolation {
  rule: string;
  message: string;
}

/**
 * Validate a password against the given policy.
 * Returns an array of violations (empty = valid).
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy,
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  if (password.length < policy.min_length) {
    violations.push({
      rule: 'min_length',
      message: `Password must be at least ${policy.min_length} characters`,
    });
  }

  if (policy.require_uppercase && !/[A-Z]/.test(password)) {
    violations.push({
      rule: 'require_uppercase',
      message: 'Password must contain at least one uppercase letter',
    });
  }

  if (policy.require_lowercase && !/[a-z]/.test(password)) {
    violations.push({
      rule: 'require_lowercase',
      message: 'Password must contain at least one lowercase letter',
    });
  }

  if (policy.require_digit && !/\d/.test(password)) {
    violations.push({
      rule: 'require_digit',
      message: 'Password must contain at least one digit',
    });
  }

  if (policy.require_special && !/[^A-Za-z0-9]/.test(password)) {
    violations.push({
      rule: 'require_special',
      message: 'Password must contain at least one special character',
    });
  }

  return violations;
}

/**
 * Check if a password matches any of the stored password hashes (history).
 * Returns true if the password was used before.
 */
export async function isPasswordInHistory(
  password: string,
  historyHashes: string[],
): Promise<boolean> {
  for (const hash of historyHashes) {
    const matches = await bcrypt.compare(password, hash);
    if (matches) return true;
  }
  return false;
}

/**
 * Check if a user's password has expired.
 * Returns true if expired, false if still valid or policy has no expiry.
 */
export function isPasswordExpired(
  passwordChangedAt: string | null,
  policy: PasswordPolicy,
): boolean {
  if (policy.expiry_days <= 0) return false;
  if (!passwordChangedAt) return true; // Never changed = expired if policy requires it

  const changedDate = new Date(passwordChangedAt);
  const expiryDate = new Date(changedDate.getTime() + policy.expiry_days * 24 * 60 * 60 * 1000);
  return new Date() > expiryDate;
}

/**
 * Parse password policy from tenant settings JSON.
 * Returns the policy merged with defaults.
 */
export function parsePolicyFromSettings(
  settings: Record<string, unknown>,
): PasswordPolicy {
  const raw = settings['password_policy'] as Partial<PasswordPolicy> | undefined;
  if (!raw) return { ...DEFAULT_PASSWORD_POLICY };

  return {
    min_length: typeof raw.min_length === 'number' ? Math.max(8, Math.min(128, raw.min_length)) : DEFAULT_PASSWORD_POLICY.min_length,
    require_uppercase: typeof raw.require_uppercase === 'boolean' ? raw.require_uppercase : DEFAULT_PASSWORD_POLICY.require_uppercase,
    require_lowercase: typeof raw.require_lowercase === 'boolean' ? raw.require_lowercase : DEFAULT_PASSWORD_POLICY.require_lowercase,
    require_digit: typeof raw.require_digit === 'boolean' ? raw.require_digit : DEFAULT_PASSWORD_POLICY.require_digit,
    require_special: typeof raw.require_special === 'boolean' ? raw.require_special : DEFAULT_PASSWORD_POLICY.require_special,
    expiry_days: typeof raw.expiry_days === 'number' ? Math.max(0, Math.min(365, raw.expiry_days)) : DEFAULT_PASSWORD_POLICY.expiry_days,
    history_count: typeof raw.history_count === 'number' ? Math.max(0, Math.min(24, raw.history_count)) : DEFAULT_PASSWORD_POLICY.history_count,
  };
}
