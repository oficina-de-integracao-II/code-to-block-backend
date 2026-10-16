import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { FunctionsService } from './functions.service.js';

// TODO(BE-10): proteger as rotas com o JwtAuthGuard quando ele existir.
@ApiTags('Funções')
@Controller('functions')
export class FunctionsController {
  constructor(private readonly functionsService: FunctionsService) {}

  @Get()
  @ApiOkResponse({ description: 'Lista de funções do catálogo' })
  list() {
    return this.functionsService.list();
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Detalhes da função' })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiNotFoundResponse({ description: 'Função não encontrada' })
  findById(@Param('id', ParseIdPipe) id: number) {
    return this.functionsService.findById(id);
  }
}
