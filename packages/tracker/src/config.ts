/**
 * Tracker configuration.
 *
 * Values are resolved with the following precedence (lowest → highest):
 *   1. built-in defaults
 *   2. `window.CausalFunnelConfig` (set before the script loads)
 *   3. `data-*` attributes on the <script> tag that loaded the tracker
 */

export interface TrackerConfig {
  /** Base API URL, e.g. `http://localhost:3000/api`. Events POST to `${endpoint}/events`. */
  endpoint: string;
  /** Log internal activity to the console. */
  debug: boolean;
  /** 0..1 — fraction of sessions that are tracked. 1 = everything. */
  sampleRate: number;
  /** Idle time after which a new session id is issued. */
  sessionTimeoutMs: number;
  /** Track `page_view` on load and on SPA route changes. */
  trackPageViews: boolean;
  /** Track `click` events. */
  trackClicks: boolean;
  /** Strip query string + hash from `page_url` (privacy). */
  maskUrls: boolean;
  /** Flush the queue when it reaches this many events. */
  batchSize: number;
  /** Maximum time events may sit in the queue before flushing. */
  flushIntervalMs: number;
  /** Hard cap on queued events to bound memory. */
  maxQueue: number;
  /** Optional API key sent as `x-api-key`. */
  apiKey?: string;
  /** localStorage key namespace. */
  namespace: string;
}

export const DEFAULT_CONFIG: TrackerConfig = {
  endpoint: 'http://localhost:3000/api',
  debug: false,
  sampleRate: 1,
  sessionTimeoutMs: 30 * 60 * 1000,
  trackPageViews: true,
  trackClicks: true,
  maskUrls: false,
  batchSize: 10,
  flushIntervalMs: 5000,
  maxQueue: 200,
  namespace: 'cf',
};

function normalizeEndpoint(value: string): string {
  return value.replace(/\/+$/, '');
}

/** Read `data-*` attributes from the <script> tag currently executing. */
function readScriptDataset(): Partial<TrackerConfig> {
  if (typeof document === 'undefined') return {};
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>('script[data-cf-tracker], script[src*="tracker"]');
  if (!script) return {};

  const d = script.dataset ?? {};
  const out: Partial<TrackerConfig> = {};
  if (d.endpoint) out.endpoint = d.endpoint;
  if (d.debug != null) out.debug = d.debug !== 'false';
  if (d.sampleRate) out.sampleRate = Number(d.sampleRate);
  if (d.sessionTimeout) out.sessionTimeoutMs = Number(d.sessionTimeout);
  if (d.trackPageViews != null) out.trackPageViews = d.trackPageViews !== 'false';
  if (d.trackClicks != null) out.trackClicks = d.trackClicks !== 'false';
  if (d.maskUrls != null) out.maskUrls = d.maskUrls !== 'false';
  if (d.apiKey) out.apiKey = d.apiKey;
  if (d.namespace) out.namespace = d.namespace;
  return out;
}

export function resolveConfig(overrides: Partial<TrackerConfig> = {}): TrackerConfig {
  const globalOverrides =
    (typeof window !== 'undefined' && (window as any).CausalFunnelConfig) || {};

  const merged: TrackerConfig = {
    ...DEFAULT_CONFIG,
    ...globalOverrides,
    ...readScriptDataset(),
    ...overrides,
  };

  merged.endpoint = normalizeEndpoint(merged.endpoint);
  merged.sampleRate = Math.min(1, Math.max(0, Number(merged.sampleRate) || 0));

  return merged;
}
