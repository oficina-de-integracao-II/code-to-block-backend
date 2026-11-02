import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  cleanDatabase,
  getTestDatabase,
  teardownTestDatabase,
} from './setup.js';

describe('seed do catálogo de funções', () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    const database = await getTestDatabase();
    prisma = database.prisma;
    databaseUrl = database.url;
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  function runSeed() {
    execFileSync(process.execPath, ['--import', 'tsx/esm', 'prisma/seed.ts'], {
      cwd: fileURLToPath(new URL('../..', import.meta.url)),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });
  }

  it('cria uma função válida e é idempotente', async () => {
    runSeed();

    await expect(prisma.functionCatalog.count()).resolves.toBe(1);
    await expect(
      prisma.functionCatalog.findUnique({ where: { nome: 'piscar_led' } }),
    ).resolves.toMatchObject({
      nome: 'piscar_led',
      blocoDefinicao: {
        type: 'piscar_led',
        message0: 'piscar LED',
        colour: 230,
      },
    });

    runSeed();

    await expect(prisma.functionCatalog.count()).resolves.toBe(1);
    await expect(
      prisma.functionCatalog.findUnique({ where: { nome: 'piscar_led' } }),
    ).resolves.toMatchObject({
      nome: 'piscar_led',
      blocoDefinicao: {
        type: 'piscar_led',
        message0: 'piscar LED',
        colour: 230,
      },
    });
  });
});
