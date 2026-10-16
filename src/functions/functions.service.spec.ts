import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { FunctionsService } from './functions.service.js';

describe('FunctionsService', () => {
  let service: FunctionsService;

  const prisma = {
    functionCatalog: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  const piscarLed = {
    id: 1,
    nome: 'piscar_led',
    descricao: 'Pisca o LED embutido',
    codigoArduino: 'digitalWrite(LED_BUILTIN, HIGH);',
    blocoDefinicao: { type: 'piscar_led', message0: 'piscar LED' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
});
