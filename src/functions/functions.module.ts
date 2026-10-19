import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FunctionsController } from './functions.controller.js';
import { FunctionsRepository } from './functions.repository.js';
import { FunctionsService } from './functions.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [FunctionsController],
  providers: [FunctionsRepository, FunctionsService],
})
export class FunctionsModule {}
