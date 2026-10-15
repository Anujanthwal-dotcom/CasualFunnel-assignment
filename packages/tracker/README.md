# @casualfunnel/tracker

Embeddable, dependency-free analytics tracker. Compiles to a single IIFE bundle that can be dropped into any webpage to collect events.

## Purpose

The tracker captures user interactions client-side, manages sessions, batches events for efficient delivery, and sends them to the backend API. It auto-initializes on page load and provides an imperative API for custom tracking.

## Features

- **Automatic tracking**: `page_view` events on load and SPA navigations (`pushState`, `replaceState`, `popstate`)
- **Click tracking**: Captures viewport coordinates (`x`, `y`) with element metadata (tag, truncated text)
- **Session management**: Client-side UUID v4 sessions stored in `localStorage` with cookie fallback; auto-rotates after idle timeout
- **Reliable delivery**: Batches events (default 10 per batch) and flushes every 5s; uses `fetch` with `keepalive` and `navigator.sendBeacon` on page unload; re-queues failed batches
- **Privacy controls**: `data-cf-ignore` to skip specific elements; URL masking option; sampling support
- **Configurable**: Multiple configuration sources (defaults, global config, script data attributes)
- **Dependency-free**: Compiled to a single minified IIFE (~7 KB)

## Build

From the repo root:

```bash
npm run build -w @casualfunnel/tracker   # builds → dist/casualfunnel-tracker.js
npm run dev -w @casualfunnel/tracker     # watch mode
```

The built bundle is also copied to `packages/backend/public/tracker.js` when running `npm run build` or `npm run dev` from the root.

## Usage

### Script tag (auto-initialized)

```html
<script
  src="http://localhost:3000/tracker.js"
  data-endpoint="http://localhost:3000/api"
  data-debug="true"
  defer
></script>
```

The tracker auto-initializes and exposes `window.CausalFunnel` with the API.

### Imperative API

```js
// Access current session
console.log(window.CausalFunnel.sessionId);

// Track custom events
window.CausalFunnel.track('checkout_started', { cart: 3, value: 99.99 });

// Force immediate flush
await window.CausalFunnel.flush();

// Clean up listeners
window.CausalFunnel.destroy();
```

To disable auto-initialization, set `data-auto="false"` on the script tag or `window.CausalFunnelAuto = false`.

## Configuration

Configuration precedence: defaults → `window.CausalFunnelConfig` → `data-*` attributes on the script tag.

| `data-*` attribute | Default | Purpose |
| --- | --- | --- |
| `data-endpoint` | `http://localhost:3000/api` | API base URL (events POST to `${endpoint}/events`) |
| `data-debug` | `false` | Log internal activity to console |
| `data-sample-rate` | `1` | 0–1 fraction of sessions tracked |
| `data-session-timeout` | `1800000` | Idle milliseconds before issuing new session ID |
| `data-track-page-views` | `true` | Emit `page_view` on load and SPA navigations |
| `data-track-clicks` | `true` | Emit `click` events |
| `data-mask-urls` | `false` | Strip query string + hash from `page_url` |
| `data-api-key` | — | Sent as `x-api-key` header when required |
| `data-namespace` | `cf` | localStorage/cookie key prefix |
| `data-auto` | — | Set to `false` to skip auto-init |

## Development

```bash
npm test -w @casualfunnel/tracker      # Run tests
npm run typecheck -w @casualfunnel/tracker  # Type checking
```

Tests use Vitest with happy-dom for DOM simulation, covering session management, batching/flush, sendBeacon fallback, click/page_view capture, config precedence, and sampling.