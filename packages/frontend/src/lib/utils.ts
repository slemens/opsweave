import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string using Intl.DateTimeFormat.
 * Respects the user's locale for proper formatting.
 */
export function formatDate(
  dateStr: string,
  locale = 'de-DE',
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(date);
}

/**
 * Format a relative time (e.g. "2 hours ago") using Intl.RelativeTimeFormat.
 */
export function formatRelativeTime(dateStr: string, locale = 'de-DE'): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, 'day');
  }
  if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, 'hour');
  }
  if (Math.abs(diffMinutes) >= 1) {
    return rtf.format(diffMinutes, 'minute');
  }
  return rtf.format(diffSeconds, 'second');
}

/**
 * Copy text to clipboard with fallback for non-secure contexts (HTTP).
 * Uses the Clipboard API when available, falls back to execCommand('copy').
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first (requires secure context / HTTPS)
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard API failed (e.g. not in secure context), fall through to legacy
    }
  }

  // Legacy fallback using execCommand('copy')
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Position off-screen to avoid visual flash
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
