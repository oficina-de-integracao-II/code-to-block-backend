import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { Roles, RolesGuard } from './roles.guard.js';

// Handlers de exemplo: o Nest lê os metadados direto da função da rota.
class RotasDeExemplo {}
const somenteAdmin = () => {};
const livre = () => {};
Roles('ADMIN')(somenteAdmin);

describe('RolesGuard', () => {
  const prisma = { user: { findUnique: vi.fn() } };
  const guard = new RolesGuard(
    new Reflector(),
    prisma as unknown as PrismaService,
  );

  // O perfil do token é sempre ADMIN: quem decide é o perfil salvo no banco.
  const contextFor = (handler: () => void, user?: { sub: number }) =>
    ({
      getHandler: () => handler,
      getClass: () => RotasDeExemplo,
      switchToHttp: () => ({
        getRequest: () => ({ user: user && { ...user, role: 'ADMIN' } }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => vi.clearAllMocks());

  it('permite quem é ADMIN no banco em rota com @Roles("ADMIN")', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });

    await expect(
      guard.canActivate(contextFor(somenteAdmin, { sub: 1 })),
    ).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { role: true },
    });
  });

  it('recusa com 403 quem foi rebaixado, mesmo com token de ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'USER' });

    await expect(
      guard.canActivate(contextFor(somenteAdmin, { sub: 2 })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('recusa com 401 quando a conta do token foi removida', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor(somenteAdmin, { sub: 3 })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('recusa com 401 quando não há usuário na requisição', async () => {
    await expect(guard.canActivate(contextFor(somenteAdmin))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('libera rota sem @Roles sem consultar o banco', async () => {
    await expect(
      guard.canActivate(contextFor(livre, { sub: 2 })),
    ).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
