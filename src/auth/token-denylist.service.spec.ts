import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { TokenDenylistService } from './token-denylist.service.js';

describe('TokenDenylistService', () => {
  let service: TokenDenylistService;

  const prisma = {
    revokedToken: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TokenDenylistService(prisma as unknown as PrismaService);
  });

  describe('revoke', () => {
    it('grava o jti e a expiração via upsert', async () => {
      const expiraEm = new Date('2026-01-01T00:00:00.000Z');

      await service.revoke('jti-1', expiraEm);

      expect(prisma.revokedToken.upsert).toHaveBeenCalledWith({
        where: { jti: 'jti-1' },
        update: { expiraEm },
        create: { jti: 'jti-1', expiraEm },
      });
    });
  });

  describe('isRevoked', () => {
    it('retorna true quando o jti está na denylist', async () => {
      prisma.revokedToken.findUnique.mockResolvedValue({
        jti: 'jti-1',
        expiraEm: new Date(),
      });

      await expect(service.isRevoked('jti-1')).resolves.toBe(true);
    });

    it('retorna false quando o jti não está na denylist', async () => {
      prisma.revokedToken.findUnique.mockResolvedValue(null);

      await expect(service.isRevoked('jti-ausente')).resolves.toBe(false);
    });
  });

  describe('purgeExpired', () => {
    it('apaga os registros com expiração no passado', () => {
      prisma.revokedToken.deleteMany.mockResolvedValue({ count: 0 });

      service.purgeExpired();

      expect(prisma.revokedToken.deleteMany).toHaveBeenCalledWith({
        where: { expiraEm: { lt: expect.any(Date) } },
      });
    });

    it('não propaga erro da limpeza (fire-and-forget)', async () => {
      prisma.revokedToken.deleteMany.mockRejectedValue(new Error('falhou'));

      expect(() => service.purgeExpired()).not.toThrow();
    });
  });
});
