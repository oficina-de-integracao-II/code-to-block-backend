import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { FunctionsRepository } from './functions.repository.js';

describe('FunctionsRepository', () => {
  const prisma = {
    functionCatalog: {
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  };
  let repository: FunctionsRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new FunctionsRepository(prisma as unknown as PrismaService);
  });

  it('valida a definição antes de criar uma função', async () => {
    prisma.functionCatalog.create.mockResolvedValue({ id: 1 });

    await repository.create({
      nome: 'piscar_led',
      descricao: 'Pisca o LED',
      codigoArduino: 'digitalWrite(LED_BUILTIN, HIGH);',
      blocoDefinicao: { type: 'piscar_led', message0: 'piscar LED' },
    });

    expect(prisma.functionCatalog.create).toHaveBeenCalledOnce();
  });

  it('rejeita uma definição inválida antes de chamar o Prisma', async () => {
    expect(() =>
      repository.create({
        nome: 'piscar_led',
        descricao: 'Pisca o LED',
        codigoArduino: 'digitalWrite(LED_BUILTIN, HIGH);',
        blocoDefinicao: { type: 'piscar_led', campoDesconhecido: true },
      }),
    ).toThrow(/Definição de bloco Blockly inválida/);

    expect(prisma.functionCatalog.create).not.toHaveBeenCalled();
  });

  it('valida a definição quando update e upsert alteram o campo', async () => {
    prisma.functionCatalog.update.mockResolvedValue({ id: 1 });
    prisma.functionCatalog.upsert.mockResolvedValue({ id: 1 });

    await repository.update(1, {
      blocoDefinicao: { type: 'piscar_led', message0: 'piscar LED' },
    });
    await repository.upsert(
      { nome: 'piscar_led' },
      {
        nome: 'piscar_led',
        descricao: 'Pisca o LED',
        codigoArduino: 'digitalWrite(LED_BUILTIN, HIGH);',
        blocoDefinicao: { type: 'piscar_led', message0: 'piscar LED' },
      },
      {
        blocoDefinicao: { type: 'piscar_led', message0: 'piscar LED' },
      },
    );

    expect(prisma.functionCatalog.update).toHaveBeenCalledOnce();
    expect(prisma.functionCatalog.upsert).toHaveBeenCalledOnce();
  });
});
