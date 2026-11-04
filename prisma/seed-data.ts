import type { PrismaClient } from '../src/generated/prisma/client.js';
import { validateBlockDefinition } from '../src/functions/block-definition.schema.js';

export const predefinedFunctions = [
  {
    nome: 'ParaFrente',
    descricao: 'Move o robô para frente.',
    codigoArduino: `
      void ParaFrente() {
        digitalWrite(5, HIGH);
        digitalWrite(6, HIGH);
      }`,
    blocoDefinicao: {
      type: 'ParaFrente',
      message0: 'Para frente',
      colour: 230,
    },
  },
  {
    nome: 'ParaTras',
    descricao: 'Move o robô para trás.',
    codigoArduino: `
      void ParaTras() {
        digitalWrite(5, LOW);
        digitalWrite(6, LOW);
      }`,
    blocoDefinicao: {
      type: 'ParaTras',
      message0: 'Para trás',
      colour: 230,
    },
  },
  {
    nome: 'VireEsquerda',
    descricao: 'Gira o robô para a esquerda.',
    codigoArduino: `
      void VireEsquerda() {
        digitalWrite(5, LOW);
        digitalWrite(6, HIGH);
      }`,
    blocoDefinicao: {
      type: 'VireEsquerda',
      message0: 'Virar à esquerda',
      colour: 230,
    },
  },
  {
    nome: 'VireDireita',
    descricao: 'Gira o robô para a direita.',
    codigoArduino: `
      void VireDireita() {
        digitalWrite(5, HIGH);
        digitalWrite(6, LOW);
      }`,
    blocoDefinicao: {
      type: 'VireDireita',
      message0: 'Virar à direita',
      colour: 230,
    },
  },
  {
    nome: 'Pare',
    descricao: 'Para o robô.',
    codigoArduino: `
      void Pare() {
        digitalWrite(5, LOW);
        digitalWrite(6, LOW);
      }`,
    blocoDefinicao: {
      type: 'Pare',
      message0: 'Pare',
      colour: 230,
    },
  },
];

export async function seedFunctionCatalog(prisma: PrismaClient) {
  for (const fn of predefinedFunctions) {
    await prisma.functionCatalog.upsert({
      where: { nome: fn.nome },
      create: {
        ...fn,
        blocoDefinicao: validateBlockDefinition(fn.blocoDefinicao),
      },
      update: {
        descricao: fn.descricao,
        codigoArduino: fn.codigoArduino,
        blocoDefinicao: validateBlockDefinition(fn.blocoDefinicao),
      },
    });
  }
}
