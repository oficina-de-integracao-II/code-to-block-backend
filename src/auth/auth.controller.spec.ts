import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    register: vi.fn(),
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController(authService as unknown as AuthService);
  });

  describe('login', () => {
    it('encaminha as credenciais ao AuthService', async () => {
      const dto = { email: 'ana@example.com', senha: 'senha-segura-123' };
      const resposta = { accessToken: 'token', user: { id: 1 } };
      authService.login.mockResolvedValue(resposta);

      await expect(controller.login(dto)).resolves.toEqual(resposta);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('loginWithGoogle', () => {
    it('encaminha o idToken ao AuthService', async () => {
      const resposta = { accessToken: 'token', user: { id: 1 } };
      authService.loginWithGoogle.mockResolvedValue(resposta);

      await expect(
        controller.loginWithGoogle({ idToken: 'id-token' }),
      ).resolves.toEqual(resposta);
      expect(authService.loginWithGoogle).toHaveBeenCalledWith('id-token');
    });
  });

  describe('me', () => {
    it('busca o usuário pelo sub do token', async () => {
      const usuario = { id: 7, nome: 'Ana', email: 'ana@x.com', role: 'USER' };
      authService.me.mockResolvedValue(usuario);

      const payload = { sub: 7, role: 'USER', jti: 'jti-1', exp: 123 } as const;

      await expect(controller.me(payload)).resolves.toEqual(usuario);
      expect(authService.me).toHaveBeenCalledWith(7);
    });
  });

  describe('logout', () => {
    it('revoga o jti e a expiração do token atual', async () => {
      authService.logout.mockResolvedValue(undefined);

      const payload = {
        sub: 7,
        role: 'USER',
        jti: 'jti-atual',
        exp: 1_700_000_000,
      } as const;

      await controller.logout(payload);

      expect(authService.logout).toHaveBeenCalledWith('jti-atual', 1_700_000_000);
    });
  });

  describe('register', () => {
    it('encaminha os dados do cadastro ao AuthService', async () => {
      const dto = {
        nome: 'Ana',
        email: 'ana@example.com',
        senha: 'senha-segura-123',
      };

      const resposta = {
        accessToken: 'token',
        user: { id: 1, nome: 'Ana', email: 'ana@example.com', role: 'USER' },
      };

      authService.register.mockResolvedValue(resposta);

      await expect(controller.register(dto)).resolves.toEqual(resposta);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it('propaga erros lançados pelo AuthService', async () => {
      authService.register.mockRejectedValue(new Error('Falha no cadastro'));

      await expect(
        controller.register({
          nome: 'Ana',
          email: 'ana@example.com',
          senha: 'senha-segura-123',
        }),
      ).rejects.toThrow('Falha no cadastro');
    });
  });
});
