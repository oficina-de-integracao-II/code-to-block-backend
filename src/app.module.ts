import { Module } from '@nestjs/common';
import { ConfigModule } from './common/config.module.js';
import { HealthController } from './health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { FunctionsModule } from './functions/functions.module.js';
@Module({
  imports: [ConfigModule, AuthModule, FunctionsModule],
  controllers: [HealthController],
})
export class AppModule {}
