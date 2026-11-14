import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentUser } from './auth';
import { getData, requireActor } from './data';

vi.mock('./auth', () => ({
  currentUser: vi.fn(),
  database: vi.fn(),
}));

const currentUserMock = vi.mocked(currentUser);

afterEach(() => vi.resetAllMocks());

describe('Next.js data API authorization', () => {
  it('rejects unauthenticated data access before querying PostgreSQL', async () => {
    currentUserMock.mockResolvedValue(null);
    await expect(getData(['students'], new Request('https://siddhi.test/api/v1/students')))
      .rejects.toMatchObject({ status: 401, message: 'Authentication required' });
  });

  it('rejects a role that is not permitted before reaching the data query', async () => {
    currentUserMock.mockResolvedValue({
      id: 'guardian-user', faculty_id: null, email: 'guardian@example.test', full_name: 'Guardian', phone: null,
      active_role: 'guardian', active_school_id: 'school-1', roles: ['guardian'], memberships: [], landing_route: '/guardian',
    });
    await expect(requireActor(['school_admin']))
      .rejects.toMatchObject({ status: 403, message: 'This role is not permitted to perform this action' });
  });
});
