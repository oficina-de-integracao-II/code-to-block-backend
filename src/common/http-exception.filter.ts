import { STATUS_CODES } from 'node:http';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';

type BodyParserError = {
  type?: unknown;
  status?: unknown;
  expose?: unknown;
  message?: unknown;
};

// Os erros do body-parser (corpo grande demais, JSON malformado, charset não
// suportado...) não são HttpException; sem esta conversão sairiam como 500.
// Eles trazem o status 4xx e, com `expose`, uma mensagem segura para o cliente.
function fromBodyParser(exception: unknown) {
  const { type, status, expose, message } = (exception ??
    {}) as BodyParserError;

  if (typeof type !== 'string' || !expose || typeof status !== 'number') {
    return exception;
  }
  if (type === 'entity.too.large') {
    return new PayloadTooLargeException(
      'Corpo da requisição excede o limite do servidor',
    );
  }

  return new HttpException(String(message), status);
}

// Todo erro da API sai como { statusCode, message, error }.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(rawException: unknown, host: ArgumentsHost) {
    const exception = fromBodyParser(rawException);
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
