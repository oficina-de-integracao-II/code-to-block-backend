import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FunctionWriteDto } from './dto/function-write.dto.js';
import { FunctionsService } from './functions.service.js';

describe('FunctionsService', () => {
  let service: FunctionsService;

  const prisma = {
    functionCatalog: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('erro do banco', {
      code,
      clientVersion: 'test',
    });

  const piscarLed = {
    id: 1,
    nome: 'piscar_led',
    descricao: 'Pisca o LED embutido',
    codigoArduino: 'digitalWrite(LED_BUILTIN, HIGH);',
    blocoDefinicao: { type: 'piscar_led', message0: 'piscar LED' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Por padrão, nenhuma outra função usa o mesmo type de bloco.
    prisma.functionCatalog.findFirst.mockResolvedValue(null);
    service = new FunctionsService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    it('retorna as funções com os campos do resumo, ordenadas por id', async () => {
      prisma.functionCatalog.findMany.mockResolvedValue([piscarLed]);

      await expect(service.list()).resolves.toEqual([piscarLed]);

      expect(prisma.functionCatalog.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          nome: true,
          descricao: true,
          codigoArduino: true,
          blocoDefinicao: true,
        },
        orderBy: { id: 'asc' },
      });
    });

    it('retorna lista vazia quando o catálogo está vazio', async () => {
      prisma.functionCatalog.findMany.mockResolvedValue([]);

      await expect(service.list()).resolves.toEqual([]);
    });
  });

  describe('findById', () => {
    it('retorna os detalhes da função, incluindo os parâmetros', async () => {
      const detalhe = { ...piscarLed, parametros: { pino: 13 } };
      prisma.functionCatalog.findUnique.mockResolvedValue(detalhe);

      await expect(service.findById(1)).resolves.toEqual(detalhe);

      const args = prisma.functionCatalog.findUnique.mock.calls[0][0];
      expect(args.where).toEqual({ id: 1 });
      expect(args.select).toMatchObject({
        parametros: true,
        blocoDefinicao: true,
      });
      // Campos internos não fazem parte do contrato.
      expect(args.select).not.toHaveProperty('criadoPorId');
    });

    it('lança NotFoundException quando a função não existe', async () => {
      prisma.functionCatalog.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const dto = {
      nome: 'piscar_led',
      descricao: 'Pisca o LED embutido',
      codigoArduino: 'digitalWrite(LED_BUILTIN, HIGH);',
      blocoDefinicao: { type: 'piscar_led', message0: 'piscar LED' },
      parametros: { pino: 13 },
    } satisfies FunctionWriteDto;

    it('cria a função registrando quem a cadastrou', async () => {
      prisma.functionCatalog.create.mockResolvedValue({ id: 1, ...dto });

      await expect(service.create(dto, 7)).resolves.toEqual({ id: 1, ...dto });

      const args = prisma.functionCatalog.create.mock.calls[0][0];
      expect(args.data).toEqual({ ...dto, criadoPorId: 7 });
      expect(args.select).not.toHaveProperty('criadoPorId');
    });

    it('grava parametros ausente como nulo no banco', async () => {
      prisma.functionCatalog.create.mockResolvedValue({ id: 1 });

      await service.create({ ...dto, parametros: undefined }, 7);

      const args = prisma.functionCatalog.create.mock.calls[0][0];
      expect(args.data.parametros).toBe(Prisma.DbNull);
    });

    it('lança ConflictException quando o nome já existe', async () => {
      prisma.functionCatalog.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(dto, 7)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('lança ConflictException quando outra função já usa o type do bloco', async () => {
      prisma.functionCatalog.findFirst.mockResolvedValue({ id: 2 });

      await expect(service.create(dto, 7)).rejects.toThrow(
        'Já existe uma função com esse tipo de bloco',
      );
      expect(prisma.functionCatalog.findFirst).toHaveBeenCalledWith({
        where: {
          id: { not: undefined },
          nome: { not: 'piscar_led' },
          blocoDefinicao: { path: ['type'], equals: 'piscar_led' },
        },
        select: { id: true },
      });
      expect(prisma.functionCatalog.create).not.toHaveBeenCalled();
    });

    it('repassa erros inesperados do banco', async () => {
      const erro = new Error('conexão perdida');
      prisma.functionCatalog.create.mockRejectedValue(erro);

      await expect(service.create(dto, 7)).rejects.toBe(erro);
    });

    it('repassa erros do Prisma que não fazem parte do contrato', async () => {
      const erro = prismaError('P2003');
      prisma.functionCatalog.create.mockRejectedValue(erro);

      await expect(service.create(dto, 7)).rejects.toBe(erro);
    });
  });

  describe('update', () => {
    const dto = {
      nome: 'piscar_led',
      descricao: 'Nova descrição',
      codigoArduino: 'digitalWrite(LED_BUILTIN, LOW);',
      blocoDefinicao: { type: 'piscar_led', message0: 'piscar LED' },
      parametros: null,
    } satisfies FunctionWriteDto;

    it('substitui os campos da função pelo id', async () => {
      prisma.functionCatalog.update.mockResolvedValue({ id: 1, ...dto });

      await expect(service.update(1, dto)).resolves.toEqual({ id: 1, ...dto });

      const args = prisma.functionCatalog.update.mock.calls[0][0];
      expect(args.where).toEqual({ id: 1 });
      expect(args.data).toEqual({ ...dto, parametros: Prisma.DbNull });
    });

    it('lança NotFoundException quando a função não existe', async () => {
      prisma.functionCatalog.update.mockRejectedValue(prismaError('P2025'));

      await expect(service.update(999, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('ignora a própria função ao verificar o type do bloco', async () => {
      prisma.functionCatalog.update.mockResolvedValue({ id: 1, ...dto });

      await service.update(1, dto);

      const args = prisma.functionCatalog.findFirst.mock.calls[0][0];
      expect(args.where.id).toEqual({ not: 1 });
    });

    it('lança ConflictException quando outra função já usa o type do bloco', async () => {
      prisma.functionCatalog.findFirst.mockResolvedValue({ id: 2 });

      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.functionCatalog.update).not.toHaveBeenCalled();
    });

    it('lança ConflictException ao renomear para um nome existente', async () => {
      prisma.functionCatalog.update.mockRejectedValue(prismaError('P2002'));

      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('remove a função pelo id', async () => {
      prisma.functionCatalog.delete.mockResolvedValue({ id: 1 });

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(prisma.functionCatalog.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('lança NotFoundException quando a função não existe', async () => {
      prisma.functionCatalog.delete.mockRejectedValue(prismaError('P2025'));

      await expect(service.remove(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
