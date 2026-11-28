import { describe, expect, it } from 'vitest';
import { shallowTransformer } from './shallow-transformer.js';

class Exemplo {
  nome!: string;
  estado!: object;
}

describe('shallowTransformer', () => {
  it('cria a instância do DTO sem copiar nem alterar os valores aninhados', () => {
    const estado = { blocks: [{ next: { block: { type: 'Andar' } } }] };

    const instancia = shallowTransformer.plainToInstance(Exemplo, {
      nome: 'Meu robô',
      estado,
    });

    expect(instancia).toBeInstanceOf(Exemplo);
    expect(instancia).toEqual({ nome: 'Meu robô', estado });
    expect(instancia.estado).toBe(estado);
  });

  it('aceita corpo ausente', () => {
    expect(shallowTransformer.plainToInstance(Exemplo, undefined)).toEqual({});
  });

  it('classToPlain devolve um objeto comum com os mesmos campos', () => {
    const instancia = shallowTransformer.plainToInstance(Exemplo, {
      nome: 'x',
    });
    const plain = shallowTransformer.classToPlain(instancia);

    expect(plain).not.toBeInstanceOf(Exemplo);
    expect(plain).toEqual({ nome: 'x' });
  });
});
