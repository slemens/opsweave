// =============================================================================
// OpsWeave — Attribute Schema Utilities (Evo-3E)
// =============================================================================

import type { AttributeDefinition } from '@opsweave/shared';

/**
 * Safely parse a JSON string into an array of AttributeDefinition.
 * Returns an empty array on invalid input.
 */
export function parseAttributeSchema(json: string | null | undefined): AttributeDefinition[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed as AttributeDefinition[];
  } catch {
    return [];
  }
}

/**
 * Get the localized label string for the given locale.
 * Falls back to 'de' if the locale key is not found.
 */
export function getLocalizedLabel(
  label: { de: string; en: string },
  locale: string,
): string {
  const lang = locale.startsWith('en') ? 'en' : 'de';
  return label[lang] || label.de || '';
}

/**
 * Validate a single attribute value against its definition.
 * Returns an error message string, or null if valid.
 */
export function validateAttributeValue(
  def: AttributeDefinition,
  value: unknown,
): string | null {
  // Required check
  if (def.required) {
    if (value === undefined || value === null || value === '') {
      return 'required';
    }
    if (def.type === 'multiselect' && Array.isArray(value) && value.length === 0) {
      return 'required';
    }
  }

  // Skip further validation if empty and not required
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const validation = def.validation;

  switch (def.type) {
    case 'number': {
      const num = Number(value);
      if (isNaN(num)) return 'invalid_number';
      if (validation?.min !== undefined && num < validation.min) return 'min';
      if (validation?.max !== undefined && num > validation.max) return 'max';
      break;
    }
    case 'text':
    case 'url':
    case 'ip_address': {
      const str = String(value);
      if (validation?.pattern) {
        try {
          const re = new RegExp(validation.pattern);
          if (!re.test(str)) return 'pattern';
        } catch {
          // Invalid pattern — skip validation
        }
      }
      if (validation?.min !== undefined && str.length < validation.min) return 'min_length';
      if (validation?.max !== undefined && str.length > validation.max) return 'max_length';
      break;
    }
    case 'select': {
      if (def.options && !def.options.some((o) => o.value === value)) {
        return 'invalid_option';
      }
      break;
    }
    case 'multiselect': {
      if (!Array.isArray(value)) return 'invalid_multiselect';
      if (def.options) {
        const validValues = new Set(def.options.map((o) => o.value));
        for (const v of value) {
          if (!validValues.has(String(v))) return 'invalid_option';
        }
      }
      break;
    }
  }

  return null;
}

/**
 * Build a Record of default values from a schema.
 * Uses each definition's `default_value` if set, otherwise
 * an appropriate zero value for the type.
 */
export function getDefaultValues(
  schema: AttributeDefinition[],
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const def of schema) {
    if (def.default_value !== undefined) {
      defaults[def.key] = def.default_value;
    } else {
      switch (def.type) {
        case 'boolean':
          defaults[def.key] = false;
          break;
        case 'number':
          defaults[def.key] = null;
          break;
        case 'multiselect':
          defaults[def.key] = [];
          break;
        default:
          defaults[def.key] = '';
          break;
      }
    }
  }
  return defaults;
}
