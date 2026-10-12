import type {
  HeatmapResponse,
  PageSummary,
  Paginated,
  SessionSummary,
  SessionTimeline,
  StatsOverview,
} from '../types';

/**
 * In dev we default to `/api`, which the Vite proxy forwards to the backend
 * (same-origin, no CORS). Set `VITE_API_URL` to hit the API directly.
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

type Query = Record<string, string | number | undefined>;

async function get<T>(path: string, params?: Query): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body?.message) detail = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export const api = {
  stats: () => get<StatsOverview>('/stats'),
  pages: () => get<PageSummary[]>('/pages'),
  sessions: (params: Query) => get<Paginated<SessionSummary>>('/sessions', params),
  timeline: (sessionId: string) =>
    get<SessionTimeline>(`/sessions/${encodeURIComponent(sessionId)}/timeline`),
  heatmap: (params: Query) => get<HeatmapResponse>('/heatmap', params),
};
