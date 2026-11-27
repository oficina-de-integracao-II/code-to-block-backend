import {
  type ArgumentsHost,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();
  // Erros 500 são registrados no log; aqui só interessa a resposta.
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

  // Executa o filtro e devolve o status e o corpo enviados na resposta.
  const responder = (exception: unknown) => {
    const response = { status: vi.fn(), json: vi.fn() };
    response.status.mockReturnValue(response);
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    return {
      status: response.status.mock.calls[0][0],
      body: response.json.mock.calls[0][0],
    };
  };

  it('mantém o status e a mensagem de uma HttpException', () => {
    expect(responder(new NotFoundException('Função não encontrada'))).toEqual({
      status: 404,
      body: {
        statusCode: 404,
        message: 'Função não encontrada',
        error: 'Not Found',
      },
    });
  });

  it('usa o texto da HttpException criada só com uma string', () => {
    expect(responder(new HttpException('Sem permissão', 403)).body).toEqual({
      statusCode: 403,
      message: 'Sem permissão',
      error: 'Forbidden',
    });
  });

  it('converte o erro de corpo acima do limite do body-parser em 413', () => {
    const erro = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
      expose: true,
    });

    expect(responder(erro)).toEqual({
      status: 413,
      body: {
        statusCode: 413,
        message: 'Corpo da requisição excede o limite do servidor',
        error: 'Payload Too Large',
      },
    });
  });

  it('mantém o status 4xx e a mensagem pública de outros erros do body-parser', () => {
    const erro = Object.assign(new Error('unsupported charset "LATIN1"'), {
      type: 'charset.unsupported',
      status: 415,
      expose: true,
    });

    expect(responder(erro)).toEqual({
      status: 415,
      body: {
        statusCode: 415,
        message: 'unsupported charset "LATIN1"',
        error: 'Unsupported Media Type',
      },
    });
  });

  it('responde 500 para erro com type que não é público', () => {
    const erro = Object.assign(new Error('detalhe interno'), {
      type: 'stream.encoding.set',
      status: 500,
      expose: false,
    });

    expect(responder(erro).body.message).toBe('Internal Server Error');
  });

  it('responde 500 sem expor detalhes de um erro inesperado', () => {
    const { status, body } = responder(new Error('senha do banco: 123'));

    expect(status).toBe(500);
    expect(body).toEqual({
      statusCode: 500,
      message: 'Internal Server Error',
      error: 'Internal Server Error',
    });
  });

  it('responde 500 quando o valor lançado nem é um objeto', () => {
    expect(responder(undefined).status).toBe(500);
  });
});
