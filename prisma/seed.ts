import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { validateBlockDefinition } from '../src/functions/block-definition.schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL é obrigatória para executar o seed');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const functions = [
  {
    nome: 'piscar_led',
    descricao: 'Pisca o LED embutido',
    codigoArduino: 'digitalWrite(LED_BUILTIN, HIGH);',
    blocoDefinicao: {
      type: 'piscar_led',
      message0: 'piscar LED',
      colour: 230,
    },
  },
];

try {
  for (const fn of functions) {
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
} finally {
  await prisma.$disconnect();
}
