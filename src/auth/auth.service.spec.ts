import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { TokenDenylistService } from './token-denylist.service.js';

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  };
  const jwt = new JwtService({ secret: 'test-secret' });
  const denylist = { revoke: vi.fn() };
  const verifyGoogle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt,
      denylist as unknown as TokenDenylistService,
      verifyGoogle,
    );
  });

  describe('loginWithGoogle', () => {
    const perfil = { googleId: 'g-1', email: 'ana@gmail.com', nome: 'Ana' };
    const usuario = {
      id: 7,
      nome: 'Ana',
      email: 'ana@gmail.com',
      role: 'USER',
    };

    beforeEach(() => {
      verifyGoogle.mockResolvedValue(perfil);
    });

    it('cria usuário novo com google_id', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.upsert.mockResolvedValue({ ...usuario, googleId: 'g-1' });

      const result = await service.loginWithGoogle('id-token');

      expect(verifyGoogle).toHaveBeenCalledWith('id-token');
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { email: 'ana@gmail.com' },
        update: { googleId: 'g-1', senhaHash: null },
        create: { email: 'ana@gmail.com', nome: 'Ana', googleId: 'g-1' },
      });
      expect(result.user).toEqual(usuario);
      expect(jwt.verify(result.accessToken)).toMatchObject({ sub: 7 });
    });

    it('vincula o google_id a usuário existente e descarta a senha não confirmada', async () => {
      const local = { ...usuario, senhaHash: 'hash', googleId: null };
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.upsert.mockResolvedValue({ ...local, googleId: 'g-1' });

      const result = await service.loginWithGoogle('id-token');

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { googleId: 'g-1', senhaHash: null },
        }),
      );
      expect(result.user).toEqual(usuario);
    });

    it('usa a conta já vinculada pelo google_id mesmo se o e-mail mudou', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...usuario,
        email: 'antigo@gmail.com',
        googleId: 'g-1',
      });

      const result = await service.loginWithGoogle('id-token');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: 'g-1' },
      });
      expect(prisma.user.upsert).not.toHaveBeenCalled();
      expect(result.user.id).toBe(7);
    });

    it('rejeita token inválido sem tocar no banco', async () => {
      verifyGoogle.mockRejectedValue(new UnauthorizedException());

      await expect(service.loginWithGoogle('ruim')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });
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

  describe('logout', () => {
    it('revoga o jti do token com a data de expiração convertida de segundos para Date', async () => {
      const exp = 1_700_000_000;

      await service.logout('jti-123', exp);

      expect(denylist.revoke).toHaveBeenCalledWith(
        'jti-123',
        new Date(exp * 1000),
      );
    });
  });
});
