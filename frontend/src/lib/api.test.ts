import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authentication API errors', () => {
  it('preserves the login endpoint message instead of labelling bad credentials as an expired session', async () => {
    const location = { pathname: '/login', href: '/login', origin: 'https://siddhi.test' };
    vi.stubGlobal('window', { location });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Invalid email or password' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(
      api.post('/auth/login', {
        identifier: 'invalid-user',
        password: 'invalid-password',
        client_mode: 'staff',
      }),
    ).rejects.toMatchObject({ status: 401, detail: 'Invalid email or password' });

    expect(location.href).toBe('/login');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
