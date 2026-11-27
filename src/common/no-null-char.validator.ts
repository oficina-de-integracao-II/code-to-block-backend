import { ValidateBy } from 'class-validator';

// Procura o caractere nulo em textos, inclusive dentro de objetos e listas.
function hasNullChar(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.includes('\0');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, item]) => key.includes('\0') || hasNullChar(item),
    );
  }

  return false;
}

// O Postgres não grava o caractere nulo (\u0000) em texto nem em JSONB; sem
// esta validação o erro do banco sairia como 500 em vez de 400.
export function NoNullChar() {
  return ValidateBy({
    name: 'noNullChar',
    validator: {
      validate: (value) => !hasNullChar(value),
      defaultMessage: (args) =>
        `${args?.property} não pode conter o caractere nulo (\\u0000)`,
    },
  });
}
