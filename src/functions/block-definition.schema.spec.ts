import { describe, expect, it } from 'vitest';
import {
  blockDefinitionSchema,
  validateBlockDefinition,
} from './block-definition.schema.js';

describe('blockDefinitionSchema', () => {
  it('aceita uma definição de bloco Blockly válida', () => {
    const definition = {
      type: 'piscar_led',
      message0: 'piscar LED %1',
      args0: [{ type: 'input_value', name: 'PIN' }],
      colour: 230,
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
    };

    expect(blockDefinitionSchema.parse(definition)).toEqual(definition);
  });

  it.each([
    [{ message0: 'piscar LED' }, 'type'],
    [{ type: 'piscar_led' }, 'message0'],
  ])('rejeita definição sem %s', (definition, field) => {
    const result = blockDefinitionSchema.safeParse(definition);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(
        true,
      );
    }
  });

  it('rejeita campos desconhecidos', () => {
    const result = blockDefinitionSchema.safeParse({
      type: 'piscar_led',
      message0: 'piscar LED',
      campoDesconhecido: true,
    });

    expect(result.success).toBe(false);
  });

  it('produz erro descritivo para uma definição inválida', () => {
    expect(() =>
      validateBlockDefinition({
        type: 'piscar_led',
        message0: 'piscar LED',
        campoDesconhecido: true,
      }),
    ).toThrow(
      'Definição de bloco Blockly inválida: definição: Unrecognized key: "campoDesconhecido"',
    );
  });
});
