import type { Request, Response, NextFunction } from 'express';

import { config } from '../config/index.js';

const SUPPORTED_LANGUAGES = ['de', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

/**
 * Resolves the request language from (in order of priority):
 * 1. `?lang=` query parameter
 * 2. `Accept-Language` header (first matching supported language)
 * 3. Authenticated user's stored language preference
 * 4. Application default language
 *
 * Sets `req.language` for downstream usage (i18n, error messages).
 */
export function languageMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // 1. Explicit query parameter
  const queryLang = req.query['lang'];
  if (typeof queryLang === 'string' && isSupportedLanguage(queryLang)) {
    req.language = queryLang;
    next();
    return;
  }

  // 2. Accept-Language header
  const acceptLang = req.headers['accept-language'];
  if (acceptLang) {
    // Parse "de-DE,de;q=0.9,en;q=0.8" → extract primary tags
    const tags = acceptLang
      .split(',')
      .map((part) => part.split(';')[0]?.trim().split('-')[0]?.toLowerCase())
      .filter((tag): tag is string => tag !== undefined);

    for (const tag of tags) {
      if (isSupportedLanguage(tag)) {
        req.language = tag;
        next();
        return;
      }
    }
  }

  // 3. Fallback to default
  req.language = config.defaultLanguage as SupportedLanguage;
  next();
}
