import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEventDto } from '../dto/create-event.dto.js';

/** Result of normalizing + validating an ingestion request body. */
export interface NormalizedIngest {
  events: CreateEventDto[];
  /** Number of items present in the original payload (valid + invalid). */
  received: number;
  /** Human-readable reasons for each rejected item. */
  errors: string[];
}

/**
 * Normalizes the three accepted ingestion shapes before validation:
 *   - a single event object:      `{ session_id, event_type, ... }`
 *   - a bare array:               `[ {...}, {...} ]`
 *   - the canonical envelope:     `{ events: [ {...}, {...} ] }`
 *
 * The tracker always sends the envelope, but accepting all three makes the
 * endpoint forgiving for manual testing (curl / Swagger).
 *
 * Note: the controller declares this body as `unknown` so Nest's global
 * ValidationPipe steps aside and this pipe owns validation end to end.
 */
@Injectable()
export class IngestPipe implements PipeTransform<unknown, Promise<NormalizedIngest>> {
  async transform(value: unknown): Promise<NormalizedIngest> {
    const raw = this.normalize(value);
    if (raw.length === 0) {
      throw new BadRequestException(
        'Request body must be an event, an array of events, or { events: [...] }.',
      );
    }

    const events: CreateEventDto[] = [];
    const errors: string[] = [];

    for (let index = 0; index < raw.length; index += 1) {
      const dto = plainToInstance(CreateEventDto, raw[index]);
      const validationErrors = await validate(dto, { whitelist: true });
      if (validationErrors.length > 0) {
        const detail = validationErrors
          .map((e) => Object.values(e.constraints ?? {}).join(', '))
          .join('; ');
        errors.push(`events[${index}]: ${detail}`);
      } else {
        events.push(dto);
      }
    }

    if (events.length === 0) {
      throw new BadRequestException({ message: 'No valid events in payload.', errors });
    }

    return { events, received: raw.length, errors };
  }

  private normalize(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (Array.isArray(obj.events)) return obj.events;
      if ('session_id' in obj || 'event_type' in obj) return [obj];
    }
    return [];
  }
}
