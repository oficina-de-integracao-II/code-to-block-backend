import { Module } from '@nestjs/common';
import { ConfigModule } from './common/config.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
})
export class AppModule {}
