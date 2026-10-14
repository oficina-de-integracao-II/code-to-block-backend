import { Module } from '@nestjs/common';
import { ConfigModule } from './common/config.module.js';

@Module({
  imports: [ConfigModule],
})
export class AppModule {}
