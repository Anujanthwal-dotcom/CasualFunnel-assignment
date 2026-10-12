import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, PipelineStage } from 'mongoose';
import { AnalyticsEvent } from '../events/schemas/event.schema.js';

export interface StatsOverview {
  totalEvents: number;
  totalSessions: number;
  totalPages: number;
  clicks: number;
  pageViews: number;
  firstSeen: Date | null;
  lastSeen: Date | null;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly eventModel: Model<AnalyticsEvent>,
  ) {}

  /** Global counters for the dashboard header. */
  async overview(): Promise<StatsOverview> {
    const pipeline: PipelineStage[] = [
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          clicks: { $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] } },
          pageViews: { $sum: { $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0] } },
          sessions: { $addToSet: '$session_id' },
          pages: { $addToSet: '$page_url' },
          firstSeen: { $min: '$timestamp' },
          lastSeen: { $max: '$timestamp' },
        },
      },
      {
        $project: {
          _id: 0,
          totalEvents: 1,
          clicks: 1,
          pageViews: 1,
          totalSessions: { $size: '$sessions' },
          totalPages: { $size: '$pages' },
          firstSeen: 1,
          lastSeen: 1,
        },
      },
    ];

    const [row] = await this.eventModel.aggregate<StatsOverview>(pipeline).exec();

    return (
      row ?? {
        totalEvents: 0,
        totalSessions: 0,
        totalPages: 0,
        clicks: 0,
        pageViews: 0,
        firstSeen: null,
        lastSeen: null,
      }
    );
  }
}
