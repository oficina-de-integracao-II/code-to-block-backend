import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Role } from '../generated/prisma/client.js';
import { TokenDenylistService } from './token-denylist.service.js';

export type JwtPayload = { sub: number; role: Role; jti: string; exp: number };

type AuthenticatedRequest = Request & { user?: JwtPayload };

// Uso: @UseGuards(JwtAuthGuard) na rota; o payload fica em request.user.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly denylist: TokenDenylistService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Token ausente');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    this.denylist.purgeExpired();

    if (payload.jti && (await this.denylist.isRevoked(payload.jti))) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    request.user = payload;

    return true;
  }
}

// Injeta o payload do token validado pelo JwtAuthGuard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
