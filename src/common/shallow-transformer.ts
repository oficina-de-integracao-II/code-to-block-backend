import type { Type } from '@nestjs/common';

// Substitui o class-transformer no ValidationPipe. O class-transformer percorre
// o corpo inteiro de forma recursiva: estoura a pilha (500) com JSON muito
// aninhado, como um estadoBlocos com centenas de blocos encadeados, e descarta
// chaves como `constructor` e `prototype`. Os DTOs do projeto não usam
// @Type/@ValidateNested, então basta criar a instância com os campos de
// primeiro nível; os valores aninhados chegam ao controller como foram enviados.
export const shallowTransformer = {
  plainToInstance<T>(cls: Type<T>, plain: unknown): T {
    return Object.assign(Object.create(cls.prototype) as T & object, plain);
  },
  classToPlain(object: unknown) {
    return { ...(object as Record<string, unknown>) };
  },
};
