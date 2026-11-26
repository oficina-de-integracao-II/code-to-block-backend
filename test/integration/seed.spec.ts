import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { predefinedFunctions } from '../../prisma/seed-data.js';
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

    await expect(prisma.functionCatalog.count()).resolves.toBe(
      predefinedFunctions.length,
    );
    await expect(
      prisma.functionCatalog.findUnique({ where: { nome: 'ParaFrente' } }),
    ).resolves.toMatchObject({
      nome: 'ParaFrente',
      blocoDefinicao: {
        type: 'ParaFrente',
        message0: 'Para frente',
        colour: 230,
      },
    });

    runSeed();

    await expect(prisma.functionCatalog.count()).resolves.toBe(
      predefinedFunctions.length,
    );
    await expect(
      prisma.functionCatalog.findUnique({ where: { nome: 'ParaFrente' } }),
    ).resolves.toMatchObject({
      nome: 'ParaFrente',
      blocoDefinicao: {
        type: 'ParaFrente',
        message0: 'Para frente',
        colour: 230,
      },
    });
  });
});
