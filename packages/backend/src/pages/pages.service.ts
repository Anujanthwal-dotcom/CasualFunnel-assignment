import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, PipelineStage } from 'mongoose';
import { AnalyticsEvent } from '../events/schemas/event.schema.js';

export interface PageSummary {
  pageUrl: string;
  eventCount: number;
  clickCount: number;
  pageViewCount: number;
  sessionCount: number;
  lastSeen: Date;
}

@Injectable()
export class PagesService {
  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly eventModel: Model<AnalyticsEvent>,
  ) {}

  /** Distinct tracked URLs, each with counts — powers the heatmap selector. */
  async list(): Promise<PageSummary[]> {
    const pipeline: PipelineStage[] = [
      {
        $group: {
          _id: '$page_url',
          eventCount: { $sum: 1 },
          clickCount: { $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] } },
          pageViewCount: { $sum: { $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0] } },
          sessions: { $addToSet: '$session_id' },
          lastSeen: { $max: '$timestamp' },
        },
      },
      { $addFields: { sessionCount: { $size: '$sessions' } } },
      {
        $project: {
          _id: 0,
          pageUrl: '$_id',
          eventCount: 1,
          clickCount: 1,
          pageViewCount: 1,
          sessionCount: 1,
          lastSeen: 1,
        },
      },
      { $sort: { eventCount: -1 } },
      { $limit: 500 },
    ];

    return this.eventModel.aggregate<PageSummary>(pipeline).exec();
  }
}
