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

  describe('me', () => {
    it('retorna os dados públicos do usuário do token', async () => {
      const publico = { id: 7, nome: 'Ana', email: 'ana@x.com', role: 'USER' };
      prisma.user.findUnique.mockResolvedValue(publico);

      await expect(service.me(7)).resolves.toEqual(publico);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 7 },
        select: { id: true, nome: true, email: true, role: true },
      });
    });

    it('rejeita com 401 quando a conta não existe mais', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me(7)).rejects.toBeInstanceOf(UnauthorizedException);
    });
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
      expect(await bcrypt.compare(senha, dadosCriacao.data.senhaHash!)).toBe(
        true,
      );
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
