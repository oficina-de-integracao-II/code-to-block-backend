import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JwtPayload } from '../auth/jwt-auth.guard.js';
import { FunctionWriteDto } from './dto/function-write.dto.js';
import { FunctionsController } from './functions.controller.js';
import { FunctionsService } from './functions.service.js';

const dtoValido = {
  nome: 'piscar_led',
  descricao: 'Pisca o LED embutido',
  codigoArduino: 'digitalWrite(LED_BUILTIN, HIGH);',
  blocoDefinicao: { type: 'piscar_led', message0: 'piscar LED' },
};

describe('FunctionsController', () => {
  let controller: FunctionsController;

  const functionsService = {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new FunctionsController(
      functionsService as unknown as FunctionsService,
    );
  });

  it('list encaminha ao FunctionsService', async () => {
    functionsService.list.mockResolvedValue([]);

    await expect(controller.list()).resolves.toEqual([]);
    expect(functionsService.list).toHaveBeenCalledTimes(1);
  });

  it('findById encaminha o id ao FunctionsService', async () => {
    const fn = { id: 7, nome: 'piscar_led' };
    functionsService.findById.mockResolvedValue(fn);

    await expect(controller.findById(7)).resolves.toEqual(fn);
    expect(functionsService.findById).toHaveBeenCalledWith(7);
  });

  it('create encaminha o payload e o id do admin autenticado', async () => {
    const admin = { sub: 3, role: 'ADMIN' } as JwtPayload;
    functionsService.create.mockResolvedValue({ id: 1, ...dtoValido });

    await expect(controller.create(dtoValido, admin)).resolves.toEqual({
      id: 1,
      ...dtoValido,
    });
    expect(functionsService.create).toHaveBeenCalledWith(dtoValido, 3);
  });

  it('update encaminha o id e o payload', async () => {
    functionsService.update.mockResolvedValue({ id: 1, ...dtoValido });

    await controller.update(1, dtoValido);

    expect(functionsService.update).toHaveBeenCalledWith(1, dtoValido);
  });

  it('remove encaminha o id', async () => {
    functionsService.remove.mockResolvedValue(undefined);

    await expect(controller.remove(1)).resolves.toBeUndefined();
    expect(functionsService.remove).toHaveBeenCalledWith(1);
  });
});

describe('FunctionWriteDto', () => {
  const errosDe = async (payload: object) => {
    const erros = await validate(plainToInstance(FunctionWriteDto, payload));
    return erros.map((erro) => erro.property);
  };

  it('aceita payload válido, com ou sem parametros', async () => {
    await expect(errosDe(dtoValido)).resolves.toEqual([]);
    await expect(errosDe({ ...dtoValido, parametros: null })).resolves.toEqual(
      [],
    );
    await expect(
      errosDe({ ...dtoValido, parametros: { pino: 13 } }),
    ).resolves.toEqual([]);
  });

  it.each(['Vire esquerda', '1Andar', 'Andar();', ''])(
    'rejeita nome que não é identificador C (%s)',
    async (nome) => {
      await expect(errosDe({ ...dtoValido, nome })).resolves.toEqual(['nome']);
    },
  );

  it.each(['if', 'void', 'while', 'int', 'setup', 'loop', 'delay'])(
    'rejeita nome reservado do C/C++ ou do Arduino (%s)',
    async (nome) => {
      await expect(
        errosDe({
          ...dtoValido,
          nome,
          blocoDefinicao: { type: nome, message0: nome },
        }),
      ).resolves.toEqual(['nome']);
    },
  );

  it('limita o nome a 64 caracteres', async () => {
    await expect(
      errosDe({ ...dtoValido, nome: 'a'.repeat(64) }),
    ).resolves.toEqual([]);
    await expect(
      errosDe({ ...dtoValido, nome: 'a'.repeat(65) }),
    ).resolves.toEqual(['nome']);
  });

  it.each([
    ['descricao', '   '],
    ['codigoArduino', '\n'],
  ])('rejeita %s só com espaços', async (campo, valor) => {
    await expect(errosDe({ ...dtoValido, [campo]: valor })).resolves.toEqual([
      campo,
    ]);
  });

  it.each([
    ['descricao', { descricao: 'Pisca\u0000' }],
    ['codigoArduino', { codigoArduino: 'delay(1);\u0000' }],
    [
      'blocoDefinicao',
      { blocoDefinicao: { type: 'piscar_led', message0: 'piscar\u0000' } },
    ],
    ['parametros', { parametros: { pinos: ['13\u0000'] } }],
  ])('rejeita caractere nulo em %s', async (campo, campos) => {
    await expect(errosDe({ ...dtoValido, ...campos })).resolves.toEqual([
      campo,
    ]);
  });

  it.each(['descricao', 'codigoArduino', 'blocoDefinicao'])(
    'rejeita payload sem %s',
    async (campo) => {
      const payload: Record<string, unknown> = { ...dtoValido };
      delete payload[campo];

      await expect(errosDe(payload)).resolves.toEqual([campo]);
    },
  );

  it('rejeita blocoDefinicao fora do schema da BE-14, explicando o motivo', async () => {
    const erros = await validate(
      plainToInstance(FunctionWriteDto, {
        ...dtoValido,
        blocoDefinicao: { type: 'piscar_led', campoDesconhecido: true },
      }),
    );

    expect(erros).toHaveLength(1);
    expect(erros[0].constraints?.isBlockDefinition).toMatch(
      /^blocoDefinicao inválido: .*message0/,
    );
  });
});
