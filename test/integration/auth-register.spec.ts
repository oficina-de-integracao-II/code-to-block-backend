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

describe('POST /auth/register (integração)', () => {
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

  it('retorna 201 com accessToken e o nome enviado pelo cliente', async () => {
    const res = await http()
      .post('/auth/register')
      .send({ nome: 'Ana Silva', email: 'ana@example.com', senha: 'senha-segura-123' })
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'ana@example.com' },
    });
    const payload = new JwtService({
      secret: process.env.JWT_SECRET,
    }).verify<{ sub: number }>(res.body.accessToken);

    expect(user.nome).toBe('Ana Silva');
    expect(payload.sub).toBe(user.id);
    expect(res.body.user).toEqual({
      id: user.id,
      nome: 'Ana Silva',
      email: 'ana@example.com',
      role: 'USER',
    });
  });

  it('não expõe senha nem hash na resposta', async () => {
    const res = await http()
      .post('/auth/register')
      .send({ nome: 'Ana', email: 'ana@example.com', senha: 'senha-segura-123' })
      .expect(201);

    expect(res.body).not.toHaveProperty('senha');
    expect(res.body.user).not.toHaveProperty('senhaHash');
    expect(res.body.user).not.toHaveProperty('senha_hash');
  });

  it('armazena a senha apenas como hash bcrypt', async () => {
    await http()
      .post('/auth/register')
      .send({ nome: 'Ana', email: 'ana@example.com', senha: 'senha-segura-123' })
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'ana@example.com' },
    });

    expect(user.senhaHash).not.toBe('senha-segura-123');
    expect(await bcrypt.compare('senha-segura-123', user.senhaHash!)).toBe(true);
  });

  it('retorna 400 em dados inválidos', async () => {
    await http()
      .post('/auth/register')
      .send({ nome: '', email: 'nao-e-email', senha: '123' })
      .expect(400);
  });

  it('retorna 409 quando o e-mail já está cadastrado', async () => {
    await prisma.user.create({
      data: { nome: 'Ana', email: 'ana@example.com', senhaHash: 'hash' },
    });

    await http()
      .post('/auth/register')
      .send({ nome: 'Outra Ana', email: 'ana@example.com', senha: 'senha-segura-123' })
      .expect(409);
  });
});
