import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PagesService } from './pages.service.js';

@ApiTags('pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @ApiOperation({ summary: 'Distinct tracked page URLs with counts' })
  @ApiOkResponse({ description: 'Pages ordered by total event count.' })
  list() {
    return this.pagesService.list();
  }
}
