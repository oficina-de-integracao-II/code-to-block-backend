import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  cleanDatabase,
  getTestDatabase,
  teardownTestDatabase,
} from './setup.js';

describe('POST /auth/logout (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const db = await getTestDatabase();
    prisma = db.prisma;
    process.env.DATABASE_URL = db.url;

    const { AppModule } = await import('../../src/app.module.js');
    const { setupApp } = await import('../../src/setup-app.js');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
  });

  afterEach(() => cleanDatabase());

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await teardownTestDatabase();
    }
  });

  async function login() {
    await prisma.user.create({
      data: {
        nome: 'Ana',
        email: 'ana@example.com',
        senhaHash: await bcrypt.hash('senha-correta', 4),
      },
    });

    const res = await http()
      .post('/auth/login')
      .send({ email: 'ana@example.com', senha: 'senha-correta' })
      .expect(200);

    return res.body.accessToken as string;
  }

  it('retorna 204 e o mesmo token passa a receber 401 em /auth/me', async () => {
    const accessToken = await login();

    await http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await http()
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });

  it('retorna 401 sem token', async () => {
    await http().post('/auth/logout').expect(401);
  });

  it('não afeta outros tokens emitidos para o mesmo usuário', async () => {
    await login();

    const segundoLogin = await http()
      .post('/auth/login')
      .send({ email: 'ana@example.com', senha: 'senha-correta' })
      .expect(200);
    const outroToken = segundoLogin.body.accessToken as string;

    await http()
      .post('/auth/logout')
      .set('Authorization', `Bearer ${outroToken}`)
      .expect(204);

    const primeiroLoginNovamente = await http()
      .post('/auth/login')
      .send({ email: 'ana@example.com', senha: 'senha-correta' })
      .expect(200);

    await http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${primeiroLoginNovamente.body.accessToken}`)
      .expect(200);
  });
});
