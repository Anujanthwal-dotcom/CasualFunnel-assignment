/**
 * CausalFunnel tracker entry point.
 *
 * Usage:
 *   <script src="http://localhost:3000/tracker.js"
 *           data-endpoint="http://localhost:3000/api" defer></script>
 *
 * Auto-initializes on load with `page_view` + `click` tracking, and exposes a
 * small imperative API on `window.CausalFunnel` for custom events.
 */
import { resolveConfig, type TrackerConfig } from './config';
import { SessionManager } from './session';
import { Transport, type TrackedEvent } from './transport';
import { bindTracking, trackEvent, type TrackingContext } from './events';

export type { TrackerConfig, TrackedEvent };

export interface CausalFunnelApi {
  config: TrackerConfig;
  sessionId: string;
  /** Track a custom event. */
  track: (eventType: string, properties?: Record<string, unknown>) => void;
  /** Force an immediate flush. */
  flush: () => Promise<void>;
  /** Stop all listeners (mainly for tests / SPA unmounts). */
  destroy: () => void;
}

let instance: CausalFunnelApi | null = null;

export function init(overrides: Partial<TrackerConfig> = {}): CausalFunnelApi {
  if (instance) return instance;

  const config = resolveConfig(overrides);
  const debug = (message: string, data?: unknown) => {
    if (config.debug) {
      // eslint-disable-next-line no-console
      console.debug(`[CausalFunnel] ${message}`, data ?? '');
    }
  };

  // Sampling: when disabled, expose a no-op API so call sites stay simple.
  if (Math.random() > config.sampleRate) {
    debug('session excluded by sampling');
    const noop: CausalFunnelApi = {
      config,
      sessionId: 'sampled-out',
      track: () => undefined,
      flush: async () => undefined,
      destroy: () => undefined,
    };
    instance = noop;
    return noop;
  }

  const session = new SessionManager(config);
  const transport = new Transport(config, debug);
  const ctx: TrackingContext = { config, session, transport, debug };

  const teardown = bindTracking(ctx);
  debug('initialized', { endpoint: config.endpoint, session: session.id });

  const api: CausalFunnelApi = {
    config,
    get sessionId() {
      return session.id;
    },
    track: (eventType, properties) => {
      trackEvent(ctx, eventType, properties ? { metadata: properties } : {});
    },
    flush: () => transport.flush(),
    destroy: () => {
      teardown();
      instance = null;
    },
  };

  instance = api;
  return api;
}

if (typeof window !== 'undefined') {
  // We expose the public API on `window.CausalFunnel` ourselves rather than
  // relying on tsup's IIFE global, so the live instance (track/flush/sessionId)
  // is available immediately after auto-init.
  const w = window as unknown as Record<string, any>;
  const root = (w.CausalFunnel ?? {}) as Record<string, unknown>;
  root.init = init;
  w.CausalFunnel = root;

  const current = document.currentScript as HTMLScriptElement | null;
  const autoDisabled = current?.dataset?.auto === 'false' || w.CausalFunnelAuto === false;

  if (!autoDisabled) {
    const ready = () => {
      Object.assign(root, init());
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ready, { once: true });
    } else {
      ready();
    }
  }
}

export default { init };
