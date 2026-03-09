#!/usr/bin/env tsx
/**
 * i18n Completeness Checker
 *
 * Compares all German (de) and English (en) locale JSON files,
 * reports any keys that exist in one language but not the other.
 *
 * Usage: tsx scripts/check-i18n-completeness.ts
 * Exit code 0 = complete, 1 = missing keys found
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const LOCALES_DIR = path.resolve(__dirname, '../packages/frontend/src/i18n/locales');
const LANGUAGES = ['de', 'en'] as const;
const LOCALE_FILES = [
  'common.json',
  'tickets.json',
  'cmdb.json',
  'workflows.json',
  'catalog.json',
  'compliance.json',
  'settings.json',
  'kb.json',
  'email.json',
  'portal.json',
];

type NestedObject = { [key: string]: string | NestedObject };

function getAllKeys(obj: NestedObject, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as NestedObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadJson(filePath: string): NestedObject | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as NestedObject;
}

function findMissingKeys(sourceKeys: string[], targetKeys: Set<string>): string[] {
  return sourceKeys.filter((key) => !targetKeys.has(key));
}

function main(): void {
  let totalMissing = 0;
  const results: { file: string; lang: string; missing: string[] }[] = [];

  for (const file of LOCALE_FILES) {
    const dePath = path.join(LOCALES_DIR, 'de', file);
    const enPath = path.join(LOCALES_DIR, 'en', file);

    const deData = loadJson(dePath);
    const enData = loadJson(enPath);

    if (deData === null && enData === null) {
      console.warn(`  SKIP: ${file} — not found in either language`);
      continue;
    }

    const deKeys = deData ? getAllKeys(deData) : [];
    const enKeys = enData ? getAllKeys(enData) : [];
    const deKeySet = new Set(deKeys);
    const enKeySet = new Set(enKeys);

    // Keys in DE but missing in EN
    const missingInEn = findMissingKeys(deKeys, enKeySet);
    if (missingInEn.length > 0) {
      results.push({ file, lang: 'en', missing: missingInEn });
      totalMissing += missingInEn.length;
    }

    // Keys in EN but missing in DE
    const missingInDe = findMissingKeys(enKeys, deKeySet);
    if (missingInDe.length > 0) {
      results.push({ file, lang: 'de', missing: missingInDe });
      totalMissing += missingInDe.length;
    }

    // Per-file summary
    const deCount = deKeys.length;
    const enCount = enKeys.length;
    const status = missingInEn.length === 0 && missingInDe.length === 0 ? '✓' : '✗';
    console.log(`  ${status} ${file}  (de: ${deCount} keys, en: ${enCount} keys)`);
  }

  console.log('');

  if (results.length > 0) {
    console.log('Missing keys:');
    console.log('─'.repeat(60));
    for (const { file, lang, missing } of results) {
      console.log(`\n  ${file} — missing in ${lang.toUpperCase()} (${missing.length}):`);
      for (const key of missing) {
        console.log(`    - ${key}`);
      }
    }
    console.log('');
    console.log(`FAIL: ${totalMissing} missing key(s) found across ${results.length} file/language combination(s).`);
    process.exit(1);
  } else {
    console.log('OK: All i18n keys are complete across DE and EN.');
    process.exit(0);
  }
}

console.log('i18n Completeness Check');
console.log('═'.repeat(60));
console.log(`  Locales dir: ${LOCALES_DIR}`);
console.log(`  Files: ${LOCALE_FILES.length}`);
console.log('─'.repeat(60));
main();
