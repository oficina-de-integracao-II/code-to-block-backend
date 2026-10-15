import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(prisma as unknown as PrismaService);
  });

  describe('register', () => {
    it('armazena o hash da senha, não a senha original', async () => {
      const senha = 'senha-segura-123';

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }) => ({
        id: 1,
        nome: data.nome,
        email: data.email,
        role: 'USER',
        criadoEm: new Date(),
      }));

      const result = await service.register({
        email: 'ana@example.com',
        senha,
      });

      const dadosCriacao = prisma.user.create.mock.calls[0][0];

      expect(dadosCriacao.data.senhaHash).not.toBe(senha);
      expect(
        await bcrypt.compare(senha, dadosCriacao.data.senhaHash!),
      ).toBe(true);
      expect(result).not.toHaveProperty('senha');
      expect(result).not.toHaveProperty('senhaHash');
      expect(result).not.toHaveProperty('senha_hash');
    });

    it('rejeita o cadastro quando o e-mail já existe', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        nome: 'Ana',
        email: 'ana@example.com',
        senhaHash: 'hash-existente',
      });

      await expect(
        service.register({
          email: 'ana@example.com',
          senha: 'senha-segura-123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
});