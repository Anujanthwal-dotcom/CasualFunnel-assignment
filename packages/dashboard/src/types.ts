export interface SessionSummary {
  sessionId: string;
  eventCount: number;
  clickCount: number;
  pageViewCount: number;
  pageCount: number;
  firstSeen: string;
  lastSeen: string;
  durationMs: number;
}

export interface TimelineEvent {
  event_type: 'page_view' | 'click' | string;
  page_url: string;
  timestamp: string;
  x?: number;
  y?: number;
  viewport?: { w: number; h: number };
  metadata?: Record<string, unknown>;
}

export interface SessionTimeline {
  sessionId: string;
  count: number;
  durationMs: number;
  events: TimelineEvent[];
}

export interface HeatmapPoint {
  x: number;
  y: number;
  pageUrl: string;
  timestamp: string;
}

export interface HeatmapResponse {
  pageUrl: string | null;
  total: number;
  truncated: boolean;
  bounds: { width: number; height: number };
  points: HeatmapPoint[];
}

export interface PageSummary {
  pageUrl: string;
  eventCount: number;
  clickCount: number;
  pageViewCount: number;
  sessionCount: number;
  lastSeen: string;
}

export interface StatsOverview {
  totalEvents: number;
  totalSessions: number;
  totalPages: number;
  clicks: number;
  pageViews: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number; hasMore: boolean };
}

export type SessionSort =
  | 'lastSeen'
  | 'firstSeen'
  | 'eventCount'
  | 'clickCount'
  | 'pageViewCount'
  | 'durationMs';
export type SortOrder = 'asc' | 'desc';
