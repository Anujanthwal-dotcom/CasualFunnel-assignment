import { describe, expect, it, vi } from 'vitest';
import { HeatmapService } from './heatmap.service.js';

function chain<T>(value: T) {
  const promise = Promise.resolve(value);
  const api: Record<string, unknown> = {};
  for (const method of ['sort', 'limit', 'lean']) {
    api[method] = vi.fn(() => api);
  }
  api.exec = vi.fn(() => promise);
  return api;
}

const config = { get: (_key: string, fallback?: unknown) => fallback } as never;

describe('HeatmapService', () => {
  it('returns points with derived viewport bounds', async () => {
    const docs = [
      { x: 10, y: 20, page_url: 'u', timestamp: new Date(), viewport: { w: 1440, h: 900 } },
      { x: 30, y: 40, page_url: 'u', timestamp: new Date(), viewport: { w: 1920, h: 1080 } },
    ];
    const find = vi.fn(() => chain(docs));
    const service = new HeatmapService({ find } as never, config);

    const result = await service.clicks({ pageUrl: 'u' });
    expect(result.total).toBe(2);
    expect(result.bounds).toEqual({ width: 1920, height: 1080 });
    expect(result.points[0]).toMatchObject({ x: 10, y: 20 });
  });

  it('falls back to default bounds with no viewport data', async () => {
    const find = vi.fn(() => chain([]));
    const service = new HeatmapService({ find } as never, config);

    const result = await service.clicks({});
    expect(result.bounds).toEqual({ width: 1440, height: 900 });
    expect(result.pageUrl).toBeNull();
  });
});
