import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsEvent, AnalyticsEventSchema } from '../events/schemas/event.schema.js';
import { HeatmapController } from './heatmap.controller.js';
import { HeatmapService } from './heatmap.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AnalyticsEvent.name, schema: AnalyticsEventSchema }]),
  ],
  controllers: [HeatmapController],
  providers: [HeatmapService],
})
export class HeatmapModule {}
