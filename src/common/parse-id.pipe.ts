import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

// Maior valor de uma coluna INTEGER do Postgres. Acima disso o Prisma falha
// com erro interno em vez de simplesmente não encontrar o registro.
const MAX_ID = 2_147_483_647;

// Valida o parâmetro de rota `:id` conforme o contrato (inteiro >= 1).
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);

    if (!/^\d+$/.test(value) || id < 1 || id > MAX_ID) {
      throw new BadRequestException('O id deve ser um inteiro positivo');
    }

    return id;
  }
}
