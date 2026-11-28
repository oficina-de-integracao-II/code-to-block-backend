import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './jwt-auth.guard.js';

const ROLES_KEY = 'roles';

// Perfis que podem acessar a rota. Ex.: @Roles('ADMIN')
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// Uso: @UseGuards(JwtAuthGuard, RolesGuard) + @Roles(...). O JwtAuthGuard
// precisa vir antes, pois é ele que preenche request.user. O perfil é lido do
// banco a cada requisição: quem for rebaixado ou removido perde o acesso na
// hora, sem esperar o token expirar.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
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

    // Sem usuário: a rota não passou pelo JwtAuthGuard antes.
    if (!user) {
      throw new UnauthorizedException('Token ausente');
    }

    const current = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true },
    });

    // Token ainda válido, mas a conta foi removida.
    if (!current) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    if (!roles.includes(current.role)) {
      throw new ForbiddenException('Acesso não permitido para este perfil');
    }

    return true;
  }
}
