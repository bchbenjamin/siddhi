import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import argon2 from 'argon2';
import { Pool, type QueryResultRow } from 'pg';

const ACCESS_TOKEN_MINUTES = Number(process.env.ACCESS_TOKEN_MINUTES || 20);
const REFRESH_DAYS = Number(process.env.SESSION_REFRESH_DAYS || 7);
const secret = new TextEncoder().encode(process.env.SECRET_KEY);

let pool: Pool | undefined;

function database() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return pool;
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function tokenCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

type UserRow = QueryResultRow & {
  id: string;
  faculty_id: string | null;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
};

async function profile(user: UserRow, preferredMode?: string) {
  const memberships = await database().query<
    QueryResultRow & { school_id: string; school_name: string; role: string; is_active: boolean }
  >(
    `SELECT m.school_id, s.name AS school_name, m.role, m.is_active
     FROM school_memberships m
     JOIN schools s ON s.id = m.school_id
     WHERE m.user_id = $1 AND m.is_active = TRUE
     ORDER BY m.created_at`,
    [user.id],
  );
  if (!memberships.rows.length) {
    throw new Error('User has no active school access.');
  }
  const selected =
    preferredMode === 'guardian'
      ? memberships.rows.find((membership) => membership.role === 'guardian') ?? memberships.rows[0]
      : memberships.rows[0];
  return {
    id: user.id,
    faculty_id: user.faculty_id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    active_role: selected.role,
    active_school_id: selected.school_id,
    roles: [...new Set(memberships.rows.filter((membership) => membership.school_id === selected.school_id).map((membership) => membership.role))],
    memberships: memberships.rows,
    landing_route: selected.role === 'guardian' ? '/guardian' : '/staff',
  };
}

export async function login(identifier: string, password: string, mode: string) {
  const column = mode === 'guardian' ? 'email' : 'faculty_id';
  const value = mode === 'guardian' ? identifier.trim().toLowerCase() : identifier.trim().toUpperCase();
  const result = await database().query<UserRow>(
    `SELECT id, faculty_id, email, password_hash, full_name, phone, is_active
     FROM users WHERE ${column} = $1 LIMIT 1`,
    [value],
  );
  const user = result.rows[0];
  if (!user || !user.is_active || !(await argon2.verify(user.password_hash, password))) {
    return null;
  }
  const selectedProfile = await profile(user, mode);
  const now = new Date();
  const accessToken = await new SignJWT({
    school_id: selectedProfile.active_school_id,
    role: selectedProfile.active_role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_MINUTES}m`)
    .sign(secret);
  const refreshToken = randomBytes(32).toString('base64url');
  await database().query(
    `INSERT INTO user_sessions (id, user_id, refresh_token_hash, expires_at, created_at, last_used_at)
     VALUES ($1, $2, $3, $4, $5, $5)`,
    [
      randomUUID(),
      user.id,
      hashToken(refreshToken),
      new Date(now.getTime() + REFRESH_DAYS * 86400000),
      now,
    ],
  );
  await database().query('UPDATE users SET last_login_at = $1 WHERE id = $2', [now, user.id]);
  const cookieStore = await cookies();
  cookieStore.set('access_token', accessToken, tokenCookieOptions(ACCESS_TOKEN_MINUTES * 60));
  cookieStore.set('refresh_token', refreshToken, tokenCookieOptions(REFRESH_DAYS * 86400));
  return {
    token: {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: ACCESS_TOKEN_MINUTES * 60,
      refresh_token: refreshToken,
    },
    user: selectedProfile,
  };
}

export async function currentUser() {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const result = await database().query<UserRow>(
      `SELECT id, faculty_id, email, password_hash, full_name, phone, is_active
       FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [payload.sub],
    );
    const user = result.rows[0];
    if (!user) return null;
    return profile(user, payload.role === 'guardian' ? 'guardian' : 'staff');
  } catch {
    return null;
  }
}

export async function refreshSession(rawRefreshToken: string | undefined) {
  if (!rawRefreshToken) return null;
  const result = await database().query<
    QueryResultRow & {
      id: string;
      user_id: string;
      expires_at: Date;
    }
  >(
    `SELECT id, user_id, expires_at
     FROM user_sessions
     WHERE refresh_token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [hashToken(rawRefreshToken)],
  );
  const session = result.rows[0];
  if (!session) return null;
  const userResult = await database().query<UserRow>(
    `SELECT id, faculty_id, email, password_hash, full_name, phone, is_active
     FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [session.user_id],
  );
  const user = userResult.rows[0];
  if (!user) return null;
  const selectedProfile = await profile(user);
  const now = new Date();
  const accessToken = await new SignJWT({
    school_id: selectedProfile.active_school_id,
    role: selectedProfile.active_role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_MINUTES}m`)
    .sign(secret);
  const newRefreshToken = randomBytes(32).toString('base64url');
  await database().query(
    `UPDATE user_sessions
     SET refresh_token_hash = $1, last_used_at = $2
     WHERE id = $3`,
    [hashToken(newRefreshToken), now, session.id],
  );
  const cookieStore = await cookies();
  cookieStore.set('access_token', accessToken, tokenCookieOptions(ACCESS_TOKEN_MINUTES * 60));
  cookieStore.set('refresh_token', newRefreshToken, tokenCookieOptions(REFRESH_DAYS * 86400));
  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}
