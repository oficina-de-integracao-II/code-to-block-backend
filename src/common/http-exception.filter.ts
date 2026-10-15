import { STATUS_CODES } from 'node:http';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

// Todo erro da API sai como { statusCode, message, error }.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? exception.getResponse() : undefined;
    // Erro inesperado não expõe detalhes internos ao cliente.
    const message =
      typeof body === 'string'
        ? body
        : ((body as { message?: unknown } | undefined)?.message ??
          STATUS_CODES[statusCode]);

    if (statusCode >= 500) this.logger.error(exception);

    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, message, error: STATUS_CODES[statusCode] });
  }
}
