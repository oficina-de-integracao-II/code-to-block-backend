import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CurrentUser,
  JwtAuthGuard,
  type JwtPayload,
} from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { FunctionWriteDto } from './dto/function-write.dto.js';
import { FunctionsService } from './functions.service.js';

// TODO(BE-10): proteger as rotas de leitura com o JwtAuthGuard.
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

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'Função criada' })
  @ApiBadRequestResponse({ description: 'Campos inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiForbiddenResponse({ description: 'Usuário não é administrador' })
  @ApiConflictResponse({ description: 'Já existe uma função com esse nome' })
  create(@Body() dto: FunctionWriteDto, @CurrentUser() user: JwtPayload) {
    return this.functionsService.create(dto, user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Função atualizada' })
  @ApiBadRequestResponse({ description: 'Id ou campos inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiForbiddenResponse({ description: 'Usuário não é administrador' })
  @ApiNotFoundResponse({ description: 'Função não encontrada' })
  @ApiConflictResponse({ description: 'Já existe uma função com esse nome' })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: FunctionWriteDto) {
    return this.functionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Função removida' })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiForbiddenResponse({ description: 'Usuário não é administrador' })
  @ApiNotFoundResponse({ description: 'Função não encontrada' })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.functionsService.remove(id);
  }
}
