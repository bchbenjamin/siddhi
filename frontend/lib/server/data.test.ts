import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentUser, database } from './auth';
import { getData, postData, requireActor } from './data';

vi.mock('./auth', () => ({
  currentUser: vi.fn(),
  database: vi.fn(),
}));

const currentUserMock = vi.mocked(currentUser);
const databaseMock = vi.mocked(database);

function actor(role: string) {
  return { id: 'user-1', faculty_id: 'FAC-1', email: 'user@example.test', full_name: 'Test User', phone: null, active_role: role, active_school_id: 'school-1', roles: [role], memberships: [], landing_route: '/staff' };
}

afterEach(() => vi.resetAllMocks());

describe('Next.js data API authorization', () => {
  it('rejects unauthenticated data access before querying PostgreSQL', async () => {
    currentUserMock.mockResolvedValue(null);
    await expect(getData(['students'], new Request('https://siddhi.test/api/v1/students')))
      .rejects.toMatchObject({ status: 401, message: 'Authentication required' });
  });

  it('rejects a role that is not permitted before reaching the data query', async () => {
    currentUserMock.mockResolvedValue(actor('guardian'));
    await expect(requireActor(['school_admin']))
      .rejects.toMatchObject({ status: 403, message: 'This role is not permitted to perform this action' });
  });

  it('rejects future attendance dates before writing to PostgreSQL', async () => {
    currentUserMock.mockResolvedValue(actor('school_admin'));
    const query = vi.fn();
    databaseMock.mockReturnValue({ query } as never);
    await expect(postData(['attendance'], { student_id: 'student-1', attendance_date: '2999-01-01', status: 'present' }))
      .rejects.toMatchObject({ status: 400, message: 'Attendance date cannot be in the future' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects reversed attendance filter ranges before querying PostgreSQL', async () => {
    currentUserMock.mockResolvedValue(actor('school_admin'));
    const query = vi.fn();
    databaseMock.mockReturnValue({ query } as never);
    const request = new Request('https://siddhi.test/api/v1/attendance?from_date=2020-01-02&to_date=2020-01-01');
    await expect(getData(['attendance'], request))
      .rejects.toMatchObject({ status: 400, message: 'Date range: From date must be on or before To date' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects therapy durations above eight hours', async () => {
    currentUserMock.mockResolvedValue(actor('therapist'));
    const query = vi.fn();
    databaseMock.mockReturnValue({ query } as never);
    await expect(postData(['students', 'student-1', 'therapy-sessions'], {
      therapy_type: 'other', session_date: '2020-01-01', duration_minutes: 10000000, progress_notes: 'Test',
    })).rejects.toMatchObject({ status: 400, message: 'Duration must be between 1 and 480 minutes (8 hours)' });
    expect(query).not.toHaveBeenCalled();
  });
  it('includes historical guardian-null interactions for a linked guardian', async () => {
    currentUserMock.mockResolvedValue(actor('guardian'));
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'student-1', school_id: 'school-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ linked: true }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'interaction-1', guardian_user_id: null }], rowCount: 1 });
    databaseMock.mockReturnValue({ query } as never);
    const result = await getData(['students', 'student-1', 'parent-interactions'], new Request('https://siddhi.test/api/v1/students/student-1/parent-interactions'));
    expect(result).toHaveLength(1);
    expect(query.mock.calls[2][0]).toContain('i.guardian_user_id IS NULL');
  });

  it('allows only a linked guardian to request the stored full UDID', async () => {
    currentUserMock.mockResolvedValue(actor('guardian'));
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'student-1', school_id: 'school-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ linked: true }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ udid_number_encrypted: 'stored-value' }], rowCount: 1 });
    databaseMock.mockReturnValue({ query } as never);
    const result = await getData(['students', 'student-1', 'udid'], new Request('https://siddhi.test/api/v1/students/student-1/udid'));
    expect(result).toEqual({ udid_number: 'stored-value' });
    expect(query.mock.calls[2][0]).toContain('udid_number_encrypted');
  });

  it('does not expose the full UDID endpoint to staff roles', async () => {
    currentUserMock.mockResolvedValue(actor('school_admin'));
    const query = vi.fn();
    databaseMock.mockReturnValue({ query } as never);
    await expect(getData(['students', 'student-1', 'udid'], new Request('https://siddhi.test/api/v1/students/student-1/udid')))
      .rejects.toMatchObject({ status: 403, message: 'Only the linked guardian can view the full UDID' });
    expect(query).not.toHaveBeenCalled();
  });

  it('lets a linked guardian acknowledge a historical interaction with no guardian id', async () => {
    currentUserMock.mockResolvedValue(actor('guardian'));
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ student_id: 'student-1', guardian_user_id: null }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'student-1', school_id: 'school-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ linked: true }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'interaction-1', acknowledgement_status: 'acknowledged' }], rowCount: 1 });
    databaseMock.mockReturnValue({ query } as never);
    const result = await postData(['parent-interactions', 'interaction-1', 'acknowledge'], {});
    expect(result.acknowledgement_status).toBe('acknowledged');
    expect(query.mock.calls[3][0]).toContain('guardian_user_id IS NULL');
  });

  it("returns only the authenticated student's own portal profile", async () => {
    currentUserMock.mockResolvedValue({ ...actor('student'), landing_route: '/student' });
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'student-1', full_name: 'Aarav Patel', admission_number: 'ADM-XXXX', grade_class: 'Grade 3-B' }], rowCount: 1 });
    databaseMock.mockReturnValue({ query } as never);
    const result = await getData(['student', 'me'], new Request('https://siddhi.test/api/v1/student/me'));
    expect(result.full_name).toBe('Aarav Patel');
    expect(query.mock.calls[0][0]).toContain('s.login_user_id=$1');
    expect(query.mock.calls[0][1]).toEqual(['user-1', 'school-1']);
  });

  it('prevents student accounts from listing the school roster', async () => {
    currentUserMock.mockResolvedValue({ ...actor('student'), landing_route: '/student' });
    const query = vi.fn();
    databaseMock.mockReturnValue({ query } as never);
    await expect(getData(['students'], new Request('https://siddhi.test/api/v1/students')))
      .rejects.toMatchObject({ status: 403, message: 'Student accounts can only access their own profile' });
    expect(query).not.toHaveBeenCalled();
  });

  it('keeps student accounts read-only', async () => {
    currentUserMock.mockResolvedValue({ ...actor('student'), landing_route: '/student' });
    const query = vi.fn();
    databaseMock.mockReturnValue({ query } as never);
    await expect(postData(['students', 'student-1', 'plop'], {}))
      .rejects.toMatchObject({ status: 403, message: 'Student accounts are read-only' });
    expect(query).not.toHaveBeenCalled();
  });

});
