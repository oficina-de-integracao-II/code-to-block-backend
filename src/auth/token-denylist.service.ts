import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TokenDenylistService {
  constructor(private readonly prisma: PrismaService) {}

  async revoke(jti: string, expiraEm: Date) {
    await this.prisma.revokedToken.upsert({
      where: { jti },
      update: { expiraEm },
      create: { jti, expiraEm },
    });
  }

  async isRevoked(jti: string) {
    const revoked = await this.prisma.revokedToken.findUnique({
      where: { jti },
    });

    return revoked !== null;
  }

  purgeExpired() {
    void this.prisma.revokedToken
      .deleteMany({ where: { expiraEm: { lt: new Date() } } })
      .catch(() => {});
  }
}
