import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from './projects.service.js';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const prisma = {
    project: {
      create: vi.fn(),
    },
  };

  const dto = {
    nome: 'Meu robô',
    codigoFonte: 'Andar();\nVireEsquerda();',
    estadoBlocos: { blocks: { languageVersion: 0, blocks: [] } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProjectsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('cria o projeto com o usuário autenticado como dono', async () => {
      const criado = { id: 1, ...dto };
      prisma.project.create.mockResolvedValue(criado);

      await expect(service.create(dto, 7)).resolves.toEqual(criado);

      const args = prisma.project.create.mock.calls[0][0];
      expect(args.data).toEqual({ ...dto, usuarioId: 7 });
    });

    it('ignora usuarioId enviado no corpo e usa o dono do token', async () => {
      prisma.project.create.mockResolvedValue({ id: 1 });

      await service.create({ ...dto, usuarioId: 99 }, 7);

      const args = prisma.project.create.mock.calls[0][0];
      expect(args.data.usuarioId).toBe(7);
    });

    it('não devolve o dono do projeto na resposta', async () => {
      prisma.project.create.mockResolvedValue({ id: 1 });

      await service.create(dto, 7);

      const args = prisma.project.create.mock.calls[0][0];
      expect(args.select).toEqual({
        id: true,
        nome: true,
        codigoFonte: true,
        estadoBlocos: true,
        criadoEm: true,
        atualizadoEm: true,
      });
    });
  });
});
