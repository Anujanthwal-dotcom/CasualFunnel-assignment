import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { IngestEventsDto } from './dto/create-event.dto.js';
import { EventsService, type IngestResult } from './events.service.js';
import { IngestPipe, type NormalizedIngest } from './pipes/ingest.pipe.js';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Ingest one or many events',
    description:
      'Accepts a single event object, a bare array of events, or `{ events: [...] }`. ' +
      'Invalid items are reported in the response and skipped; valid items are persisted.',
  })
  @ApiHeader({
    name: 'x-api-key',
    required: false,
    description: 'Required only when API_KEY is set.',
  })
  @ApiBody({ type: IngestEventsDto })
  @ApiAcceptedResponse({
    description: 'Events accepted for persistence.',
    schema: {
      type: 'object',
      properties: {
        received: { type: 'number', example: 3 },
        accepted: { type: 'number', example: 2 },
        errors: { type: 'array', items: { type: 'string' }, example: ['events[2]: ...'] },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'No valid events were found in the payload.' })
  async ingest(@Body(IngestPipe) payload: unknown): Promise<IngestResult & { errors?: string[] }> {
    // `payload` is normalized + validated into NormalizedIngest by IngestPipe;
    // it is typed `unknown` so Nest's global ValidationPipe does not double-validate.
    const { events, received, errors } = payload as NormalizedIngest;
    const result = await this.eventsService.ingest(events);

    return errors.length > 0 ? { ...result, received, errors } : { ...result, received };
  }
}
