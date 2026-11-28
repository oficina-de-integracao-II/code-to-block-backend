import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JwtPayload } from '../auth/jwt-auth.guard.js';
import { PROJECT_LIMITS, ProjectWriteDto } from './dto/project-write.dto.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

const dtoValido = {
  nome: 'Meu robô',
  codigoFonte: 'Andar();',
  estadoBlocos: { blocks: { languageVersion: 0, blocks: [] } },
};

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const projectsService = {
    create: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ProjectsController(
      projectsService as unknown as ProjectsService,
    );
  });

  it('create encaminha o payload e o id do usuário autenticado', async () => {
    const user = { sub: 7, role: 'USER' } as JwtPayload;
    projectsService.create.mockResolvedValue({ id: 1, ...dtoValido });

    await expect(controller.create(dtoValido, user)).resolves.toEqual({
      id: 1,
      ...dtoValido,
    });
    expect(projectsService.create).toHaveBeenCalledWith(dtoValido, 7);
  });
});

describe('ProjectWriteDto', () => {
  const errosDe = async (payload: object) => {
    const erros = await validate(plainToInstance(ProjectWriteDto, payload));
    return erros.map((erro) => erro.property);
  };

  it('aceita payload válido, inclusive com código vazio', async () => {
    await expect(errosDe(dtoValido)).resolves.toEqual([]);
    await expect(errosDe({ ...dtoValido, codigoFonte: '' })).resolves.toEqual(
      [],
    );
  });

  it('aceita usuarioId no corpo (ignorado pelo service)', async () => {
    await expect(errosDe({ ...dtoValido, usuarioId: 99 })).resolves.toEqual([]);
  });

  it.each(['nome', 'codigoFonte', 'estadoBlocos'])(
    'rejeita payload sem %s',
    async (campo) => {
      const payload: Record<string, unknown> = { ...dtoValido };
      delete payload[campo];

      await expect(errosDe(payload)).resolves.toEqual([campo]);
    },
  );

  it.each([
    ['nome vazio', { nome: '' }, 'nome'],
    ['nome só com espaços', { nome: '   ' }, 'nome'],
    ['estadoBlocos como lista', { estadoBlocos: [] }, 'estadoBlocos'],
    ['estadoBlocos como texto', { estadoBlocos: '{}' }, 'estadoBlocos'],
  ])('rejeita %s', async (_caso, campos, campo) => {
    await expect(errosDe({ ...dtoValido, ...campos })).resolves.toEqual([
      campo,
    ]);
  });

  it.each([
    ['nome', { nome: 'a'.repeat(PROJECT_LIMITS.nome + 1) }],
    [
      'codigoFonte',
      { codigoFonte: 'a'.repeat(PROJECT_LIMITS.codigoFonte + 1) },
    ],
    [
      'estadoBlocos',
      { estadoBlocos: { texto: 'a'.repeat(PROJECT_LIMITS.estadoBlocos) } },
    ],
  ])('rejeita %s acima do limite', async (campo, campos) => {
    await expect(errosDe({ ...dtoValido, ...campos })).resolves.toEqual([
      campo,
    ]);
  });

  it.each([
    ['nome', { nome: 'Meu\u0000robô' }],
    ['codigoFonte', { codigoFonte: 'Andar();\u0000' }],
    ['estadoBlocos', { estadoBlocos: { blocks: { id: 'b\u0000' } } }],
  ])('rejeita caractere nulo em %s', async (campo, campos) => {
    await expect(errosDe({ ...dtoValido, ...campos })).resolves.toEqual([
      campo,
    ]);
  });

  it('aceita campos exatamente no limite', async () => {
    await expect(
      errosDe({
        ...dtoValido,
        nome: 'a'.repeat(PROJECT_LIMITS.nome),
        codigoFonte: 'a'.repeat(PROJECT_LIMITS.codigoFonte),
      }),
    ).resolves.toEqual([]);
  });
});
