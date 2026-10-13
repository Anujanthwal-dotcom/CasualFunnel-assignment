# CausalFunnel — Full-Stack User Analytics

An end-to-end user-analytics stack: an **embeddable JavaScript tracker**, a **NestJS ingestion + aggregation API** backed by **MongoDB**, and a **React dashboard** with session exploration and click heatmaps.

The system answers the two questions the assignment cares about:

1. **What did each user do?** — sessionized event streams, browsable session-by-session as a timeline.
2. **Where do users click?** — per-page click coordinates rendered as a heatmap.

## Assumptions

1. Single-tenant only. Multi-tenant would be possible, but the assignment calls for a small full-stack app.
2. The heatmap covers one page, since this is single-tenant.
3. The tracker is authored in TypeScript and compiled to JS (easier to maintain); TypeScript is used across the frontend and backend too.

---

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Running each piece](#running-each-piece)
- [The demo page](#the-demo-page)
- [The tracker](#the-tracker)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Data model & indexes](#data-model--indexes)
- [How the analysis is computed](#how-the-analysis-is-computed)
- [Testing](#testing)
- [Assumptions & trade-offs](#assumptions--trade-offs)
- [Troubleshooting](#troubleshooting)
- [Deployment notes](#deployment-notes)
- [License](#license)

---

## Architecture

```
   Your site / demo.html  (:5173/demo.html)
        │  <script src="/tracker.js">  ·  POST /api/events
        ▼
  ┌──────────────┐  POST /api/events   ┌─────────────────────┐  insertMany   ┌────────────────────┐
  │   TRACKER    │ ──────────────────► │  NestJS API (:3000) │ ────────────► │   MongoDB          │
  │  (IIFE JS)   │                     │  ingest + aggregate │ ◄──────────── │   events (raw)     │
  │ page_view ·  │                     └──────────┬──────────┘  aggregations  └────────────────────┘
  │ click · custom                GET /api/*  +  ws /ws/events
  └──────────────┘                              │ (live)
                                                ▼
                                     ┌──────────────────────┐
                                     │  REACT DASHBOARD     │
                                     │  Sessions · Heatmap  │
                                     │  · Script tag        │
                                     └──────────────────────┘
```

One `events` collection is the **source of truth**: every dashboard view is an aggregation over it, with no rollup collections to keep in sync.

---

## Tech stack

| Layer      | Choice                                                                        |
| ---------- | ----------------------------------------------------------------------------- |
| Tracker    | TypeScript → single minified **IIFE** bundle via [tsup](https://tsup.egoist.dev/) (esbuild) |
| Backend    | Node.JS, **NestJS 12**, `@nestjs/mongoose`, `@nestjs/swagger`, `@nestjs/throttler`, `class-validator` |
| Database   | **MongoDB 7** (`mongodb/mongodb-community-server` image)                        |
| Dashboard  | **React 19** + **Vite**, **Tailwind CSS v4**, **TanStack Query**, `<canvas>` heatmap |
| Tooling    | npm workspaces, **Vitest**, oxlint, Prettier, Docker Compose                   |
| Language   | TypeScript throughout                                                         |

---

## Repository layout

```
casualfunnel/
├── docker-compose.yml             # MongoDB for local development
├── scripts/
│   └── copy-tracker.mjs           # Copies tracker build → backend/public/tracker.js
├── packages/
│   ├── tracker/                   # @casualfunnel/tracker  (embeddable IIFE)
│   │   ├── src/{config,session,transport,events,index}.ts
│   │   └── test/
│   ├── backend/                   # @casualfunnel/backend  (NestJS API)
│   │   ├── src/
│   │   │   ├── events/            #   ingestion: schema · DTOs · IngestPipe · service
│   │   │   ├── sessions/          #   session list ($facet) + per-session timeline
│   │   │   ├── heatmap/           #   click coordinates + viewport bounds
│   │   │   ├── pages/             #   distinct page URLs with counts
│   │   │   ├── stats/             #   global counters
│   │   │   ├── health/            #   liveness + Mongo readiness
│   │   │   ├── common/guards/     #   optional x-api-key guard
│   │   │   ├── seed.ts            #   sample-data seeder
│   │   │   └── main.ts            #   CORS · global prefix · static /tracker.js · Swagger
│   │   ├── test/app.e2e-spec.ts
│   │   └── .env.example
│   └── dashboard/                 # @casualfunnel/dashboard (React 19 + Tailwind + Vite)
│       ├── public/
│       │   └── demo.html          # Interactive tracking demo page
│       ├── src/api/               #   fetch client + TanStack Query hooks
│       ├── src/components/        #   SessionsView · SessionDrawer · Timeline · HeatmapView · HeatmapCanvas
│       └── .env.example
├── package.json                   # workspaces + root scripts
└── README.md
```

---

## Prerequisites

- **Node.js ≥ 20** (developed on Node 26; `.nvmrc` pins 20) and npm ≥ 10.
- **Docker** (for the bundled MongoDB), *or* any reachable MongoDB 5+ instance.
- A modern browser (Chrome) to open the demo page.

> The tracker build uses esbuild. If your npm blocks install scripts, approve it once:
> `npm install-scripts approve esbuild` (npm ≥ 11).

---

## Quick start

```bash
# 1. Install workspace dependencies
npm install

# 2. Start MongoDB
npm run docker:up            # docker compose up -d

# 3. Create the backend env file (defaults work out of the box)
cp packages/backend/.env.example packages/backend/.env

# 4. Load sample sessions/events so the dashboard isn't empty
npm run seed

# 5. Start everything (builds the tracker, then runs API + dashboard together)
npm run dev
```

### Root scripts

| Script             | Does                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| `npm run dev`      | Build tracker → copy → run backend (watch) + dashboard concurrently   |
| `npm run build`    | Build tracker → copy → build backend → build dashboard               |
| `npm run tracker:build` | Build the tracker and copy it into the backend's `public/`       |
| `npm run seed`     | Insert sample sessions/events into MongoDB                           |
| `npm start`        | Start the compiled backend (`node dist/main.js`)                     |
| `npm test`         | Backend unit tests + tracker tests                                   |
| `npm run docker:up` / `docker:down` | Start / stop MongoDB                               |
| `npm run clean`    | Remove build outputs                                                 |

---

## Running each piece

<details>
<summary><b>Tracker</b></summary>

```bash
npm run build -w @casualfunnel/tracker   # → packages/tracker/dist/casualfunnel-tracker.js
npm run build -w @casualfunnel/tracker -- --watch   # rebuild on change
npm test -w @casualfunnel/tracker
```

The backend serves the bundle from `packages/backend/public/tracker.js`, synced by
`node scripts/copy-tracker.mjs` (run by `npm run dev` / `npm run build`).
</details>

<details>
<summary><b>Backend</b></summary>

```bash
cd packages/backend
cp .env.example .env
npm run dev          # nest start --watch
npm run seed         # sample data
npm run test         # unit tests
npm run test:e2e     # e2e (needs MongoDB running)
npm run lint
```
</details>

<details>
<summary><b>Dashboard</b></summary>

```bash
cd packages/dashboard
npm run dev          # Vite on :5173, proxies /api → :3000
npm run build        # tsc -b && vite build
npm run preview
```

By default the dashboard calls same-origin `/api`, which Vite proxies to `:3000`. Set
`VITE_API_URL` to call the API directly instead.
</details>

---

## The demo page
 
`packages/dashboard/public/demo.html` is a test page served by the dashboard at
`http://localhost:5173/demo.html`. With `npm run dev` running, open it directly or click
**Demo Page ↗** in the dashboard header.
 
It loads the tracker through Vite's dev proxy (or directly from `:3000`):
 
```html
<script
  src="/tracker.js"
  data-endpoint="/api"
  data-debug="true"
  defer
></script>
```
 
It includes CTA buttons, spread-out click tiles (so the heatmap has structure), a `data-cf-ignore`
opt-out, a live mirror of the events being sent, and custom `cta_click` events via `CausalFunnel.track(...)`.
 
During local dev, both `/tracker.js` and `/api` proxy to the NestJS backend on `:3000`.

---

## The tracker

Dependency-free, ~7 KB minified. It auto-initializes on load and exposes `window.CausalFunnel`.

**Automatic tracking**

- `page_view` on load and on SPA navigations (`pushState` / `replaceState` / `popstate`).
- `click` with viewport `x`/`y`, plus a small metadata bag (`tag`, truncated `text`).
- Elements matching `[data-cf-ignore]` are skipped.

**Delivery**

- Batched in memory (`batchSize` 10) and flushed every `flushIntervalMs` (5 s) via
  `fetch(..., { keepalive: true })`.
- On page hide/unload it flushes with `navigator.sendBeacon`.
- Failed batches are re-queued (bounded by `maxQueue`) for at-least-once delivery.

**Sessions**

- A client-side UUID v4 session id is kept in `localStorage` (cookie fallback), rotating after
  `sessionTimeoutMs` (30 min) of inactivity.

**Imperative API**

```js
window.CausalFunnel.sessionId;                    // current session id
window.CausalFunnel.track('checkout_started', { cart: 3 });
await window.CausalFunnel.flush();
window.CausalFunnel.destroy();                    // remove listeners
```

**Configuration** — precedence: defaults → `window.CausalFunnelConfig` → `data-*` on the script tag.

| `data-*` attribute            | Default                     | Meaning                                  |
| ----------------------------- | --------------------------- | ---------------------------------------- |
| `data-endpoint`               | `http://localhost:3000/api` | API base URL                             |
| `data-debug`                  | `false`                     | Log activity to the console              |
| `data-sample-rate`            | `1`                         | 0–1 fraction of sessions tracked         |
| `data-session-timeout`        | `1800000`                   | Idle ms before a new session id          |
| `data-track-page-views`       | `true`                      | Emit `page_view`                         |
| `data-track-clicks`           | `true`                      | Emit `click`                             |
| `data-mask-urls`              | `false`                     | Strip query string + hash from `page_url`|
| `data-api-key`                | —                           | Sent as `x-api-key` when required        |
| `data-namespace`              | `cf`                        | localStorage key prefix                  |
| `data-auto`                   | —                           | Set to `false` to skip auto-init         |

---

## Environment variables

**`packages/backend/.env`** (see `.env.example`)

| Variable             | Default                                      | Purpose                                        |
| -------------------- | -------------------------------------------- | ---------------------------------------------- |
| `PORT`               | `3000`                                       | HTTP port                                      |
| `NODE_ENV`           | `development`                                | Node environment                               |
| `MONGODB_URI`        | `mongodb://localhost:27017/casualfunnel`     | MongoDB connection string                      |
| `CORS_ORIGINS`       | `*`                                          | Comma-separated allowed origins, or `*`        |
| `API_KEY`            | *(empty)*                                    | When set, `POST /api/events` requires `x-api-key` |
| `HEATMAP_MAX_POINTS` | `20000`                                       | Cap on click points returned per heatmap query |
| `THROTTLE_TTL_MS`    | `60000`                                       | Rate-limit window                              |
| `THROTTLE_LIMIT`     | `5000`                                        | Requests per window per IP                     |
| `SEED_SESSIONS`      | `18`                                          | Sessions generated by `npm run seed`           |

**`packages/dashboard/.env`** (see `.env.example`)

| Variable       | Default | Purpose                                                     |
| -------------- | ------- | ----------------------------------------------------------- |
| `VITE_API_URL` | `/api`  | API base URL. Unset ⇒ same-origin (Vite dev proxy → `:3000`)|

---

## API reference

Base URL: `http://localhost:3000/api` · Interactive docs: `/api/docs`

### `POST /api/events` — ingest

Accepts a single event, a bare array, or `{ "events": [...] }` (what the tracker sends). Invalid items
are skipped and reported; valid ones are persisted. Returns **`202`**.

```bash
curl -X POST http://localhost:3000/api/events \
  -H 'Content-Type: application/json' \
  -d '{
        "events": [
          { "session_id": "s-1", "event_type": "page_view",
            "page_url": "http://localhost:5173/demo.html",
            "timestamp": "2026-01-01T12:00:00.000Z",
            "viewport": { "w": 1440, "h": 900 } },
          { "session_id": "s-1", "event_type": "click",
            "page_url": "http://localhost:5173/demo.html",
            "timestamp": "2026-01-01T12:00:03.000Z",
            "x": 412, "y": 260 }
        ]
      }'
```

```json
{ "received": 2, "accepted": 2 }
```

When some items are invalid:

```json
{
  "received": 2,
  "accepted": 1,
  "errors": ["events[1]: timestamp must be a valid ISO 8601 date string"]
}
```

Required: `session_id`, `event_type`, `page_url`, `timestamp` (ISO-8601). Optional: `x`, `y`,
`viewport {w,h}`, `referrer`, `user_agent`, `metadata`. `event_type` is free-form — `page_view` and
`click` are built in, custom types (e.g. `cta_click`) are accepted.

### `GET /api/sessions` — session list

Per-session aggregates computed on demand.

| Query     | Default      | Notes                                                             |
| --------- | ------------ | ----------------------------------------------------------------- |
| `limit`   | `25` (1–200) | Page size                                                         |
| `offset`  | `0`          | Pagination offset                                                 |
| `search`  | —            | Case-insensitive substring on session id                          |
| `sort`    | `lastSeen`   | `lastSeen` · `firstSeen` · `eventCount` · `clickCount` · `pageViewCount` · `durationMs` |
| `order`   | `desc`       | `asc` · `desc`                                                    |

```json
{
  "data": [
    {
      "sessionId": "seed-…", "eventCount": 14, "clickCount": 11, "pageViewCount": 3,
      "pageCount": 3,
      "firstSeen": "2026-01-01T12:00:00.000Z", "lastSeen": "2026-01-01T12:04:11.000Z",
      "durationMs": 251000
    }
  ],
  "meta": { "total": 24, "limit": 25, "offset": 0, "hasMore": false }
}
```

### `GET /api/sessions/:sessionId/timeline` — user journey

Ordered list of a session's events.

```json
{
  "sessionId": "seed-…",
  "count": 3,
  "durationMs": 19000,
  "events": [
    { "event_type": "page_view", "page_url": "http://…/index.html",
      "timestamp": "2026-01-01T12:00:00.000Z", "viewport": { "w": 1440, "h": 900 } },
    { "event_type": "click", "page_url": "http://…/index.html",
      "timestamp": "2026-01-01T12:00:03.000Z", "x": 412, "y": 260 }
  ]
}
```

### `GET /api/heatmap` — click coordinates

| Query     | Notes                                                       |
| --------- | ----------------------------------------------------------- |
| `pageUrl` | Exact URL (see `/api/pages`). Omit for all pages.           |
| `from`    | Inclusive ISO-8601 lower bound                              |
| `to`      | Inclusive ISO-8601 upper bound                              |

```json
{
  "pageUrl": "http://localhost:5173/demo.html",
  "total": 279,
  "truncated": false,
  "bounds": { "width": 1920, "height": 1080 },
  "points": [ { "x": 210, "y": 320, "pageUrl": "http://…", "timestamp": "2026-01-01T12:00:03.000Z" } ]
}
```

`bounds` is the largest viewport the points were captured in, so the canvas can scale coordinates from
different screen sizes onto one plane. `truncated` is `true` when the `HEATMAP_MAX_POINTS` cap is hit.

### `GET /api/pages` — tracked pages

Distinct `page_url`s with `eventCount`, `clickCount`, `pageViewCount`, `sessionCount`, `lastSeen`.
Powers the heatmap page selector.

### `GET /api/stats` — global counters

```json
{ "totalEvents": 571, "totalSessions": 24, "totalPages": 4,
  "clicks": 524, "pageViews": 46,
  "firstSeen": "2026-01-01T00:00:00.000Z", "lastSeen": "2026-01-01T12:04:11.000Z" }
```

### `GET /api/health` · `GET /tracker.js`

`/api/health` returns service status and MongoDB readiness. `/tracker.js` serves the compiled tracker
(static, outside the `/api` prefix) — the API's CDN role.

---

## Data model & indexes

Single collection: **`events`** (`packages/backend/src/events/schemas/event.schema.ts`).

```ts
{
  session_id: string,       // client-generated session id
  event_type: string,       // 'page_view' | 'click' | custom
  page_url: string,
  timestamp: Date,          // client clock
  x?: number, y?: number,   // click coordinates (viewport space)
  viewport?: { w: number, h: number },
  referrer?: string,
  user_agent?: string,
  metadata?: Record<string, unknown>,
  server_received_at: Date  // server clock (mongoose timestamp)
}
```

Indexes backing the three hot read paths (timeline, heatmap, session list):

| Index                                        | Serves                                             |
| -------------------------------------------- | -------------------------------------------------- |
| `{ session_id: 1, timestamp: 1 }`            | Timeline lookup + session `$group` / `$min`/`$max`  |
| `{ page_url: 1, event_type: 1, timestamp: -1 }` | Heatmap filter + recency sort                    |
| `{ timestamp: -1 }`                          | Recent-events / global stats                        |
| `{ session_id: 1, event_type: 1 }`           | Per-session click/page-view counts                  |

`_id` (ObjectId) is the natural document key; `versionKey` is disabled.

---

## How the analysis is computed

**Sessionization** is **client-side**: the tracker mints a session id on first activity, persists it in
`localStorage`, and rotates it after 30 minutes idle. The server treats `session_id` as an opaque
grouping key, keeping the API stateless.

**Session list** (`sessions.service.ts`) is a single aggregation:

```
$group by session_id
  → count events, clicks ($cond), page_views ($cond), min/max timestamp, distinct pages
$addFields durationMs, pageCount
$sort by the requested field
$facet { data: [skip, limit], meta: [count] }   // page + total in one round trip
```

**Heatmap** (`heatmap.service.ts`) reads clicks for a page (optionally time-bounded), sorts by recency,
caps at `HEATMAP_MAX_POINTS`, and derives `bounds` from the largest viewport seen in the result set.
The dashboard scales every point by `bounds` onto a fixed canvas.

**Stats / pages** are straightforward `$group` aggregations over the same collection.

---

## Testing

```bash
npm test                              # backend unit + tracker tests
npm run test -w @casualfunnel/tracker
npm run test -w @casualfunnel/backend
npm run test:e2e -w @casualfunnel/backend   # requires MongoDB
```

Coverage:

- **Tracker (Vitest + happy-dom)** — session persistence/rotation, batching & flush, `sendBeacon`
  fallback, click/page_view capture, `data-cf-ignore`, sampling, config precedence.
- **Backend unit** — `EventsService` ingestion, `SessionsService` list/timeline shape,
  `HeatmapService` filtering & bounds.
- **Backend e2e (Supertest)** — the full ingestion → aggregation path against MongoDB, including
  partial-batch validation and the three accepted request shapes.

All tests pass against a live MongoDB 7 instance, and the compiled tracker bundle was verified
end-to-end (browser-like DOM → real HTTP) for `page_view`, `click`, and custom events.

---

## Assumptions & trade-offs

**Aggregation on the fly, not materialized.** Sessions/stats are computed with `$group`/`$facet` on
every request. This keeps writes cheap and the model simple (one source of truth, no cache
invalidation), which is right for the data volumes here. At scale I'd add incremental rollup
collections (or time-bucketed summaries) refreshed by a scheduled job, with these endpoints reading
from them.

**Client-side sessionization.** Cheap and stateless, but a session id lives only in one browser and a
user who clears storage starts a "new" user. Server-side sessionization (deriving sessions from
event gaps) or a server-issued identity would be the upgrade; the schema already supports it because
`session_id` is just a grouping key.

**At-least-once delivery, no dedup.** `sendBeacon` + `keepalive` maximize delivery across navigation,
and failed batches are re-queued. That can duplicate events on retry. I did not add an idempotency
key/event id; a production version would send a client event id and upsert.

**Coordinates in viewport space.** Clicks are stored exactly as `clientX/clientY`. Heatmaps scale by
the max viewport seen, which is a good-enough approximation. A more faithful renderer would store a
normalized (0–1) position and/or normalize by scroll depth and page height, so tall pages and
different resolutions map cleanly.

**Single-tenant, light auth.** There's no accounts/workspaces model. `API_KEY` is an optional
shared secret for ingestion only; reads are open. Multi-tenancy would add a `site_id`/`project_id` to
every document and an index scoping, plus real auth on reads.

**Rate limiting is per-instance.** `@nestjs/throttler` keeps counters in memory, so limits are not
shared across replicas; a Redis store would be needed to make them global.

**Privacy.** `maskUrls` can strip query/hash, and `data-cf-ignore` opts elements out, but click
`metadata` includes up to 80 chars of element text. A production tracker would add allow/deny lists
and PII scrubbing, and honor Do-Not-Track.

**No retention policy.** Events accumulate forever. A TTL index (or tiered storage) would bound
storage in production.

**Timestamps.** Events carry the client clock and are stored as UTC; the dashboard renders them in
your local timezone. Client clocks can be wrong — `server_received_at` is kept as a second signal.

**MongoDB over Postgres.** Events are a high-write, schemaless firehose and the read paths are
aggregations over one collection with no joins — a natural fit for MongoDB and a single `events`
collection. The cost is that complex relational queries (cohorts, funnels with joins) are harder than
they'd be in SQL.

---

## Troubleshooting

- **`EADDRINUSE ... :27017`** — something already listens on the MongoDB port. Either use that
  instance (`MONGODB_URI` already points at `localhost:27017`), or map a different host port in
  `docker-compose.yml` and update `MONGODB_URI`.
- **`EADDRINUSE ... :3000` / `:5173`** — another dev server is running; stop it or change `PORT` /
  the Vite port.
- **Dashboard shows an error / no data** — confirm the backend is up (`/api/health`), MongoDB is
  running, and you've run `npm run seed`.
- **Demo page says "tracker: not loaded"** — the backend isn't on `:3000`, or `/tracker.js` wasn't
  built. Run `npm run tracker:build`.
- **`npm install` skipped esbuild** — run `npm install-scripts approve esbuild` and reinstall.

---

## Deployment notes

The repo is develop-first, but it maps cleanly to containers:

- **Backend** — build with `npm run build -w @casualfunnel/backend`, run `node dist/main.js`. Set
  `MONGODB_URI`, `CORS_ORIGINS` (a real origin list, not `*`), and optionally `API_KEY`.
- **Tracker** — the one artifact to "publish" is
  `packages/tracker/dist/casualfunnel-tracker.js`; serve it from a CDN or the API's `/tracker.js` and
  point `data-endpoint` at the deployed API.
- **Dashboard** — `npm run build -w @casualfunnel/dashboard` emits static files in `dist/`; serve
  them from any static host and set `VITE_API_URL` at build time.
- **MongoDB** — a managed cluster or a replicated deployment; add auth and network isolation.

---

## License

[MIT](./LICENSE)
