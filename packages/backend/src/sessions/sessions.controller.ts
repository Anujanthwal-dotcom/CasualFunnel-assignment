import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto.js';
import { SessionsService } from './sessions.service.js';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List sessions with aggregate event counts' })
  @ApiOkResponse({ description: 'A page of session summaries, newest first by default.' })
  list(@Query() query: ListSessionsQueryDto) {
    return this.sessionsService.list(query);
  }

  @Get(':sessionId/timeline')
  @ApiOperation({ summary: 'Ordered event timeline for a single session' })
  @ApiParam({ name: 'sessionId', description: 'Session id from the session list.' })
  timeline(@Param('sessionId') sessionId: string) {
    return this.sessionsService.timeline(sessionId);
  }
}
