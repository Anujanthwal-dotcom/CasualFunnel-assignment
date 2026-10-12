import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class HeatmapQueryDto {
  @ApiPropertyOptional({
    description: 'Exact page URL to filter on (see GET /api/pages). Omit for all pages.',
    example: 'http://localhost:5500/demo/index.html',
  })
  @IsOptional()
  @IsString()
  pageUrl?: string;

  @ApiPropertyOptional({ description: 'Inclusive lower bound (ISO-8601).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive upper bound (ISO-8601).' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
