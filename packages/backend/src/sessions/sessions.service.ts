import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, PipelineStage } from 'mongoose';
import { AnalyticsEvent } from '../events/schemas/event.schema.js';
import type { ListSessionsQueryDto, SessionSortField } from './dto/list-sessions-query.dto.js';

export interface SessionSummary {
  sessionId: string;
  eventCount: number;
  clickCount: number;
  pageViewCount: number;
  pageCount: number;
  firstSeen: Date;
  lastSeen: Date;
  durationMs: number;
}

export interface SessionTimeline {
  sessionId: string;
  count: number;
  durationMs: number;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  event_type: string;
  page_url: string;
  timestamp: Date;
  x?: number;
  y?: number;
  viewport?: { w: number; h: number };
  metadata?: Record<string, unknown>;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number; hasMore: boolean };
}

/** Escape user input before embedding it in a RegExp. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface RawSessionRow {
  _id: string;
  eventCount: number;
  clickCount: number;
  pageViewCount: number;
  pageCount: number;
  firstSeen: Date;
  lastSeen: Date;
  durationMs: number;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly eventModel: Model<AnalyticsEvent>,
  ) {}

  /**
   * Session list with per-session aggregates, computed on demand.
   *
   * The `$group` stage is served by the `{ session_id: 1, timestamp: 1 }` and
   * `{ session_id: 1, event_type: 1 }` indexes; `$facet` returns the page of
   * rows and the total count in a single round trip.
   */
  async list(query: ListSessionsQueryDto): Promise<Paginated<SessionSummary>> {
    const { limit, offset, search, sort, order } = query;
    const sortDir: 1 | -1 = order === 'asc' ? 1 : -1;
    const sortField: SessionSortField = sort;

    const pipeline: PipelineStage[] = [];

    if (search) {
      pipeline.push({ $match: { session_id: { $regex: escapeRegex(search), $options: 'i' } } });
    }

    pipeline.push(
      {
        $group: {
          _id: '$session_id',
          eventCount: { $sum: 1 },
          clickCount: { $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] } },
          pageViewCount: { $sum: { $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0] } },
          firstSeen: { $min: '$timestamp' },
          lastSeen: { $max: '$timestamp' },
          pages: { $addToSet: '$page_url' },
        },
      },
      {
        $addFields: {
          pageCount: { $size: '$pages' },
          durationMs: { $subtract: ['$lastSeen', '$firstSeen'] },
        },
      },
      { $project: { pages: 0 } },
      { $sort: { [sortField]: sortDir, _id: 1 } },
      {
        $facet: {
          data: [{ $skip: offset }, { $limit: limit }],
          meta: [{ $count: 'total' }],
        },
      },
    );

    const [result] = await this.eventModel
      .aggregate<{ data: RawSessionRow[]; meta: Array<{ total: number }> }>(pipeline)
      .exec();

    const rows = result?.data ?? [];
    const total = result?.meta?.[0]?.total ?? 0;

    return {
      data: rows.map((row) => ({
        sessionId: row._id,
        eventCount: row.eventCount,
        clickCount: row.clickCount,
        pageViewCount: row.pageViewCount,
        pageCount: row.pageCount,
        firstSeen: row.firstSeen,
        lastSeen: row.lastSeen,
        durationMs: row.durationMs,
      })),
      meta: { total, limit, offset, hasMore: offset + rows.length < total },
    };
  }

  /** Ordered event list for one session (the "user journey"). */
  async timeline(sessionId: string): Promise<SessionTimeline> {
    const events = await this.eventModel
      .find({ session_id: sessionId })
      .sort({ timestamp: 1, server_received_at: 1 })
      .select({ _id: 0, session_id: 0, referrer: 0, user_agent: 0, server_received_at: 0 })
      .lean<TimelineEvent[]>()
      .exec();

    const first = events[0]?.timestamp ? new Date(events[0].timestamp).getTime() : 0;
    const last = events.length
      ? new Date(events[events.length - 1].timestamp).getTime()
      : 0;

    return {
      sessionId,
      count: events.length,
      durationMs: events.length ? last - first : 0,
      events,
    };
  }
}
