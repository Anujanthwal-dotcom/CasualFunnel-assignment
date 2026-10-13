import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { EventsController } from './events.controller.js';
import { EventsGateway } from './events.gateway.js';
import { EventsService } from './events.service.js';
import { AnalyticsEvent, AnalyticsEventSchema } from './schemas/event.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AnalyticsEvent.name, schema: AnalyticsEventSchema }]),
  ],
  controllers: [EventsController],
  providers: [EventsService, EventsGateway, ApiKeyGuard],
  exports: [EventsService, EventsGateway],
})
export class EventsModule {}
