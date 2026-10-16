import { validateEnv } from './env.schema.js';

const validEnv = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/code_to_block',
  JWT_SECRET: 'super-secret',
  JWT_EXPIRES_IN: '1d',
  GOOGLE_CLIENT_ID: 'google-client-id',
  PORT: '3000',
  CORS_ORIGIN: 'http://localhost:5173, https://app.exemplo.com',
};

describe('validateEnv', () => {
  it('rejeita configuração sem DATABASE_URL', () => {
    const { DATABASE_URL: _DATABASE_URL, ...rest } = validEnv;

    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('rejeita configuração sem JWT_SECRET', () => {
    const { JWT_SECRET: _JWT_SECRET, ...rest } = validEnv;

    expect(() => validateEnv(rest)).toThrow(/JWT_SECRET/);
  });

  it.each(['3600', '1 dia', ''])(
    'rejeita JWT_EXPIRES_IN sem unidade válida: %j',
    (JWT_EXPIRES_IN) => {
      expect(() => validateEnv({ ...validEnv, JWT_EXPIRES_IN })).toThrow(
        /JWT_EXPIRES_IN/,
      );
    },
  );

  it('aceita configuração válida e a retorna tipada', () => {
    const result = validateEnv(validEnv);

    expect(result).toEqual({
      DATABASE_URL: validEnv.DATABASE_URL,
      JWT_SECRET: validEnv.JWT_SECRET,
      JWT_EXPIRES_IN: validEnv.JWT_EXPIRES_IN,
      GOOGLE_CLIENT_ID: validEnv.GOOGLE_CLIENT_ID,
      PORT: 3000,
      CORS_ORIGIN: ['http://localhost:5173', 'https://app.exemplo.com'],
    });
    expect(typeof result.PORT).toBe('number');
  });

  it('aplica valores padrão para JWT_EXPIRES_IN, PORT e CORS_ORIGIN quando ausentes', () => {
    const {
      JWT_EXPIRES_IN: _JWT_EXPIRES_IN,
      PORT: _PORT,
      CORS_ORIGIN: _CORS_ORIGIN,
      ...rest
    } = validEnv;

    const result = validateEnv(rest);

    expect(result.JWT_EXPIRES_IN).toBe('1d');
    expect(result.PORT).toBe(3000);
    expect(result.CORS_ORIGIN).toEqual(['http://localhost:5173']);
  });
});
