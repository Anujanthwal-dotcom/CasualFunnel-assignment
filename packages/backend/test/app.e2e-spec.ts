import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

/**
 * End-to-end flow: ingest -> sessions -> timeline -> heatmap.
 * Requires a reachable MongoDB (docker compose up -d).
 */
describe('CausalFunnel API (e2e)', () => {
  let app: INestApplication;
  const sessionId = `e2e-${Date.now()}`;
  const pageUrl = 'http://e2e.test/page';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/health -> ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/events accepts a batch', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/events')
      .send({
        events: [
          { session_id: sessionId, event_type: 'page_view', page_url: pageUrl, timestamp: new Date().toISOString(), viewport: { w: 1440, h: 900 } },
          { session_id: sessionId, event_type: 'click', page_url: pageUrl, timestamp: new Date().toISOString(), x: 100, y: 200, viewport: { w: 1440, h: 900 } },
        ],
      })
      .expect(202);

    expect(res.body).toEqual({ received: 2, accepted: 2 });
  });

  it('POST /api/events accepts a bare array and reports bad items', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/events')
      .send([
        { session_id: sessionId, event_type: 'click', page_url: pageUrl, timestamp: new Date().toISOString(), x: 1, y: 2 },
        { event_type: 'click', page_url: pageUrl, timestamp: 'not-a-date' },
      ])
      .expect(202);

    expect(res.body.accepted).toBe(1);
    expect(res.body.received).toBe(2);
    expect(res.body.errors.length).toBe(1);
  });

  it('GET /api/sessions includes the session', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sessions')
      .query({ search: sessionId })
      .expect(200);

    const row = res.body.data.find((s: { sessionId: string }) => s.sessionId === sessionId);
    expect(row).toBeDefined();
    expect(row.clickCount).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/sessions/:id/timeline is ordered', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/sessions/${sessionId}/timeline`)
      .expect(200);

    expect(res.body.count).toBeGreaterThanOrEqual(3);
    const times = res.body.events.map((e: { timestamp: string }) => new Date(e.timestamp).getTime());
    expect([...times].sort((a: number, b: number) => a - b)).toEqual(times);
  });

  it('GET /api/heatmap returns click points for the page', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/heatmap')
      .query({ pageUrl })
      .expect(200);

    expect(res.body.points.length).toBeGreaterThanOrEqual(2);
    expect(res.body.bounds).toEqual({ width: 1440, height: 900 });
  });

  it('GET /api/pages includes the page', async () => {
    const res = await request(app.getHttpServer()).get('/api/pages').expect(200);
    expect(res.body.some((p: { pageUrl: string }) => p.pageUrl === pageUrl)).toBe(true);
  });
});
