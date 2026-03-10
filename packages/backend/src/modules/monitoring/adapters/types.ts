/**
 * Common interface for all monitoring adapters.
 * Each adapter (Check_MK, Zabbix, Prometheus, etc.) implements this interface
 * to normalize events into the OpsWeave event model.
 */

export interface NormalizedEvent {
  hostname: string;
  service_name: string | null;
  state: 'ok' | 'warning' | 'critical' | 'unknown';
  output: string | null;
  external_id: string | null;
}

export interface MonitoringAdapter {
  name: string;
  fetchEvents(config: Record<string, unknown>): Promise<NormalizedEvent[]>;
  testConnection(config: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
}
