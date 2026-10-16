import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    register: vi.fn(),
    login: vi.fn(),
    me: vi.fn(),
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

  describe('me', () => {
    it('busca o usuário pelo sub do token', async () => {
      const usuario = { id: 7, nome: 'Ana', email: 'ana@x.com', role: 'USER' };
      authService.me.mockResolvedValue(usuario);

      await expect(controller.me({ sub: 7, role: 'USER' })).resolves.toEqual(
        usuario,
      );
      expect(authService.me).toHaveBeenCalledWith(7);
    });
  });

  describe('register', () => {
    it('encaminha os dados do cadastro ao AuthService', async () => {
      const dto = {
        email: 'ana@example.com',
        senha: 'senha-segura-123',
      };

      const resposta = {
        id: 1,
        nome: 'ana',
        email: 'ana@example.com',
        role: 'USER',
        criadoEm: new Date(),
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
          email: 'ana@example.com',
          senha: 'senha-segura-123',
        }),
      ).rejects.toThrow('Falha no cadastro');
    });
  });
});
