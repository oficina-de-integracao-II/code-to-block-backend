import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { TokenDenylistService } from './token-denylist.service.js';

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const denylist = {
    isRevoked: vi.fn().mockResolvedValue(false),
    purgeExpired: vi.fn(),
  };
  const guard = new JwtAuthGuard(
    jwt,
    denylist as unknown as TokenDenylistService,
  );

  beforeEach(() => {
    denylist.isRevoked.mockClear();
    denylist.purgeExpired.mockClear();
  });

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
      denylist.isRevoked.mockResolvedValueOnce(false);
      const token = jwt.sign({ sub: 7, role: 'USER' }, { jwtid: 'jti-1' });
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

  it('recusa um jti revogado com 401', async () => {
    denylist.isRevoked.mockResolvedValueOnce(true);
    const token = jwt.sign({ sub: 7, role: 'USER' }, { jwtid: 'jti-revogado' });
    const { request, context } = contextWith(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(denylist.isRevoked).toHaveBeenCalledWith('jti-revogado');
    expect(request.user).toBeUndefined();
  });

  it('aciona a limpeza oportunista de registros expirados a cada verificação', async () => {
    denylist.isRevoked.mockResolvedValueOnce(false);
    const token = jwt.sign({ sub: 7, role: 'USER' }, { jwtid: 'jti-2' });
    const { context } = contextWith(`Bearer ${token}`);

    await guard.canActivate(context);

    expect(denylist.purgeExpired).toHaveBeenCalled();
  });

  it('aceita token sem jti (emitido antes da denylist existir) sem consultar a denylist', async () => {
    const token = jwt.sign({ sub: 7, role: 'USER' });
    const { request, context } = contextWith(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(denylist.isRevoked).not.toHaveBeenCalled();
    expect(request.user).toMatchObject({ sub: 7, role: 'USER' });
  });
});
