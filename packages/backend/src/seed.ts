/**
 * Seeds MongoDB with realistic sessions so the dashboard and heatmap have
 * something to show on first run.
 *
 * Usage:  npm run seed   (from the repo root, or packages/backend)
 *
 * Runs on Node's native TypeScript stripping (no build step required):
 *   node --env-file=.env --experimental-strip-types src/seed.ts
 */
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/casualfunnel';
const SESSION_COUNT = Number(process.env.SEED_SESSIONS ?? 18);

const PAGES = [
  'http://localhost:5173/demo.html',
  'http://localhost:5173/products.html',
  'http://localhost:5173/checkout.html',
];

const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(items: T[]): T => items[rand(0, items.length - 1)];

interface SeedEvent {
  _id: ObjectId;
  session_id: string;
  event_type: 'page_view' | 'click';
  page_url: string;
  timestamp: Date;
  x?: number;
  y?: number;
  viewport: { w: number; h: number };
  referrer?: string;
  user_agent: string;
  metadata?: Record<string, unknown>;
  server_received_at: Date;
}

function buildSession(sessionId: string, startMs: number): SeedEvent[] {
  const events: SeedEvent[] = [];
  const viewport = pick(VIEWPORTS);
  let cursor = startMs;

  // A user wanders through 1-3 pages.
  const journey = PAGES.slice(0, rand(1, PAGES.length));
  for (const pageUrl of journey) {
    cursor += rand(1500, 6000);
    events.push({
      _id: new ObjectId(),
      session_id: sessionId,
      event_type: 'page_view',
      page_url: pageUrl,
      timestamp: new Date(cursor),
      viewport,
      referrer: pageUrl === journey[0] ? 'https://www.google.com/' : PAGES[0],
      user_agent: 'seed-bot/1.0',
      server_received_at: new Date(cursor),
    });

    // Cluster clicks in the upper-left → center region, like real funnels.
    const clicks = rand(2, 26);
    for (let i = 0; i < clicks; i += 1) {
      cursor += rand(200, 2500);
      const cx = Math.round(viewport.w * (0.1 + Math.random() * 0.7));
      const cy = Math.round(viewport.h * (0.08 + Math.random() * 0.6));
      events.push({
        _id: new ObjectId(),
        session_id: sessionId,
        event_type: 'click',
        page_url: pageUrl,
        timestamp: new Date(cursor),
        x: cx,
        y: cy,
        viewport,
        user_agent: 'seed-bot/1.0',
        metadata: { tag: pick(['button', 'a', 'div']), text: 'seed' },
        server_received_at: new Date(cursor),
      });
    }
  }

  return events;
}

async function main(): Promise<void> {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const now = Date.now();
  const events: SeedEvent[] = [];

  for (let i = 0; i < SESSION_COUNT; i += 1) {
    const sessionId = `seed-${crypto.randomUUID()}`;
    const start = now - rand(0, 7 * 24 * 60 * 60 * 1000);
    events.push(...buildSession(sessionId, start));
  }

  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const collection = db.collection<SeedEvent>('events');
  const before = await collection.countDocuments();
  await collection.insertMany(events);

  console.log(
    `[seed] Inserted ${events.length} events across ${SESSION_COUNT} sessions ` +
      `into '${db.databaseName}.events' (was ${before}, now ${before + events.length}).`,
  );

  await client.close();
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
