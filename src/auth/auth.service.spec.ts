import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
  const jwt = new JwtService({ secret: 'test-secret' });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(prisma as unknown as PrismaService, jwt);
  });

  describe('login', () => {
    const senha = 'senha-correta';
    let usuario: Record<string, unknown>;

    beforeAll(async () => {
      usuario = {
        id: 7,
        nome: 'Ana',
        email: 'ana@example.com',
        role: 'USER',
        senhaHash: await bcrypt.hash(senha, 4),
      };
    });

    it('retorna accessToken e dados públicos do usuário', async () => {
      prisma.user.findUnique.mockResolvedValue(usuario);

      const result = await service.login({ email: 'ana@example.com', senha });

      expect(result.user).toEqual({
        id: 7,
        nome: 'Ana',
        email: 'ana@example.com',
        role: 'USER',
      });
      expect(jwt.verify(result.accessToken)).toMatchObject({
        sub: 7,
        role: 'USER',
      });
    });

    it.each([
      ['senha errada', () => usuario, 'outra-senha'],
      ['e-mail inexistente', () => null, senha],
      ['conta só com Google', () => ({ ...usuario, senhaHash: null }), senha],
    ])('rejeita com 401 genérico: %s', async (_caso, encontrado, tentativa) => {
      prisma.user.findUnique.mockResolvedValue(encontrado());

      const login = service.login({
        email: 'ana@example.com',
        senha: tentativa,
      });

      await expect(login).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(login).rejects.toThrow('Credenciais inválidas');
    });
  });

  describe('register', () => {
    it('usa o nome enviado, armazena o hash da senha e retorna accessToken + user', async () => {
      const senha = 'senha-segura-123';

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }) => ({
        id: 1,
        nome: data.nome,
        email: data.email,
        role: 'USER',
      }));

      const result = await service.register({
        nome: 'Ana',
        email: 'ana@example.com',
        senha,
      });

      const dadosCriacao = prisma.user.create.mock.calls[0][0];

      expect(dadosCriacao.data.nome).toBe('Ana');
      expect(dadosCriacao.data.senhaHash).not.toBe(senha);
      expect(await bcrypt.compare(senha, dadosCriacao.data.senhaHash!)).toBe(
        true,
      );
      expect(result.user).toEqual({
        id: 1,
        nome: 'Ana',
        email: 'ana@example.com',
        role: 'USER',
      });
      expect(jwt.verify(result.accessToken)).toMatchObject({
        sub: 1,
        role: 'USER',
      });
      expect(result).not.toHaveProperty('senha');
      expect(result.user).not.toHaveProperty('senhaHash');
      expect(result.user).not.toHaveProperty('senha_hash');
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
          nome: 'Ana',
          email: 'ana@example.com',
          senha: 'senha-segura-123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
});
