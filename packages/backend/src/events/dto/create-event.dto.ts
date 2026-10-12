import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { EVENT_TYPES } from '../schemas/event.schema.js';

export class ViewportDto {
  @ApiProperty({ example: 1440 })
  @IsInt()
  @Min(0)
  w!: number;

  @ApiProperty({ example: 900 })
  @IsInt()
  @Min(0)
  h!: number;
}

export class CreateEventDto {
  @ApiProperty({ example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' })
  @IsString()
  @IsNotEmpty()
  session_id!: string;

  @ApiProperty({
    description:
      'Event type. Built-ins are `page_view` and `click`; custom types (e.g. `cta_click`) are allowed.',
    enum: EVENT_TYPES,
    example: 'click',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  event_type!: string;

  @ApiProperty({ example: 'http://localhost:5173/demo.html' })
  @IsString()
  @IsNotEmpty()
  page_url!: string;

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
  @IsISO8601()
  timestamp!: string;

  @ApiPropertyOptional({ example: 412 })
  @IsOptional()
  @IsNumber()
  x?: number;

  @ApiPropertyOptional({ example: 260 })
  @IsOptional()
  @IsNumber()
  y?: number;

  @ApiPropertyOptional({ type: ViewportDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ViewportDto)
  viewport?: ViewportDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user_agent?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class IngestEventsDto {
  @ApiProperty({ type: [CreateEventDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventDto)
  events!: CreateEventDto[];
}
