import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FunctionWriteDto } from './dto/function-write.dto.js';

const summarySelect = {
  id: true,
  nome: true,
  descricao: true,
  codigoArduino: true,
  blocoDefinicao: true,
} as const;

const detailSelect = { ...summarySelect, parametros: true } as const;

function toData(dto: FunctionWriteDto) {
  return {
    nome: dto.nome,
    descricao: dto.descricao,
    codigoArduino: dto.codigoArduino,
    blocoDefinicao: dto.blocoDefinicao,
    // Campo Json opcional não aceita `null` direto no Prisma: usa DbNull.
    parametros: dto.parametros ?? Prisma.DbNull,
  };
}

// Traduz os erros do banco que fazem parte do contrato da API.
function toHttpError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ConflictException('Já existe uma função com esse nome');
    }
    if (error.code === 'P2025') {
      return new NotFoundException('Função não encontrada');
    }
  }

  return error;
}

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

  async create(dto: FunctionWriteDto, criadoPorId: number) {
    try {
      return await this.prisma.functionCatalog.create({
        data: { ...toData(dto), criadoPorId },
        select: detailSelect,
      });
    } catch (error) {
      throw toHttpError(error);
    }
  }

  async update(id: number, dto: FunctionWriteDto) {
    try {
      return await this.prisma.functionCatalog.update({
        where: { id },
        data: toData(dto),
        select: detailSelect,
      });
    } catch (error) {
      throw toHttpError(error);
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.functionCatalog.delete({ where: { id } });
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
