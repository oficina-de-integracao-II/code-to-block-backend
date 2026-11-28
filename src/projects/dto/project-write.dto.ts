import {
  Allow,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  ValidateBy,
} from 'class-validator';
import { NoNullChar } from '../../common/no-null-char.validator.js';
import type { Prisma } from '../../generated/prisma/client.js';

// Limites por campo, em caracteres. Para um projeto comum (texto ASCII),
// somados cabem no limite padrão de 100 kB do corpo da requisição: assim, um
// campo grande demais recebe 400 dizendo qual campo passou do limite. Um corpo
// acima de 100 kB é recusado antes, com 413.
export const PROJECT_LIMITS = {
  nome: 100,
  codigoFonte: 10_000,
  // Tamanho do JSON serializado.
  estadoBlocos: 50_000,
} as const;

// Limita o tamanho de um JSON depois de serializado.
function MaxJsonLength(max: number) {
  return ValidateBy({
    name: 'maxJsonLength',
    constraints: [max],
    validator: {
      // `?? null`: campo ausente fica para os outros validadores recusarem.
      validate: (value) => JSON.stringify(value ?? null).length <= max,
      defaultMessage: (args) =>
        `${args?.property} excede o tamanho máximo de ${max} caracteres`,
    },
  });
}

// Corpo do POST /projects.
export class ProjectWriteDto {
  @IsString()
  // Vazio ou só espaços: o S05 pede "Escreva um nome para guardar o projeto".
  @Matches(/\S/, { message: 'nome não pode ficar em branco' })
  @MaxLength(PROJECT_LIMITS.nome)
  @NoNullChar()
  nome!: string;

  @IsString()
  @MaxLength(PROJECT_LIMITS.codigoFonte)
  @NoNullChar()
  codigoFonte!: string;

  @IsObject()
  @MaxJsonLength(PROJECT_LIMITS.estadoBlocos)
  @NoNullChar()
  estadoBlocos!: Prisma.InputJsonObject;

  // Aceito e ignorado: o dono do projeto é sempre o usuário do token.
  @Allow()
  usuarioId?: unknown;
}
