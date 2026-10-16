import {
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { Env } from '../common/env.schema.js';

export type GoogleProfile = { googleId: string; email: string; nome: string };
export type GoogleVerifier = (idToken: string) => Promise<GoogleProfile>;

// Token de injeção: nos testes, troca-se o verificador por um stub.
export const GOOGLE_VERIFIER = Symbol('GOOGLE_VERIFIER');

export const googleVerifierProvider = {
  provide: GOOGLE_VERIFIER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): GoogleVerifier => {
    const client = new OAuth2Client();
    const audience = config.get('GOOGLE_CLIENT_ID', { infer: true });
    const logger = new Logger('GoogleVerifier');

    return async (idToken) => {
      // Sem audience a lib aceita token emitido para qualquer app.
      if (!audience) {
        throw new InternalServerErrorException(
          'Login com Google não configurado',
        );
      }

      // Valida assinatura, emissor, expiração e audiência.
      const payload = await client
        .verifyIdToken({ idToken, audience })
        .then((ticket) => ticket.getPayload())
        .catch((error: unknown) => {
          // Cliente recebe 401; o log separa token ruim de falha de rede.
          logger.warn(`ID token recusado: ${String(error)}`);
          return undefined;
        });

      // E-mail não verificado não pode vincular conta existente pelo e-mail.
      if (!payload?.sub || !payload.email || !payload.email_verified) {
        throw new UnauthorizedException('Token do Google inválido');
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        nome: payload.name ?? payload.email.split('@')[0],
      };
    };
  },
};
