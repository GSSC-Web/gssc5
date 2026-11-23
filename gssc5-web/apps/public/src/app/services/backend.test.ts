import { describe, expect, test } from 'vitest';
import { BACKEND_ORIGIN, resolveBackendOrigin } from './backend';

describe('BACKEND_ORIGIN', () => {
  test('defaults to localhost:3000 when location is unavailable', () => {
    expect(resolveBackendOrigin(undefined)).toBe('http://localhost:3000');
  });

  test('mirrors loopback hostname for same-site Login Token cookies', () => {
    expect(
      resolveBackendOrigin({ protocol: 'http:', hostname: '127.0.0.1' }),
    ).toBe('http://127.0.0.1:3000');
    expect(
      resolveBackendOrigin({ protocol: 'http:', hostname: 'localhost' }),
    ).toBe('http://localhost:3000');
  });

  test('keeps the module export aligned with the harness location', () => {
    expect(BACKEND_ORIGIN).toMatch(/^https?:\/\/(localhost|127\.0\.0\.1):3000$/);
  });
});
