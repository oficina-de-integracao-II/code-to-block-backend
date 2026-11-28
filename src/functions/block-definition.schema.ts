import { ValidateBy } from 'class-validator';
import { z } from 'zod';

const blockArgumentSchema = z.record(z.string(), z.json());

export const blockDefinitionSchema = z
  .object({
    type: z.string().min(1, 'type não pode ser vazio'),
    message0: z.string().min(1, 'message0 não pode ser vazio'),
    args0: z.array(blockArgumentSchema).optional(),
    colour: z.union([z.string(), z.number()]).optional(),
    inputsInline: z.boolean().optional(),
    previousStatement: z.union([z.string(), z.boolean(), z.null()]).optional(),
    nextStatement: z.union([z.string(), z.boolean(), z.null()]).optional(),
    output: z.union([z.string(), z.boolean(), z.null()]).optional(),
    tooltip: z.string().optional(),
    helpUrl: z.url().optional(),
  })
  .strict();

export type BlockDefinition = z.infer<typeof blockDefinitionSchema>;

function formatIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'definição'}: ${issue.message}`)
    .join('; ');
}

export function validateBlockDefinition(value: unknown): BlockDefinition {
  const result = blockDefinitionSchema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  throw new Error(
    `Definição de bloco Blockly inválida: ${formatIssues(result.error)}`,
  );
}

// Decorator para DTOs: aplica o mesmo schema e responde 400 com o motivo,
// no mesmo formato dos demais erros de validação de campo.
export function IsBlockDefinition() {
  return ValidateBy({
    name: 'isBlockDefinition',
    validator: {
      validate: (value) => blockDefinitionSchema.safeParse(value).success,
      defaultMessage: (args) => {
        const result = blockDefinitionSchema.safeParse(args?.value);
        return result.success
          ? ''
          : `${args?.property} inválido: ${formatIssues(result.error)}`;
      },
    },
  });
}
