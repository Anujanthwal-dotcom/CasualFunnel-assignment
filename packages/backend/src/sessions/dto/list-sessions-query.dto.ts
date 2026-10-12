import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const SESSION_SORT_FIELDS = [
  'lastSeen',
  'firstSeen',
  'eventCount',
  'clickCount',
  'pageViewCount',
  'durationMs',
] as const;
export type SessionSortField = (typeof SESSION_SORT_FIELDS)[number];

export class ListSessionsQueryDto {
  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 25;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @ApiPropertyOptional({ description: 'Case-insensitive substring match on session id.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: SESSION_SORT_FIELDS, default: 'lastSeen' })
  @IsOptional()
  @IsIn(SESSION_SORT_FIELDS)
  sort: SessionSortField = 'lastSeen';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
