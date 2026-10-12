import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HeatmapQueryDto } from './dto/heatmap-query.dto.js';
import { HeatmapService } from './heatmap.service.js';

@ApiTags('heatmap')
@Controller('heatmap')
export class HeatmapController {
  constructor(private readonly heatmapService: HeatmapService) {}

  @Get()
  @ApiOperation({ summary: 'Click coordinate data, optionally filtered by page URL' })
  @ApiOkResponse({ description: 'Click points plus the viewport bounds to render them in.' })
  clicks(@Query() query: HeatmapQueryDto) {
    return this.heatmapService.clicks(query);
  }
}
