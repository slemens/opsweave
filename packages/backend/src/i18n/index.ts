import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialise i18next for the backend.
 *
 * Loads translation JSON files from `src/i18n/locales/`.
 * Default and fallback language: German ('de').
 * Supported: 'de', 'en'.
 */
export async function initI18n(): Promise<typeof i18next> {
  await i18next.use(Backend).init({
    lng: config.defaultLanguage,
    fallbackLng: 'de',
    supportedLngs: ['de', 'en'],
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: path.join(__dirname, 'locales', '{{lng}}.json'),
    },
    interpolation: {
      escapeValue: false,
    },
  });

  return i18next;
}

/**
 * Get a translation function for the given language.
 * Falls back to the default language if unsupported.
 */
export function t(key: string, language?: string, options?: Record<string, unknown>): string {
  const lng = language ?? config.defaultLanguage;
  return i18next.t(key, { lng, ...options });
}

export { i18next };
