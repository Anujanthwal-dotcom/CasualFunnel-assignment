import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AnalyticsEvent } from '../events/schemas/event.schema.js';
import type { HeatmapQueryDto } from './dto/heatmap-query.dto.js';

export interface HeatmapPoint {
  x: number;
  y: number;
  pageUrl: string;
  eventType?: string;
  timestamp: Date;
}

export interface HeatmapResponse {
  pageUrl: string | null;
  total: number;
  truncated: boolean;
  /** Representative viewport the points were captured in (max seen per axis). */
  bounds: { width: number; height: number };
  points: HeatmapPoint[];
}

const DEFAULT_BOUNDS = { width: 1440, height: 900 };

@Injectable()
export class HeatmapService {
  private readonly maxPoints: number;

  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly eventModel: Model<AnalyticsEvent>,
    config: ConfigService,
  ) {
    this.maxPoints = Number(config.get('HEATMAP_MAX_POINTS') ?? 20000);
  }

  /**
   * Click coordinates for a page, backed by the
   * `{ page_url: 1, event_type: 1, timestamp: -1 }` index.
   */
  async clicks(query: HeatmapQueryDto): Promise<HeatmapResponse> {
    const filter: Record<string, unknown> = {
      event_type: 'click',
      x: { $ne: null },
      y: { $ne: null },
    };

    if (query.pageUrl) filter.page_url = query.pageUrl;
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = new Date(query.from);
      if (query.to) range.$lte = new Date(query.to);
      filter.timestamp = range;
    }

    const docs = await this.eventModel
      .find(filter, { x: 1, y: 1, viewport: 1, timestamp: 1, page_url: 1, event_type: 1, _id: 0 })
      .sort({ timestamp: -1 })
      .limit(this.maxPoints)
      .lean()
      .exec();

    let width = 0;
    let height = 0;
    for (const doc of docs) {
      if (doc.viewport?.w && doc.viewport.w > width) width = doc.viewport.w;
      if (doc.viewport?.h && doc.viewport.h > height) height = doc.viewport.h;
    }

    return {
      pageUrl: query.pageUrl ?? null,
      total: docs.length,
      truncated: docs.length >= this.maxPoints,
      bounds: {
        width: width || DEFAULT_BOUNDS.width,
        height: height || DEFAULT_BOUNDS.height,
      },
      points: docs.map((doc) => ({
        x: doc.x as number,
        y: doc.y as number,
        pageUrl: doc.page_url,
        eventType: (doc as { event_type?: string }).event_type ?? 'click',
        timestamp: doc.timestamp,
      })),
    };
  }
}
