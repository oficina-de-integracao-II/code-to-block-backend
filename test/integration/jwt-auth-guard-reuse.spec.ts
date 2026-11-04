import {
  Controller,
  Get,
  type INestApplication,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  CurrentUser,
  JwtAuthGuard,
  type JwtPayload,
} from '../../src/auth/jwt-auth.guard.js';
import { cleanDatabase, getTestDatabase, teardownTestDatabase } from './setup.js';

@Controller('protegido')
class ProtegidoController {
  @Get()
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: JwtPayload) {
    return { sub: user.sub };
  }
}

describe('JwtAuthGuard reutilizado fora do AuthModule (integração)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const db = await getTestDatabase();
    process.env.DATABASE_URL = db.url;

    const { AppModule } = await import('../../src/app.module.js');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProtegidoController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
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

  it('libera com token válido e injeta o usuário via @CurrentUser', async () => {
    const token = app
      .get(JwtService)
      .sign({ sub: 7, role: 'USER' }, { jwtid: 'jti-integration' });

    await request(app.getHttpServer())
      .get('/protegido')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, { sub: 7 });
  });

  it('bloqueia sem token', async () => {
    await request(app.getHttpServer()).get('/protegido').expect(401);
  });
});
