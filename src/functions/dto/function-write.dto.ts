import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  type BlockDefinition,
  IsBlockDefinition,
} from '../block-definition.schema.js';

// Corpo do POST e do PUT /functions (o PUT substitui a função inteira).
export class FunctionWriteDto {
  // O nome é o que o usuário digita no editor (ex.: `Andar();`), então
  // precisa ser um identificador válido em C/C++.
  @IsString()
  @Matches(/^[A-Za-z_][A-Za-z0-9_]*$/, {
    message:
      'nome deve começar com letra ou _ e conter apenas letras, números ou _',
  })
  nome!: string;

  @IsString()
  @MinLength(1)
  descricao!: string;

  @IsString()
  @MinLength(1)
  codigoArduino!: string;

  @IsBlockDefinition()
  blocoDefinicao!: BlockDefinition;

  // Qualquer JSON; ausente ou null limpa o campo.
  @IsOptional()
  parametros?: Prisma.InputJsonValue | null;
}
