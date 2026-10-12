import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Lightweight shared-secret guard.
 *
 * If `API_KEY` is unset (the default for local dev) every request is allowed,
 * so the demo page works with zero configuration. When it is set, ingestion
 * requests must include a matching `x-api-key` header.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('API_KEY');
    if (!expected) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-api-key');
    if (provided !== expected) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    return true;
  }
}
