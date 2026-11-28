import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CurrentUser,
  JwtAuthGuard,
  type JwtPayload,
} from '../auth/jwt-auth.guard.js';
import { ProjectWriteDto } from './dto/project-write.dto.js';
import { ProjectsService } from './projects.service.js';

// Todas as rotas de projetos exigem usuário autenticado.
@ApiTags('Projetos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado' })
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Projeto criado' })
  @ApiBadRequestResponse({
    description: 'Campos inválidos ou acima do limite de tamanho',
  })
  @ApiPayloadTooLargeResponse({
    description: 'Corpo da requisição acima do limite do servidor',
  })
  create(@Body() dto: ProjectWriteDto, @CurrentUser() user: JwtPayload) {
    return this.projectsService.create(dto, user.sub);
  }
}
