import type { TrackerConfig } from './config';
import type { SessionManager } from './session';
import type { Transport, TrackedEvent } from './transport';

type DebugFn = (message: string, data?: unknown) => void;

export interface TrackingContext {
  config: TrackerConfig;
  session: SessionManager;
  transport: Transport;
  debug: DebugFn;
}

/** Resolve the URL recorded with an event, optionally stripped of query/hash. */
export function currentPageUrl(config: TrackerConfig): string {
  if (typeof location === 'undefined') return '';
  if (!config.maskUrls) return location.href;
  return `${location.origin}${location.pathname}`;
}

function viewport(): { w: number; h: number } | undefined {
  if (typeof window === 'undefined') return undefined;
  return { w: window.innerWidth, h: window.innerHeight };
}

/** Build a fully-populated event payload for the current page. */
export function buildEvent(
  ctx: TrackingContext,
  eventType: string,
  extra: Partial<TrackedEvent> = {},
): TrackedEvent {
  const event: TrackedEvent = {
    session_id: ctx.session.id,
    event_type: eventType,
    page_url: currentPageUrl(ctx.config),
    timestamp: new Date().toISOString(),
    viewport: viewport(),
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    ...extra,
  };
  return event;
}

export function trackEvent(ctx: TrackingContext, eventType: string, extra: Partial<TrackedEvent> = {}): void {
  ctx.session.touch();
  const event = buildEvent(ctx, eventType, extra);
  ctx.transport.enqueue(event);
}

/** Returns true when a click landed on an element opted out of tracking. */
function isIgnored(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest('[data-cf-ignore], [data-cf-ignore="true"]');
}

/**
 * Wires up automatic tracking and returns a teardown function.
 * - `page_view` on load + SPA route changes (pushState / replaceState / popstate)
 * - delegated `click` listener with viewport x/y coordinates
 * - unload handlers that flush the queue via sendBeacon
 */
export function bindTracking(ctx: TrackingContext): () => void {
  const { config, debug } = ctx;
  const teardowns: Array<() => void> = [];

  const onPageView = () => trackEvent(ctx, 'page_view');
  const onClick = (e: MouseEvent) => {
    if (isIgnored(e.target)) return;
    trackEvent(ctx, 'click', {
      x: e.clientX,
      y: e.clientY,
      metadata: {
        tag: e.target instanceof Element ? e.target.tagName.toLowerCase() : undefined,
        text: e.target instanceof Element ? (e.target.textContent ?? '').trim().slice(0, 80) : undefined,
      },
    });
  };

  if (config.trackClicks && typeof document !== 'undefined') {
    document.addEventListener('click', onClick, true);
    teardowns.push(() => document.removeEventListener('click', onClick, true));
  }

  if (config.trackPageViews && typeof window !== 'undefined') {
    onPageView();

    // Patch history so client-side navigations emit a page_view.
    const wrap = (type: 'pushState' | 'replaceState') => {
      const original = history[type];
      history[type] = function patched(this: History, ...args: Parameters<History['pushState']>) {
        const result = original.apply(this, args as any);
        // Defer so the new URL is committed before we read it.
        setTimeout(onPageView, 0);
        return result;
      } as History[typeof type];
      teardowns.push(() => {
        history[type] = original;
      });
    };
    wrap('pushState');
    wrap('replaceState');

    const onPop = () => onPageView();
    window.addEventListener('popstate', onPop);
    teardowns.push(() => window.removeEventListener('popstate', onPop));
  }

  if (typeof document !== 'undefined') {
    const flush = () => ctx.transport.flushBeacon();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);
    teardowns.push(() => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    });
  }

  debug('tracking bound', { session: ctx.session.id });

  return () => teardowns.forEach((fn) => fn());
}
