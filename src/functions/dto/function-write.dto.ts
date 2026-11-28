import {
  IsNotIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { NoNullChar } from '../../common/no-null-char.validator.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  type BlockDefinition,
  IsBlockDefinition,
} from '../block-definition.schema.js';
import { RESERVED_NAMES } from '../reserved-names.js';

// Corpo do POST e do PUT /functions (o PUT substitui a função inteira).
export class FunctionWriteDto {
  // O nome é o que o usuário digita no editor (ex.: `Andar();`), então
  // precisa ser um identificador válido em C/C++ e não pode ser reservado.
  @IsString()
  @Matches(/^[A-Za-z_][A-Za-z0-9_]*$/, {
    message:
      'nome deve começar com letra ou _ e conter apenas letras, números ou _',
  })
  @MaxLength(64)
  @IsNotIn(RESERVED_NAMES, {
    message: 'nome é uma palavra reservada do C/C++ ou do Arduino',
  })
  nome!: string;

  @IsString()
  @Matches(/\S/, { message: 'descricao não pode ficar em branco' })
  @NoNullChar()
  descricao!: string;

  @IsString()
  @Matches(/\S/, { message: 'codigoArduino não pode ficar em branco' })
  @NoNullChar()
  codigoArduino!: string;

  // O `type` também não pode se repetir no catálogo (verificado no service).
  @IsBlockDefinition()
  @NoNullChar()
  blocoDefinicao!: BlockDefinition;

  // Qualquer JSON; ausente ou null limpa o campo.
  @IsOptional()
  @NoNullChar()
  parametros?: Prisma.InputJsonValue | null;
}
