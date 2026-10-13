import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { CreateEventDto } from './dto/create-event.dto.js';
import { EventsGateway } from './events.gateway.js';
import { AnalyticsEvent } from './schemas/event.schema.js';

export interface IngestResult {
  received: number;
  accepted: number;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly eventModel: Model<AnalyticsEvent>,
    @Optional()
    private readonly eventsGateway?: EventsGateway,
  ) {}

  /**
   * Persists a batch of events. `ordered: false` lets valid documents land even
   * if one fails validation at the driver level, so a single bad event can
   * never sink the whole batch.
   */
  async ingest(events: CreateEventDto[]): Promise<IngestResult> {
    const docs = events.map((event) => ({
      session_id: event.session_id,
      event_type: event.event_type,
      page_url: event.page_url,
      timestamp: new Date(event.timestamp),
      x: event.x,
      y: event.y,
      viewport: event.viewport,
      referrer: event.referrer,
      user_agent: event.user_agent,
      metadata: event.metadata,
    }));

    const inserted = await this.eventModel.insertMany(docs, { ordered: false });
    this.logger.debug(`Ingested ${inserted.length}/${events.length} events`);

    if (this.eventsGateway && inserted.length > 0) {
      try {
        const realtimeEvents = events.slice(0, inserted.length).map((e) => ({
          session_id: e.session_id,
          event_type: e.event_type,
          page_url: e.page_url,
          timestamp: e.timestamp,
          x: e.x,
          y: e.y,
          viewport: e.viewport,
          referrer: e.referrer,
          user_agent: e.user_agent,
          metadata: e.metadata,
        }));
        this.eventsGateway.broadcastEvents(realtimeEvents);
      } catch (err) {
        this.logger.warn(`Failed to broadcast events over WebSocket: ${err}`);
      }
    }

    return { received: events.length, accepted: inserted.length };
  }
}
