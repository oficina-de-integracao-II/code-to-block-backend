import { type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  cleanDatabase,
  getTestDatabase,
  teardownTestDatabase,
} from './setup.js';

describe('GET /auth/me (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const db = await getTestDatabase();
    prisma = db.prisma;
    process.env.DATABASE_URL = db.url;

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

  afterEach(() => cleanDatabase());

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await teardownTestDatabase();
    }
  });

  it('retorna 200 com o usuário do token válido', async () => {
    const user = await prisma.user.create({
      data: {
        nome: 'Ana',
        email: 'ana@example.com',
        senhaHash: await bcrypt.hash('senha-correta', 4),
      },
    });
    const login = await http()
      .post('/auth/login')
      .send({ email: 'ana@example.com', senha: 'senha-correta' })
      .expect(200);

    await http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200, {
        id: user.id,
        nome: 'Ana',
        email: 'ana@example.com',
        role: 'USER',
      });
  });

  it('retorna 401 sem token', async () => {
    const res = await http().get('/auth/me').expect(401);

    expect(res.body).toEqual({
      statusCode: 401,
      message: 'Token ausente',
      error: 'Unauthorized',
    });
  });

  it('retorna 401 com token expirado', async () => {
    const expirado = new JwtService({ secret: process.env.JWT_SECRET }).sign(
      { sub: 1, role: 'USER' },
      { expiresIn: -10 },
    );

    const res = await http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${expirado}`)
      .expect(401);

    expect(res.body).toEqual({
      statusCode: 401,
      message: 'Token inválido ou expirado',
      error: 'Unauthorized',
    });
  });
});
