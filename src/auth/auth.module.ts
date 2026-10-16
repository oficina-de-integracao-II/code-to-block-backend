import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import type { Env } from '../common/env.schema.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { googleVerifierProvider } from './google-verifier.js';
import { TokenDenylistService } from './token-denylist.service.js';

@Global()
@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      // Global para o JwtAuthGuard funcionar em qualquer módulo (ex.: projects).
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', {
            infer: true,
          }) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, googleVerifierProvider, TokenDenylistService],
  exports: [TokenDenylistService],
})
export class AuthModule {}
