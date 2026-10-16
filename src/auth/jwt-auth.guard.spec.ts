import {
  Controller,
  type ExecutionContext,
  Get,
  type INestApplication,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module.js';
import {
  CurrentUser,
  JwtAuthGuard,
  type JwtPayload,
} from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const guard = new JwtAuthGuard(jwt);

  const contextWith = (authorization?: string) => {
    const request: { headers: { authorization?: string }; user?: unknown } = {
      headers: { authorization },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { request, context };
  };

  it.each(['Bearer', 'bearer'])(
    'aceita token válido (%s) e expõe o payload em request.user',
    async (scheme) => {
      const token = jwt.sign({ sub: 7, role: 'USER' });
      const { request, context } = contextWith(`${scheme} ${token}`);

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user).toMatchObject({ sub: 7, role: 'USER' });
    },
  );

  it.each([
    ['sem cabeçalho', undefined],
    ['esquema diferente de Bearer', 'Basic abc'],
    ['Bearer sem token', 'Bearer '],
    ['token malformado', 'Bearer nao-e-jwt'],
    [
      'assinado com outro segredo',
      `Bearer ${new JwtService({ secret: 'outro' }).sign({ sub: 7 })}`,
    ],
    ['expirado', `Bearer ${jwt.sign({ sub: 7 }, { expiresIn: -10 })}`],
  ])('rejeita com 401: %s', async (_caso, authorization) => {
    const { request, context } = contextWith(authorization);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
  });
});

// Controller fora do AuthModule, como os de outros módulos (ex.: projects).
@Controller('protegido')
class ProtegidoController {
  @Get()
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: JwtPayload) {
    return { sub: user.sub };
  }
}

describe('JwtAuthGuard reutilizado fora do AuthModule', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProtegidoController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(() => app.close());

  it('libera com token válido e injeta o usuário via @CurrentUser', async () => {
    const token = app.get(JwtService).sign({ sub: 7, role: 'USER' });

    await request(app.getHttpServer())
      .get('/protegido')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, { sub: 7 });
  });

  it('bloqueia sem token', async () => {
    await request(app.getHttpServer()).get('/protegido').expect(401);
  });
});
