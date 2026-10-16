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

describe('POST /auth/login (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const db = await getTestDatabase();
    prisma = db.prisma;
    process.env.DATABASE_URL = db.url;
    // Diferente do padrão (1d) para provar que a expiração vem da configuração.
    vi.stubEnv('JWT_EXPIRES_IN', '2h');

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

  beforeEach(async () => {
    await prisma.user.create({
      data: {
        nome: 'Ana',
        email: 'ana@example.com',
        senhaHash: await bcrypt.hash('senha-correta', 4),
      },
    });
  });

  afterEach(() => cleanDatabase());

  afterAll(async () => {
    vi.unstubAllEnvs();
    try {
      await app?.close();
    } finally {
      await teardownTestDatabase();
    }
  });

  it('retorna 200 com token decodificável e expiração de JWT_EXPIRES_IN', async () => {
    const res = await http()
      .post('/auth/login')
      .send({ email: 'ana@example.com', senha: 'senha-correta' })
      .expect(200);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'ana@example.com' },
    });
    const payload = new JwtService({
      secret: process.env.JWT_SECRET,
    }).verify<{ sub: number; iat: number; exp: number }>(res.body.accessToken);

    expect(payload.sub).toBe(user.id);
    expect(payload.exp - payload.iat).toBe(2 * 60 * 60);
    expect(res.body.user).toEqual({
      id: user.id,
      nome: 'Ana',
      email: 'ana@example.com',
      role: 'USER',
    });
  });

  it('retorna 401 com a mesma mensagem para senha errada e e-mail inexistente', async () => {
    const senhaErrada = await http()
      .post('/auth/login')
      .send({ email: 'ana@example.com', senha: 'senha-errada' })
      .expect(401);
    const emailInexistente = await http()
      .post('/auth/login')
      .send({ email: 'nao-existe@example.com', senha: 'senha-correta' })
      .expect(401);

    expect(senhaErrada.body).toEqual({
      statusCode: 401,
      message: 'Credenciais inválidas',
      error: 'Unauthorized',
    });
    expect(emailInexistente.body).toEqual(senhaErrada.body);
  });

  it('recusa login local de conta criada só com Google', async () => {
    await prisma.user.create({
      data: { nome: 'Bia', email: 'bia@example.com', googleId: 'google-123' },
    });

    await http()
      .post('/auth/login')
      .send({ email: 'bia@example.com', senha: 'qualquer' })
      .expect(401);
  });
});
