import { execSync } from 'node:child_process';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';

describe('schema Prisma (migration inicial)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16').start();
    const url = container.getConnectionUri();
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
    });
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('aplica a migration em banco limpo', async () => {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;

    expect(tables.map((t) => t.tablename)).toEqual(
      expect.arrayContaining(['users', 'functions_catalog', 'projects']),
    );
  });

  it('rejeita dois usuários com o mesmo e-mail', async () => {
    await prisma.user.create({ data: { nome: 'Ana', email: 'ana@x.com' } });

    await expect(
      prisma.user.create({ data: { nome: 'Outra', email: 'ana@x.com' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('cria usuário com role USER por padrão', async () => {
    const user = await prisma.user.create({
      data: { nome: 'Bia', email: 'bia@x.com' },
    });

    expect(user.role).toBe('USER');
  });

  it('remove os projetos em cascata ao remover o usuário', async () => {
    const user = await prisma.user.create({
      data: {
        nome: 'Caio',
        email: 'caio@x.com',
        projects: {
          create: { nome: 'P1', codigoFonte: 'Andar();', estadoBlocos: [] },
        },
      },
    });

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.project.count({ where: { usuarioId: user.id } })).toBe(
      0,
    );
  });
});
