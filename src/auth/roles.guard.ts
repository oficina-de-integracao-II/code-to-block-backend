import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '../generated/prisma/client.js';
import type { JwtPayload } from './jwt-auth.guard.js';

const ROLES_KEY = 'roles';

// Perfis que podem acessar a rota. Ex.: @Roles('ADMIN')
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// Uso: @UseGuards(JwtAuthGuard, RolesGuard) + @Roles(...). O JwtAuthGuard
// precisa vir antes, pois é ele que preenche request.user com o perfil.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Rota sem @Roles: basta estar autenticado.
    if (!roles?.length) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();

    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('Acesso não permitido para este perfil');
    }

    return true;
  }
}
