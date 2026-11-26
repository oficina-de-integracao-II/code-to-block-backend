import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { Roles, RolesGuard } from './roles.guard.js';

// Handlers de exemplo: o Nest lê os metadados direto da função da rota.
class RotasDeExemplo {}
const somenteAdmin = () => {};
const livre = () => {};
Roles('ADMIN')(somenteAdmin);

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  const contextFor = (
    handler: () => void,
    user?: { sub: number; role: string },
  ) =>
    ({
      getHandler: () => handler,
      getClass: () => RotasDeExemplo,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  it('permite ADMIN em rota com @Roles("ADMIN")', () => {
    const context = contextFor(somenteAdmin, {
      sub: 1,
      role: 'ADMIN',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('recusa usuário comum com 403 em rota com @Roles("ADMIN")', () => {
    const context = contextFor(somenteAdmin, {
      sub: 2,
      role: 'USER',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('recusa com 403 quando não há usuário na requisição', () => {
    const context = contextFor(somenteAdmin);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('libera qualquer perfil em rota sem @Roles', () => {
    const context = contextFor(livre, {
      sub: 2,
      role: 'USER',
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
