import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { MAX_BODY_DEPTH, MaxBodyDepthPipe } from './max-body-depth.pipe.js';

describe('MaxBodyDepthPipe', () => {
  const pipe = new MaxBodyDepthPipe();
  const body = { type: 'body' } as const;

  // Lista aninhada com `depth` níveis no total, contando o objeto de fora.
  const aninhado = (depth: number) => ({
    a: JSON.parse('['.repeat(depth - 1) + ']'.repeat(depth - 1)) as unknown,
  });

  it('devolve o corpo sem alterar quando está no limite', () => {
    const value = aninhado(MAX_BODY_DEPTH);

    expect(pipe.transform(value, body)).toBe(value);
  });

  it('recusa com 400 o corpo acima do limite, sem estourar a pilha', () => {
    expect(() => pipe.transform(aninhado(MAX_BODY_DEPTH + 1), body)).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform(aninhado(100_000), body)).toThrow(
      `Corpo da requisição excede a profundidade máxima de ${MAX_BODY_DEPTH} níveis`,
    );
  });

  it('ignora parâmetros que não são o corpo', () => {
    const value = aninhado(MAX_BODY_DEPTH + 1);

    expect(pipe.transform(value, { type: 'query' })).toBe(value);
  });

  it.each([undefined, null, 'texto', 42])(
    'aceita corpo que não é objeto (%s)',
    (value) => {
      expect(pipe.transform(value, body)).toBe(value);
    },
  );
});
