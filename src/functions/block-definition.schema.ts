import { z } from 'zod';

const blockArgumentSchema = z.record(z.string(), z.json());

export const blockDefinitionSchema = z
  .object({
    type: z.string().min(1, 'type não pode ser vazio'),
    message0: z.string().min(1, 'message0 não pode ser vazio'),
    args0: z.array(blockArgumentSchema).optional(),
    colour: z.union([z.string(), z.number()]).optional(),
    inputsInline: z.boolean().optional(),
    previousStatement: z
      .union([z.string(), z.boolean(), z.null()])
      .optional(),
    nextStatement: z.union([z.string(), z.boolean(), z.null()]).optional(),
    output: z.union([z.string(), z.boolean(), z.null()]).optional(),
    tooltip: z.string().optional(),
    helpUrl: z.string().url().optional(),
  })
  .strict();

export type BlockDefinition = z.infer<typeof blockDefinitionSchema>;

export function validateBlockDefinition(value: unknown): BlockDefinition {
  const result = blockDefinitionSchema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  const details = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'definição'}: ${issue.message}`)
    .join('; ');

  throw new Error(`Definição de bloco Blockly inválida: ${details}`);
}
