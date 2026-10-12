import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, resolveConfig } from '../src/config';
import { SessionManager } from '../src/session';
import { Transport, type TrackedEvent } from '../src/transport';
import { buildEvent, currentPageUrl, type TrackingContext } from '../src/events';

const noopDebug = () => undefined;

function event(partial: Partial<TrackedEvent> = {}): TrackedEvent {
  return {
    session_id: 's1',
    event_type: 'click',
    page_url: 'http://example.test/',
    timestamp: new Date().toISOString(),
    ...partial,
  };
}

describe('resolveConfig', () => {
  it('normalizes the endpoint and clamps sampleRate', () => {
    const cfg = resolveConfig({ endpoint: 'http://api.test/api///', sampleRate: 5 });
    expect(cfg.endpoint).toBe('http://api.test/api');
    expect(cfg.sampleRate).toBe(1);
  });

  it('falls back to defaults', () => {
    expect(resolveConfig().sessionTimeoutMs).toBe(DEFAULT_CONFIG.sessionTimeoutMs);
  });
});

describe('SessionManager', () => {
  beforeEach(() => localStorage.clear());

  it('persists and reuses a session id', () => {
    const a = new SessionManager(resolveConfig());
    const b = new SessionManager(resolveConfig());
    expect(b.id).toBe(a.id);
  });

  it('rotates after the idle timeout', () => {
    const cfg = resolveConfig({ sessionTimeoutMs: 1000 });
    const first = new SessionManager(cfg).id;

    // Simulate a stale timestamp.
    localStorage.setItem('cf_session_ts', String(Date.now() - 5000));
    const second = new SessionManager(cfg).id;

    expect(second).not.toBe(first);
  });
});

describe('currentPageUrl', () => {
  it('masks query and hash when enabled', () => {
    // Same-origin path so history.replaceState is permitted.
    window.history.replaceState({}, '', '/product?utm=1#x');
    expect(currentPageUrl(resolveConfig({ maskUrls: true }))).toBe('http://shop.test/product');
    expect(currentPageUrl(resolveConfig({ maskUrls: false }))).toBe(
      'http://shop.test/product?utm=1#x',
    );
  });
});

describe('buildEvent', () => {
  it('includes coordinates and viewport for clicks', () => {
    const config = resolveConfig();
    const ctx: TrackingContext = {
      config,
      session: new SessionManager(config),
      transport: new Transport(config, noopDebug),
      debug: noopDebug,
    };
    const e = buildEvent(ctx, 'click', { x: 12, y: 34 });
    expect(e.event_type).toBe('click');
    expect(e.x).toBe(12);
    expect(e.y).toBe(34);
    expect(e.viewport).toBeDefined();
    expect(e.session_id).toBe(ctx.session.id);
  });
});

describe('Transport', () => {
  it('flushes a batch to the endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const transport = new Transport(resolveConfig({ endpoint: 'http://api.test/api', batchSize: 2 }), noopDebug);
    transport.enqueue(event());
    transport.enqueue(event());

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/events');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body).events).toHaveLength(2);

    vi.unstubAllGlobals();
  });

  it('re-queues failed flushes', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network'));
    vi.stubGlobal('fetch', fetchMock);

    const transport = new Transport(resolveConfig({ endpoint: 'http://api.test/api' }), noopDebug);
    transport.enqueue(event());
    await transport.flush();

    // Second flush should retry the same event.
    await transport.flush();
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    vi.unstubAllGlobals();
  });
});
