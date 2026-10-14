process.env.DATABASE_URL ??=
  'postgresql://user:password@localhost:5432/arduino_blocks_test';
process.env.JWT_SECRET ??= 'test-secret';
process.env.JWT_EXPIRES_IN ??= '1d';
process.env.PORT ??= '3000';
