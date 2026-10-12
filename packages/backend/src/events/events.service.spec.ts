import { describe, expect, it, vi } from 'vitest';
import { EventsService } from './events.service.js';

describe('EventsService', () => {
  it('maps DTOs to documents and reports counts', async () => {
    const insertMany = vi.fn().mockResolvedValue([{ _id: '1' }, { _id: '2' }]);
    const service = new EventsService({ insertMany } as never);

    const result = await service.ingest([
      {
        session_id: 's1',
        event_type: 'click',
        page_url: 'http://x/',
        timestamp: '2026-01-01T00:00:00.000Z',
        x: 10,
        y: 20,
        viewport: { w: 100, h: 200 },
      },
      {
        session_id: 's1',
        event_type: 'page_view',
        page_url: 'http://x/',
        timestamp: '2026-01-01T00:00:01.000Z',
      },
    ] as never);

    expect(insertMany).toHaveBeenCalledTimes(1);
    const docs = insertMany.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(docs).toHaveLength(2);
    expect(docs[0].timestamp).toBeInstanceOf(Date);
    expect(docs[1].event_type).toBe('page_view');
    expect(result).toEqual({ received: 2, accepted: 2 });
  });

  it('uses unordered inserts so one bad doc cannot sink the batch', async () => {
    const insertMany = vi.fn().mockResolvedValue([{ _id: '1' }]);
    const service = new EventsService({ insertMany } as never);

    await service.ingest([
      { session_id: 's', event_type: 'click', page_url: 'u', timestamp: '2026-01-01T00:00:00.000Z' },
    ] as never);

    expect(insertMany.mock.calls[0][1]).toEqual({ ordered: false });
  });
});
