import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service.js';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Global event/session/page counters' })
  @ApiOkResponse({ description: 'Aggregate totals across all events.' })
  overview() {
    return this.statsService.overview();
  }
}
