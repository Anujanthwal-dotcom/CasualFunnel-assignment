import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // CORS is configured explicitly below.
    cors: false,
  });
  const logger = new Logger('Bootstrap');

  // --- CORS -------------------------------------------------------------
  // The demo page is opened from file:// (Origin: null) and the dashboard
  // runs on another port, so cross-origin calls are expected. `*` mirrors the
  // request origin, which is what local development and the demo need.
  const rawOrigins = (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim());
  const allowAll = rawOrigins.includes('*');
  app.enableCors({
    origin: allowAll ? true : rawOrigins.filter(Boolean),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
    credentials: false,
    maxAge: 86400,
  });

  // --- Global concerns --------------------------------------------------
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Serve the compiled tracker bundle at /tracker.js (the "CDN" role).
  // Static middleware bypasses the global `api` prefix.
  app.useStaticAssets(join(process.cwd(), 'public'), { index: false, redirect: false });

  // --- Swagger ----------------------------------------------------------
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CausalFunnel Analytics API')
    .setDescription(
      'Ingestion and aggregation API for the CausalFunnel user-analytics assignment. ' +
        'Events are stored in MongoDB and aggregated on demand.',
    )
    .setVersion('1.0.0')
    .addTag('events', 'Event ingestion')
    .addTag('sessions', 'Session aggregation + timelines')
    .addTag('heatmap', 'Click coordinate data')
    .addTag('pages', 'Tracked page URLs')
    .addTag('stats', 'Global counters')
    .addTag('health', 'Service health')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');

  logger.log(`API      -> http://localhost:${port}/api`);
  logger.log(`Tracker  -> http://localhost:${port}/tracker.js`);
  logger.log(`Swagger  -> http://localhost:${port}/api/docs`);
}

await bootstrap();
