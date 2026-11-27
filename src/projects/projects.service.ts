import { Injectable } from '@nestjs/common';
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
  create(dto: ProjectWriteDto, usuarioId: number) {
    return this.prisma.project.create({
      data: {
        nome: dto.nome,
        codigoFonte: dto.codigoFonte,
        estadoBlocos: dto.estadoBlocos,
        usuarioId,
      },
      select: projectSelect,
    });
  }
}
