import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const summarySelect = {
  id: true,
  nome: true,
  descricao: true,
  codigoArduino: true,
  blocoDefinicao: true,
} as const;

const detailSelect = { ...summarySelect, parametros: true } as const;

@Injectable()
export class FunctionsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.functionCatalog.findMany({
      select: summarySelect,
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number) {
    const fn = await this.prisma.functionCatalog.findUnique({
      where: { id },
      select: detailSelect,
    });

    if (!fn) {
      throw new NotFoundException('Função não encontrada');
    }

    return fn;
  }
}
