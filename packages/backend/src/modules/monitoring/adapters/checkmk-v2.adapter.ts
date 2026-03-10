import type { MonitoringAdapter, NormalizedEvent } from './types.js';
import logger from '../../../lib/logger.js';

/**
 * Check_MK 2.x REST API adapter.
 *
 * Connects to the Check_MK REST API and fetches services/hosts with non-OK states.
 * Config expected:
 *   url: string        — e.g. "https://checkmk.example.com/site/check_mk/api/1.0"
 *   username: string   — automation user
 *   password: string   — automation secret
 *   api_key: string    — alternative: Bearer token
 */

// Check_MK state mapping: 0=OK, 1=WARN, 2=CRIT, 3=UNKNOWN
const STATE_MAP: Record<number, NormalizedEvent['state']> = {
  0: 'ok',
  1: 'warning',
  2: 'critical',
  3: 'unknown',
};

// Host state mapping: 0=UP, 1=DOWN, 2=UNREACHABLE
const HOST_STATE_MAP: Record<number, NormalizedEvent['state']> = {
  0: 'ok',
  1: 'critical',
  2: 'unknown',
};

interface CheckMkServiceEntry {
  extensions: {
    host_name: string;
    description: string;
    state: number;
    plugin_output: string;
    last_state_change: number;
  };
  id: string;
}

interface CheckMkHostEntry {
  extensions: {
    name: string;
    state: number;
    plugin_output?: string;
    last_state_change: number;
  };
  id: string;
}

interface CheckMkResponse<T> {
  value: T[];
}

function buildHeaders(config: Record<string, unknown>): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (config.api_key) {
    headers['Authorization'] = `Bearer ${config.api_key}`;
  } else if (config.username && config.password) {
    headers['Authorization'] = `Bearer ${config.username} ${config.password}`;
  }

  return headers;
}

export const checkmkV2Adapter: MonitoringAdapter = {
  name: 'checkmk_v2',

  async fetchEvents(config: Record<string, unknown>): Promise<NormalizedEvent[]> {
    const baseUrl = (config.url as string)?.replace(/\/$/, '');
    if (!baseUrl) throw new Error('Check_MK URL not configured');

    const headers = buildHeaders(config);
    const events: NormalizedEvent[] = [];

    // Fetch services with non-OK state
    try {
      const serviceUrl = `${baseUrl}/domain-types/service/collections/all?columns=host_name&columns=description&columns=state&columns=plugin_output&columns=last_state_change&query=%7B%22op%22%3A%22not%22%2C%22expr%22%3A%7B%22op%22%3A%22%3D%22%2C%22left%22%3A%22state%22%2C%22right%22%3A%220%22%7D%7D`;

      const serviceRes = await fetch(serviceUrl, { headers, signal: AbortSignal.timeout(30_000) });
      if (serviceRes.ok) {
        const data = (await serviceRes.json()) as CheckMkResponse<CheckMkServiceEntry>;
        for (const svc of data.value ?? []) {
          events.push({
            hostname: svc.extensions.host_name,
            service_name: svc.extensions.description,
            state: STATE_MAP[svc.extensions.state] ?? 'unknown',
            output: svc.extensions.plugin_output || null,
            external_id: svc.id || null,
          });
        }
      } else {
        logger.warn({ status: serviceRes.status }, '[checkmk-v2] Failed to fetch services');
      }
    } catch (err) {
      logger.error({ err }, '[checkmk-v2] Error fetching services');
    }

    // Fetch hosts with non-UP state
    try {
      const hostUrl = `${baseUrl}/domain-types/host/collections/all?columns=name&columns=state&columns=plugin_output&columns=last_state_change&query=%7B%22op%22%3A%22not%22%2C%22expr%22%3A%7B%22op%22%3A%22%3D%22%2C%22left%22%3A%22state%22%2C%22right%22%3A%220%22%7D%7D`;

      const hostRes = await fetch(hostUrl, { headers, signal: AbortSignal.timeout(30_000) });
      if (hostRes.ok) {
        const data = (await hostRes.json()) as CheckMkResponse<CheckMkHostEntry>;
        for (const host of data.value ?? []) {
          events.push({
            hostname: host.extensions.name,
            service_name: null,
            state: HOST_STATE_MAP[host.extensions.state] ?? 'unknown',
            output: host.extensions.plugin_output || null,
            external_id: host.id || null,
          });
        }
      } else {
        logger.warn({ status: hostRes.status }, '[checkmk-v2] Failed to fetch hosts');
      }
    } catch (err) {
      logger.error({ err }, '[checkmk-v2] Error fetching hosts');
    }

    return events;
  },

  async testConnection(config: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    const baseUrl = (config.url as string)?.replace(/\/$/, '');
    if (!baseUrl) return { ok: false, error: 'URL not configured' };

    try {
      const headers = buildHeaders(config);
      const res = await fetch(`${baseUrl}/domain-types/host/collections/all?limit=1`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) return { ok: true };
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
    }
  },
};
