import { type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PROJECT_LIMITS } from '../../src/projects/dto/project-write.dto.js';
import {
  cleanDatabase,
  getTestDatabase,
  teardownTestDatabase,
} from './setup.js';

describe('POST /projects (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const http = () => request(app.getHttpServer());

  const payload = {
    nome: 'Meu robô',
    codigoFonte: 'Andar();\nVireEsquerda();\nPare();',
    estadoBlocos: {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'Andar', id: 'b1', x: 0, y: 0 }],
      },
    },
  };

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

  // Cria o usuário no banco e devolve o cabeçalho com um token dele.
  async function authAs(email: string) {
    const user = await prisma.user.create({ data: { nome: 'Ana', email } });
    const token = new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      role: user.role,
    });

    return { user, header: `Bearer ${token}` };
  }

  it('retorna 201 com o projeto criado para o usuário do token', async () => {
    const { user, header } = await authAs('ana@example.com');

    const res = await http()
      .post('/projects')
      .set('Authorization', header)
      .send(payload)
      .expect(201);

    expect(res.body).toEqual({
      id: expect.any(Number),
      ...payload,
      criadoEm: expect.any(String),
      atualizadoEm: expect.any(String),
    });
    await expect(
      prisma.project.findUnique({ where: { id: res.body.id } }),
    ).resolves.toMatchObject({ usuarioId: user.id });
  });

  it('ignora usuarioId enviado e vincula o projeto ao usuário do token', async () => {
    const { user, header } = await authAs('ana@example.com');
    const { user: outro } = await authAs('bia@example.com');

    const res = await http()
      .post('/projects')
      .set('Authorization', header)
      .send({ ...payload, usuarioId: outro.id })
      .expect(201);

    expect(res.body).not.toHaveProperty('usuarioId');
    await expect(
      prisma.project.findUnique({ where: { id: res.body.id } }),
    ).resolves.toMatchObject({ usuarioId: user.id });
  });

  it.each([
    ['sem nome', { nome: undefined }],
    ['com nome vazio', { nome: '' }],
    ['com nome só com espaços', { nome: '   ' }],
    ['com estadoBlocos que não é objeto', { estadoBlocos: 'blocos' }],
  ])('retorna 400 %s', async (_caso, campos) => {
    const { header } = await authAs('ana@example.com');

    await http()
      .post('/projects')
      .set('Authorization', header)
      .send({ ...payload, ...campos })
      .expect(400);

    await expect(prisma.project.count()).resolves.toBe(0);
  });

  it.each([
    [
      'codigoFonte',
      { codigoFonte: 'a'.repeat(PROJECT_LIMITS.codigoFonte + 1) },
    ],
    [
      'estadoBlocos',
      { estadoBlocos: { texto: 'a'.repeat(PROJECT_LIMITS.estadoBlocos) } },
    ],
  ])(
    'retorna 400 indicando o campo quando %s passa do limite',
    async (campo, campos) => {
      const { header } = await authAs('ana@example.com');

      const res = await http()
        .post('/projects')
        .set('Authorization', header)
        .send({ ...payload, ...campos })
        .expect(400);

      expect(res.body.message).toEqual([
        expect.stringMatching(new RegExp(`^${campo} `)),
      ]);
      await expect(prisma.project.count()).resolves.toBe(0);
    },
  );

  it('retorna 413 quando o corpo passa do limite do servidor', async () => {
    const { header } = await authAs('ana@example.com');

    const res = await http()
      .post('/projects')
      .set('Authorization', header)
      .send({ ...payload, codigoFonte: 'a'.repeat(200_000) })
      .expect(413);

    expect(res.body).toEqual({
      statusCode: 413,
      message: 'Corpo da requisição excede o limite do servidor',
      error: 'Payload Too Large',
    });
    await expect(prisma.project.count()).resolves.toBe(0);
  });

  it('retorna 401 sem token', async () => {
    const res = await http().post('/projects').send(payload).expect(401);

    expect(res.body).toEqual({
      statusCode: 401,
      message: 'Token ausente',
      error: 'Unauthorized',
    });
  });
});
