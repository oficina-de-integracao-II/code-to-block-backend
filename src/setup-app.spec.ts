import {
  Body,
  Controller,
  Get,
  type INestApplication,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { AppModule } from './app.module.js';
import { setupApp } from './setup-app.js';

class EchoDto {
  @IsString()
  nome: string;
}

// Rotas só de teste para exercitar validação e erros inesperados.
@Controller('test')
class TestController {
  @Post('echo')
  echo(@Body() body: EchoDto) {
    return body;
  }

  @Get('boom')
  boom() {
    throw new Error('detalhe interno');
  }
}

describe('Base HTTP (integração)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /health retorna 200', async () => {
    await http().get('/health').expect(200, { status: 'ok' });
  });

  it('payload válido passa pela validação', async () => {
    await http().post('/test/echo').send({ nome: 'Ana' }).expect(201);
  });

  it('campo extra retorna 400 no formato padrão', async () => {
    const res = await http()
      .post('/test/echo')
      .send({ nome: 'Ana', extra: 1 })
      .expect(400);

    expect(res.body).toEqual({
      statusCode: 400,
      message: ['property extra should not exist'],
      error: 'Bad Request',
    });
  });

  it('campo inválido retorna 400 no formato padrão', async () => {
    const res = await http().post('/test/echo').send({ nome: 1 }).expect(400);

    expect(res.body).toEqual({
      statusCode: 400,
      message: ['nome must be a string'],
      error: 'Bad Request',
    });
  });

  it('rota inexistente retorna 404 no formato padrão', async () => {
    const res = await http().get('/nao-existe').expect(404);

    expect(res.body).toEqual({
      statusCode: 404,
      message: 'Cannot GET /nao-existe',
      error: 'Not Found',
    });
  });

  it('erro inesperado retorna 500 sem expor detalhes', async () => {
    const res = await http().get('/test/boom').expect(500);

    expect(res.body).toEqual({
      statusCode: 500,
      message: 'Internal Server Error',
      error: 'Internal Server Error',
    });
  });

  it('JSON malformado retorna 400 no formato padrão', async () => {
    const res = await http()
      .post('/test/echo')
      .set('Content-Type', 'application/json')
      .send('{"nome":')
      .expect(400);

    expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
  });

  it('Swagger disponível em /docs', async () => {
    await http().get('/docs').expect(200);
  });

  it('CORS libera a origem configurada', async () => {
    await http()
      .get('/health')
      .set('Origin', 'http://localhost:5173')
      .expect('Access-Control-Allow-Origin', 'http://localhost:5173');
  });
});
