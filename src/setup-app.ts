import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Env } from './common/env.schema.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';

// Usado pelo main.ts e pelos testes, para ambos rodarem a mesma configuração.
export function setupApp(app: INestApplication) {
  const config = app.get(ConfigService<Env, true>);

  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Code to Block API').addBearerAuth().build(),
  );
  SwaggerModule.setup('docs', app, document);
}
