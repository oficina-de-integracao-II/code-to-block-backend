import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  cleanDatabase,
  getTestDatabase,
  teardownTestDatabase,
} from './setup.js';

// TODO(BE-10): cobrir 401 sem token quando o JwtAuthGuard existir.
describe('catálogo de funções (integração com banco real)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const db = await getTestDatabase();
    prisma = db.prisma;

    process.env.DATABASE_URL = db.url;
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

  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await teardownTestDatabase();
    }
  });

  function criarFuncao(nome: string, parametros?: object) {
    return prisma.functionCatalog.create({
      data: {
        nome,
        descricao: `Descrição de ${nome}`,
        codigoArduino: `${nome}();`,
        blocoDefinicao: { type: nome, message0: nome },
        parametros,
      },
    });
  }

  describe('GET /functions', () => {
    it('retorna 200 com as funções do catálogo', async () => {
      const a = await criarFuncao('piscar_led', { pino: 13 });
      const b = await criarFuncao('ler_sensor');

      const res = await request(app.getHttpServer())
        .get('/functions')
        .expect(200);

      expect(res.body).toEqual([
        {
          id: a.id,
          nome: 'piscar_led',
          descricao: 'Descrição de piscar_led',
          codigoArduino: 'piscar_led();',
          blocoDefinicao: { type: 'piscar_led', message0: 'piscar_led' },
        },
        {
          id: b.id,
          nome: 'ler_sensor',
          descricao: 'Descrição de ler_sensor',
          codigoArduino: 'ler_sensor();',
          blocoDefinicao: { type: 'ler_sensor', message0: 'ler_sensor' },
        },
      ]);
    });

    it('retorna 200 com lista vazia quando não há funções', async () => {
      await request(app.getHttpServer()).get('/functions').expect(200, []);
    });
  });

  describe('GET /functions/:id', () => {
    it('retorna 200 com os detalhes da função', async () => {
      const fn = await criarFuncao('piscar_led', { pino: 13 });

      await request(app.getHttpServer())
        .get(`/functions/${fn.id}`)
        .expect(200, {
          id: fn.id,
          nome: 'piscar_led',
          descricao: 'Descrição de piscar_led',
          codigoArduino: 'piscar_led();',
          blocoDefinicao: { type: 'piscar_led', message0: 'piscar_led' },
          parametros: { pino: 13 },
        });
    });

    it('retorna 404 para id inexistente', async () => {
      const res = await request(app.getHttpServer())
        .get('/functions/999999')
        .expect(404);

      expect(res.body).toEqual({
        statusCode: 404,
        message: 'Função não encontrada',
        error: 'Not Found',
      });
    });

    it.each(['abc', '0', '99999999999'])(
      'retorna 400 para id inválido (%s)',
      async (id) => {
        await request(app.getHttpServer())
          .get(`/functions/${id}`)
          .expect(400);
      },
    );
  });
});
