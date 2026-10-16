import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ParseIdPipe } from './parse-id.pipe.js';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it('converte um id válido para número', () => {
    expect(pipe.transform('42')).toBe(42);
    expect(pipe.transform('2147483647')).toBe(2_147_483_647);
  });

  it.each(['0', '-1', '1.5', 'abc', '', '1e3', '2147483648'])(
    'rejeita %j com 400',
    (value) => {
      expect(() => pipe.transform(value)).toThrow(BadRequestException);
    },
  );
});
