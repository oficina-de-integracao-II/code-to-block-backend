import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FunctionsController } from './functions.controller.js';
import { FunctionsService } from './functions.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [FunctionsController],
  providers: [FunctionsService],
})
export class FunctionsModule {}
