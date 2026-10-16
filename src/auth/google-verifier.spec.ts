import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../common/env.schema.js';
import { googleVerifierProvider } from './google-verifier.js';

describe('googleVerifierProvider', () => {
  const verifierWith = (clientId?: string) =>
    googleVerifierProvider.useFactory({
      get: () => clientId,
    } as unknown as ConfigService<Env, true>);

  // Nenhuma chamada real ao Google: a verificação da lib é substituída.
  const googleReturns = (payload: TokenPayload) =>
    vi
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockResolvedValue({ getPayload: () => payload } as never);

  const payloadValido = {
    sub: 'google-123',
    email: 'ana@gmail.com',
    email_verified: true,
    name: 'Ana Souza',
  } as TokenPayload;

  afterEach(() => vi.restoreAllMocks());

  it('valida com a audiência configurada e retorna o perfil', async () => {
    const verify = googleReturns(payloadValido);

    await expect(verifierWith('client-id')('id-token')).resolves.toEqual({
      googleId: 'google-123',
      email: 'ana@gmail.com',
      nome: 'Ana Souza',
    });
    expect(verify).toHaveBeenCalledWith({
      idToken: 'id-token',
      audience: 'client-id',
    });
  });

  it('usa o início do e-mail como nome quando o Google não envia', async () => {
    googleReturns({ ...payloadValido, name: undefined });

    const perfil = await verifierWith('client-id')('id-token');

    expect(perfil.nome).toBe('ana');
  });

  it('rejeita com 401 token inválido, expirado ou de outra audiência', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(
      new Error('Wrong recipient, payload audience != requiredAudience'),
    );

    await expect(verifierWith('client-id')('id-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejeita com 401 e-mail não verificado pelo Google', async () => {
    googleReturns({ ...payloadValido, email_verified: false });

    await expect(verifierWith('client-id')('id-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('falha sem GOOGLE_CLIENT_ID em vez de aceitar qualquer audiência', async () => {
    const verify = googleReturns(payloadValido);

    await expect(verifierWith(undefined)('id-token')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(verify).not.toHaveBeenCalled();
  });
});
