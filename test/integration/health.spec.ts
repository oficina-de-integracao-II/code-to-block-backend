import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getTestDatabase, teardownTestDatabase } from './setup.js';

describe('GET /health (integração com banco real)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const { url } = await getTestDatabase();

    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET ??= 'integration-test-secret';

    // Importar somente depois de configurar o ambiente.
    const { AppModule } = await import('../../src/app.module.js');
    const { setupApp } = await import('../../src/setup-app.js');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });

    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await teardownTestDatabase();
    }
  });

  it('retorna 200 com a aplicação conectada ao Postgres efêmero', async () => {
    if (!app) {
      throw new Error('A aplicação não foi inicializada.');
    }

    await request(app.getHttpServer()).get('/health').expect(200, {
      status: 'ok',
    });
  });
});