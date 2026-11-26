import { type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { PrismaClient, Role } from '../../src/generated/prisma/client.js';
import {
  cleanDatabase,
  getTestDatabase,
  teardownTestDatabase,
} from './setup.js';

describe('CRUD administrativo de funções (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const http = () => request(app.getHttpServer());

  const payload = {
    nome: 'VireEsquerda',
    descricao: 'Gira o robô 90° para a esquerda.',
    parametros: null,
    codigoArduino:
      'void VireEsquerda() {\n  digitalWrite(5, LOW);\n  digitalWrite(6, HIGH);\n}',
    blocoDefinicao: {
      type: 'VireEsquerda',
      message0: 'VireEsquerda',
      previousStatement: null,
      nextStatement: null,
      colour: '#F7CA1B',
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
  async function authAs(role: Role) {
    const user = await prisma.user.create({
      data: { nome: role, email: `${role.toLowerCase()}@example.com`, role },
    });
    const token = new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      role,
    });

    return { user, header: `Bearer ${token}` };
  }

  function criarFuncao(nome: string) {
    return prisma.functionCatalog.create({
      data: {
        nome,
        descricao: `Descrição de ${nome}`,
        codigoArduino: `void ${nome}() {}`,
        blocoDefinicao: { type: nome, message0: nome },
      },
    });
  }

  describe('como ADMIN', () => {
    it('POST /functions retorna 201 com a função criada', async () => {
      const { user, header } = await authAs('ADMIN');

      const res = await http()
        .post('/functions')
        .set('Authorization', header)
        .send(payload)
        .expect(201);

      expect(res.body).toEqual({ id: expect.any(Number), ...payload });
      await expect(
        prisma.functionCatalog.findUnique({ where: { id: res.body.id } }),
      ).resolves.toMatchObject({ criadoPorId: user.id });
    });

    it('PUT /functions/:id retorna 200 com a função atualizada', async () => {
      const { header } = await authAs('ADMIN');
      const fn = await criarFuncao('Andar');

      await http()
        .put(`/functions/${fn.id}`)
        .set('Authorization', header)
        .send({ ...payload, parametros: { graus: 90 } })
        .expect(200, { id: fn.id, ...payload, parametros: { graus: 90 } });
    });

    it('DELETE /functions/:id retorna 204 e remove a função', async () => {
      const { header } = await authAs('ADMIN');
      const fn = await criarFuncao('Andar');

      await http()
        .delete(`/functions/${fn.id}`)
        .set('Authorization', header)
        .expect(204, '');

      await expect(prisma.functionCatalog.count()).resolves.toBe(0);
    });

    it('POST com nome duplicado retorna 409', async () => {
      const { header } = await authAs('ADMIN');
      await criarFuncao('VireEsquerda');

      const res = await http()
        .post('/functions')
        .set('Authorization', header)
        .send(payload)
        .expect(409);

      expect(res.body).toEqual({
        statusCode: 409,
        message: 'Já existe uma função com esse nome',
        error: 'Conflict',
      });
    });

    it('PUT renomeando para um nome existente retorna 409', async () => {
      const { header } = await authAs('ADMIN');
      await criarFuncao('VireEsquerda');
      const outra = await criarFuncao('Andar');

      await http()
        .put(`/functions/${outra.id}`)
        .set('Authorization', header)
        .send(payload)
        .expect(409);
    });

    it.each(['put', 'delete'] as const)(
      '%s em id inexistente retorna 404',
      async (method) => {
        const { header } = await authAs('ADMIN');

        const res = await http()
          [method]('/functions/999999')
          .set('Authorization', header)
          .send(payload)
          .expect(404);

        expect(res.body).toEqual({
          statusCode: 404,
          message: 'Função não encontrada',
          error: 'Not Found',
        });
      },
    );

    it('POST com blocoDefinicao inválido retorna 400 indicando o campo', async () => {
      const { header } = await authAs('ADMIN');

      const res = await http()
        .post('/functions')
        .set('Authorization', header)
        .send({ ...payload, blocoDefinicao: { type: 'VireEsquerda' } })
        .expect(400);

      expect(res.body.message).toEqual([
        expect.stringMatching(/^blocoDefinicao inválido: message0/),
      ]);
    });

    it('POST com campo fora do contrato retorna 400', async () => {
      const { header } = await authAs('ADMIN');

      await http()
        .post('/functions')
        .set('Authorization', header)
        .send({ ...payload, criadoPorId: 1 })
        .expect(400);
    });
  });

  describe('como usuário comum', () => {
    it.each([
      ['post', '/functions'],
      ['put', '/functions/1'],
      ['delete', '/functions/1'],
    ] as const)('%s %s retorna 403', async (method, url) => {
      const { header } = await authAs('USER');

      const res = await http()
        [method](url)
        .set('Authorization', header)
        .send(payload)
        .expect(403);

      expect(res.body).toEqual({
        statusCode: 403,
        message: 'Acesso não permitido para este perfil',
        error: 'Forbidden',
      });
    });
  });

  describe('sem token', () => {
    it.each([
      ['post', '/functions'],
      ['put', '/functions/1'],
      ['delete', '/functions/1'],
    ] as const)('%s %s retorna 401', async (method, url) => {
      await http()[method](url).send(payload).expect(401);
    });
  });
});
