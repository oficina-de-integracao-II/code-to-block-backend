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

// O body-parser recusa corpo acima do limite com um erro próprio (não é
// HttpException); sem esta conversão ele sairia como 500.
function fromBodyParser(exception: unknown) {
  const type = (exception as { type?: unknown } | null)?.type;

  return type === 'entity.too.large'
    ? new PayloadTooLargeException(
        'Corpo da requisição excede o limite do servidor',
      )
    : exception;
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
