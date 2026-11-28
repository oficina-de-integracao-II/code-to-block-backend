import type { PrismaClient } from '../src/generated/prisma/client.js';
import { validateBlockDefinition } from '../src/functions/block-definition.schema.js';

export const predefinedFunctions = [
  {
    nome: 'Andar',
    descricao: 'Move o robô para frente em velocidade moderada.',
    codigoArduino: `
      void Andar() {
        analogWrite(5, 128);
        analogWrite(6, 128);
      }`,
    blocoDefinicao: {
      type: 'Andar',
      message0: 'Andar',
      colour: 230,
    },
  },
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

// Só cria o que falta e não desfaz o que o admin alterou. Pula a função
// quando o nome ou o type do bloco já estão em uso: se o admin renomeou
// Andar para Correr mantendo o type, recriar Andar repetiria o type.
export async function seedFunctionCatalog(prisma: PrismaClient) {
  for (const fn of predefinedFunctions) {
    const existing = await prisma.functionCatalog.findFirst({
      where: {
        OR: [
          { nome: fn.nome },
          {
            blocoDefinicao: { path: ['type'], equals: fn.blocoDefinicao.type },
          },
        ],
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.functionCatalog.create({
        data: {
          ...fn,
          blocoDefinicao: validateBlockDefinition(fn.blocoDefinicao),
        },
      });
    }
  }
}
