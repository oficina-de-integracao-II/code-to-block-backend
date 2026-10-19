import { Injectable } from '@nestjs/common';
import { Prisma, type FunctionCatalog } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { validateBlockDefinition } from './block-definition.schema.js';

@Injectable()
export class FunctionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.FunctionCatalogCreateInput) {
    return this.prisma.functionCatalog.create({
      data: {
        ...data,
        blocoDefinicao: validateBlockDefinition(
          data.blocoDefinicao,
        ) as Prisma.InputJsonObject,
      },
    });
  }

  update(
    id: number,
    data: Prisma.FunctionCatalogUpdateInput,
  ): Promise<FunctionCatalog> {
    return this.prisma.functionCatalog.update({
      where: { id },
      data: {
        ...data,
        ...(data.blocoDefinicao === undefined
          ? {}
          : {
              blocoDefinicao: validateBlockDefinition(
                data.blocoDefinicao,
              ) as Prisma.InputJsonObject,
            }),
      },
    });
  }

  upsert(
    where: Prisma.FunctionCatalogWhereUniqueInput,
    create: Prisma.FunctionCatalogCreateInput,
    update: Prisma.FunctionCatalogUpdateInput,
  ) {
    return this.prisma.functionCatalog.upsert({
      where,
      create: {
        ...create,
        blocoDefinicao: validateBlockDefinition(
          create.blocoDefinicao,
        ) as Prisma.InputJsonObject,
      },
      update: {
        ...update,
        ...(update.blocoDefinicao === undefined
          ? {}
          : {
              blocoDefinicao: validateBlockDefinition(
                update.blocoDefinicao,
              ) as Prisma.InputJsonObject,
            }),
      },
    });
  }
}
