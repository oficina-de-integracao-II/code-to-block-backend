import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET é obrigatório'),
  // Exige unidade: sem ela, a lib de JWT lê "3600" como 3600 milissegundos.
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'use número + unidade (s, m, h, d), ex.: 15m, 1d')
    .default('1d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  // Origens liberadas no CORS, separadas por vírgula.
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuração de ambiente inválida: ${issues}`);
  }

  return result.data;
}
