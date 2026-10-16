import { type INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import type { GoogleProfile } from '../../src/auth/google-verifier.js';
import {
  cleanDatabase,
  getTestDatabase,
  teardownTestDatabase,
} from './setup.js';

// Stub do Google: nenhuma chamada real à rede nos testes.
const perfis: Record<string, GoogleProfile> = {
  'token-ana': { googleId: 'g-ana', email: 'ana@gmail.com', nome: 'Ana' },
  'token-bia': { googleId: 'g-bia', email: 'bia@gmail.com', nome: 'Bia' },
};
const googleStub = async (idToken: string) => {
  if (!perfis[idToken]) {
    throw new UnauthorizedException('Token do Google inválido');
  }
  return perfis[idToken];
};

describe('POST /auth/google (integração)', () => {
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
    const { GOOGLE_VERIFIER } =
      await import('../../src/auth/google-verifier.js');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GOOGLE_VERIFIER)
      .useValue(googleStub)
      .compile();
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

  it('cria usuário novo e o JWT emitido funciona no /auth/me', async () => {
    const login = await http()
      .post('/auth/google')
      .send({ idToken: 'token-ana' })
      .expect(200);

    const salvo = await prisma.user.findUniqueOrThrow({
      where: { email: 'ana@gmail.com' },
    });
    expect(salvo).toMatchObject({ googleId: 'g-ana', senhaHash: null });

    const esperado = {
      id: salvo.id,
      nome: 'Ana',
      email: 'ana@gmail.com',
      role: 'USER',
    };
    expect(login.body).toEqual({
      accessToken: expect.any(String),
      user: esperado,
    });
    await http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200, esperado);
  });

  it('vincula a conta local com o mesmo e-mail e invalida a senha não confirmada', async () => {
    // Senha criada por quem cadastrou o e-mail antes do dono (sem confirmação).
    const local = await prisma.user.create({
      data: {
        nome: 'Bia',
        email: 'bia@gmail.com',
        senhaHash: await bcrypt.hash('senha-do-intruso', 4),
      },
    });

    const res = await http()
      .post('/auth/google')
      .send({ idToken: 'token-bia' })
      .expect(200);

    expect(res.body.user.id).toBe(local.id);
    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: local.id } }),
    ).resolves.toMatchObject({ googleId: 'g-bia', senhaHash: null });
    expect(await prisma.user.count()).toBe(1);
    await http()
      .post('/auth/login')
      .send({ email: 'bia@gmail.com', senha: 'senha-do-intruso' })
      .expect(401);
  });

  it('retorna 401 para token inválido', async () => {
    const res = await http()
      .post('/auth/google')
      .send({ idToken: 'token-falso' })
      .expect(401);

    expect(res.body).toEqual({
      statusCode: 401,
      message: 'Token do Google inválido',
      error: 'Unauthorized',
    });
  });

  it('retorna 400 sem idToken', async () => {
    await http().post('/auth/google').send({}).expect(400);
  });
});
