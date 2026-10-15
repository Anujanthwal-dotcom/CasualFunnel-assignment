# @casualfunnel/dashboard

React analytics dashboard for exploring sessions, timelines, and click heatmaps. Built with React 19, Vite, and Tailwind CSS v4.

## Purpose

The dashboard provides a visual interface to analyze user analytics data collected by the tracker. It displays session aggregates, allows deep exploration of individual session timelines, and visualizes click patterns as heatmaps over tracked pages.

## Features

- **Sessions view**: Sortable, searchable list of all sessions with aggregates (events, clicks, page views, duration, pages visited)
- **Session drawer & timeline**: Detailed view of a single session's event stream in chronological order
- **Heatmap view**: Click heatmap visualization over tracked pages with viewport-aware coordinate scaling and time filtering
- **Real-time updates**: WebSocket connection for live refreshes when new events arrive
- **Demo page**: Interactive test page (`/demo.html`) for generating sample tracking data
- **Script tag guide**: Built-in view showing how to integrate the tracker

## Tech Stack

- **React 19** + **Vite** for fast development and optimized builds
- **Tailwind CSS v4** for styling
- **TanStack Query** for data fetching and caching
- **TypeScript** throughout

## Development

From the repo root, the dashboard starts automatically with `npm run dev`. To run standalone:

```bash
cd packages/dashboard
npm run dev
```

The dev server runs on [http://localhost:5173](http://localhost:5173). Vite proxies API requests (`/api`, `/tracker.js`) to the backend on port 3000 by default.

## Build & Preview

```bash
npm run build    # Build for production (tsc -b && vite build)
npm run preview  # Preview production build on :5173
npm run typecheck # Type checking
```

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | API base URL. Leave unset for same-origin with Vite proxy to `:3000`. |

Create a `.env` file in the dashboard package if you need to override:

```bash
cp .env.example .env
```

## Structure

- `src/api/` - API client and TanStack Query hooks
- `src/components/` - UI components (SessionsView, SessionDrawer, Timeline, HeatmapView, HeatmapCanvas, etc.)
- `src/lib/` - Utilities and helpers
- `public/demo.html` - Interactive tracking demo page served at `/demo.html`

## Demo Page

The included demo page at [http://localhost:5173/demo.html](http://localhost:5173/demo.html) provides an easy way to test tracking. It loads the tracker, includes click targets to generate heatmap data, and displays events in real-time as they're sent.