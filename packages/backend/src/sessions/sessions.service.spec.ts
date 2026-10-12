import { describe, expect, it, vi } from 'vitest';
import { SessionsService } from './sessions.service.js';

function chain<T>(value: T) {
  const api: Record<string, unknown> = {};
  for (const method of ['sort', 'select', 'limit', 'lean']) {
    api[method] = vi.fn(() => api);
  }
  api.exec = vi.fn(() => Promise.resolve(value));
  return api;
}

describe('SessionsService', () => {
  it('maps aggregation rows and pagination metadata', async () => {
    const aggregateResult = {
      data: [
        {
          _id: 's1',
          eventCount: 5,
          clickCount: 2,
          pageViewCount: 3,
          pageCount: 2,
          firstSeen: new Date('2026-01-01T00:00:00.000Z'),
          lastSeen: new Date('2026-01-01T00:05:00.000Z'),
          durationMs: 300000,
        },
      ],
      meta: [{ total: 1 }],
    };
    const exec = vi.fn().mockResolvedValue([aggregateResult]);
    const aggregate = vi.fn(() => ({ exec }));
    const service = new SessionsService({ aggregate } as never);

    const result = await service.list({
      limit: 25,
      offset: 0,
      sort: 'lastSeen',
      order: 'desc',
    } as never);

    expect(result.data[0]).toEqual({
      sessionId: 's1',
      eventCount: 5,
      clickCount: 2,
      pageViewCount: 3,
      pageCount: 2,
      firstSeen: aggregateResult.data[0].firstSeen,
      lastSeen: aggregateResult.data[0].lastSeen,
      durationMs: 300000,
    });
    expect(result.meta).toEqual({ total: 1, limit: 25, offset: 0, hasMore: false });
  });

  it('summarizes a session timeline', async () => {
    const docs = [
      { event_type: 'page_view', page_url: 'u', timestamp: new Date('2026-01-01T00:00:00.000Z') },
      { event_type: 'click', page_url: 'u', timestamp: new Date('2026-01-01T00:00:10.000Z') },
    ];
    const find = vi.fn(() => chain(docs));
    const service = new SessionsService({ find } as never);

    const result = await service.timeline('s1');
    expect(result.count).toBe(2);
    expect(result.durationMs).toBe(10000);
  });
});
