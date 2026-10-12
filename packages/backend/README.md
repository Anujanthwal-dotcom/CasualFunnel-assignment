# @casualfunnel/backend

NestJS ingestion + aggregation API for CausalFunnel analytics. See the
[root README](../../README.md) for the full architecture, API reference, and setup.

## Run

```bash
cp .env.example .env
npm install            # from the repo root — this is an npm workspace
npm run dev -w @casualfunnel/backend
```

The API listens on `:3000` with a global `/api` prefix:

| Endpoint                         | Purpose                              |
| -------------------------------- | ------------------------------------ |
| `POST /api/events`               | Ingest events                        |
| `GET  /api/sessions`             | Session list (aggregated on demand)  |
| `GET  /api/sessions/:id/timeline`| One session's ordered events         |
| `GET  /api/heatmap`              | Click coordinates for a page         |
| `GET  /api/pages`                | Distinct tracked pages               |
| `GET  /api/stats`                | Global counters                      |
| `GET  /api/health`               | Liveness + MongoDB readiness         |
| `GET  /api/docs`                 | Swagger UI                           |
| `GET  /tracker.js`               | Compiled tracker bundle (static)     |

## Scripts

```bash
npm run dev          # nest start --watch
npm run build        # nest build → dist/
npm run start:prod   # node dist/main.js
npm run seed         # insert sample sessions/events
npm test             # unit tests (Vitest)
npm run test:e2e     # e2e tests (requires MongoDB)
npm run lint
```
