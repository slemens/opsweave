import type { MonitoringAdapter } from './types.js';
import { checkmkV2Adapter } from './checkmk-v2.adapter.js';

export type { MonitoringAdapter, NormalizedEvent } from './types.js';

const adapterRegistry: Record<string, MonitoringAdapter> = {
  checkmk_v2: checkmkV2Adapter,
};

/**
 * Get the adapter for a monitoring source type.
 * Returns undefined for types that only support webhook ingestion (no polling).
 */
export function getAdapter(type: string): MonitoringAdapter | undefined {
  return adapterRegistry[type];
}
