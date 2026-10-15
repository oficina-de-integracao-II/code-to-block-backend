import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { setupApp } from '../../src/setup-app.js';
import { getTestDatabase, teardownTestDatabase } from './setup.js';

describe('GET /health (integração com banco real)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const { url } = await getTestDatabase();
    process.env.DATABASE_URL = url;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('retorna 200 com a aplicação conectada ao Postgres efêmero', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, {
      status: 'ok',
    });
  });
});
