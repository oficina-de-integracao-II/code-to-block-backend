import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ProjectWriteDto } from './dto/project-write.dto.js';

// Campos do contrato `Project`; usuarioId fica de fora da resposta.
const projectSelect = {
  id: true,
  nome: true,
  codigoFonte: true,
  estadoBlocos: true,
  criadoEm: true,
  atualizadoEm: true,
} as const;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // O dono vem sempre do token; um usuarioId no corpo é ignorado.
  async create(dto: ProjectWriteDto, usuarioId: number) {
    try {
      return await this.prisma.project.create({
        data: {
          nome: dto.nome,
          codigoFonte: dto.codigoFonte,
          estadoBlocos: dto.estadoBlocos,
          usuarioId,
        },
        select: projectSelect,
      });
    } catch (error) {
      // P2003: o usuário do token não existe mais (conta removida).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }
      throw error;
    }
  }
}
