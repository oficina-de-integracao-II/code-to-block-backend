import { defineConfig } from 'prisma/config';
import 'dotenv/config';

// Prisma 7 não lê o .env sozinho; no CI as variáveis vêm do ambiente.
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
