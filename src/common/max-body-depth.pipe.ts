import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

// Profundidade máxima de objetos e listas no corpo da requisição. Parte do
// caminho até o banco é recursiva (a serialização de JSON do Prisma estoura a
// pilha, gerando 500, a partir de uns 2.100 níveis). O limite de 1.500 deixa
// folga e comporta cerca de 750 blocos encadeados no Blockly (cada bloco
// seguinte fica em `next.block`, dois níveis por bloco).
export const MAX_BODY_DEPTH = 1500;

// Percorre o valor sem recursão, para não estourar a pilha aqui também.
function exceedsDepth(value: unknown, max: number) {
  const pending: Array<[unknown, number]> = [[value, 1]];

  for (let item = pending.pop(); item; item = pending.pop()) {
    const [current, depth] = item;

    if (current && typeof current === 'object') {
      if (depth > max) {
        return true;
      }
      for (const child of Object.values(current)) {
        pending.push([child, depth + 1]);
      }
    }
  }

  return false;
}

// Roda antes do ValidationPipe e recusa com 400 o corpo aninhado demais.
@Injectable()
export class MaxBodyDepthPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type === 'body' && exceedsDepth(value, MAX_BODY_DEPTH)) {
      throw new BadRequestException(
        `Corpo da requisição excede a profundidade máxima de ${MAX_BODY_DEPTH} níveis`,
      );
    }

    return value;
  }
}
