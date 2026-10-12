import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/** Event types the tracker emits today. Extendable without a migration. */
export const EVENT_TYPES = ['page_view', 'click'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Viewport dimensions captured with every event (used to scale heatmaps). */
@Schema({ _id: false })
export class Viewport {
  @Prop({ type: Number, required: true })
  w!: number;

  @Prop({ type: Number, required: true })
  h!: number;
}

const ViewportSchema = SchemaFactory.createForClass(Viewport);

/**
 * A single analytics event. This collection is the source of truth; every
 * dashboard view is derived from it via aggregation.
 */
@Schema({
  collection: 'events',
  versionKey: false,
  timestamps: { createdAt: 'server_received_at', updatedAt: false },
})
export class AnalyticsEvent {
  /** Client-side session id (persisted by the tracker in localStorage/cookies). */
  @Prop({ type: String, required: true })
  session_id!: string;

  @Prop({ type: String, required: true })
  event_type!: string;

  @Prop({ type: String, required: true })
  page_url!: string;

  /** Client timestamp. Server receive time is `server_received_at`. */
  @Prop({ type: Date, required: true })
  timestamp!: Date;

  /** Click coordinates (viewport space), present for `click` events. */
  @Prop({ type: Number })
  x?: number;

  @Prop({ type: Number })
  y?: number;

  @Prop({ type: ViewportSchema, default: undefined })
  viewport?: Viewport;

  @Prop({ type: String })
  referrer?: string;

  @Prop({ type: String })
  user_agent?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  server_received_at?: Date;
}

export type AnalyticsEventDocument = HydratedDocument<AnalyticsEvent>;
export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);

// --- Indexes ------------------------------------------------------------
// Chosen to back the three hot read paths (timeline, heatmap, session list).
AnalyticsEventSchema.index({ session_id: 1, timestamp: 1 }, { name: 'session_timeline' });
AnalyticsEventSchema.index(
  { page_url: 1, event_type: 1, timestamp: -1 },
  { name: 'page_heatmap' },
);
AnalyticsEventSchema.index({ timestamp: -1 }, { name: 'recent_events' });
AnalyticsEventSchema.index({ session_id: 1, event_type: 1 }, { name: 'session_type_counts' });
