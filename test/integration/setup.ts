import { execSync } from 'node:child_process';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';

let container: StartedPostgreSqlContainer | undefined;
let prisma: PrismaClient | undefined;

// Compartilhado entre os arquivos de teste de integração do mesmo processo
// para não pagar o custo de subir um container Postgres por arquivo.
export async function getTestDatabase() {
  if (!container) {
    container = await new PostgreSqlContainer('postgres:16').start();
    const url = container.getConnectionUri();
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
    });
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }

  return { url: container.getConnectionUri(), prisma: prisma! };
}

// Limpa as tabelas entre testes sem recriar o schema a cada vez.
export async function cleanDatabase() {
  const { prisma } = await getTestDatabase();
  await prisma.$transaction([
    prisma.project.deleteMany(),
    prisma.functionCatalog.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function teardownTestDatabase() {
  await prisma?.$disconnect();
  await container?.stop();
  container = undefined;
  prisma = undefined;
}
