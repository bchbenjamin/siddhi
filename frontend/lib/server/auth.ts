import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import argon2 from 'argon2';
import { Pool, type QueryResultRow } from 'pg';

const ACCESS_TOKEN_MINUTES = Number(process.env.ACCESS_TOKEN_MINUTES || 20);
const REFRESH_DAYS = Number(process.env.SESSION_REFRESH_DAYS || 7);
const secret = new TextEncoder().encode(process.env.SECRET_KEY);

let pool: Pool | undefined;

export function database() {
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

async function profile(user: UserRow, preferredRole?: string, preferredSchoolId?: string) {
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
    preferredRole
      ? memberships.rows.find((membership) => membership.role === preferredRole && (!preferredSchoolId || membership.school_id === preferredSchoolId)) ?? memberships.rows.find((membership) => membership.role === preferredRole) ?? memberships.rows[0]
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
  cookieStore.set('active_role', selectedProfile.active_role, tokenCookieOptions(REFRESH_DAYS * 86400));
  cookieStore.set('active_school_id', selectedProfile.active_school_id, tokenCookieOptions(REFRESH_DAYS * 86400));
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
    return profile(user, typeof payload.role === 'string' ? payload.role : undefined, typeof payload.school_id === 'string' ? payload.school_id : undefined);
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
  const cookieStore = await cookies();
  const selectedProfile = await profile(user, cookieStore.get('active_role')?.value, cookieStore.get('active_school_id')?.value);
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
  cookieStore.set('access_token', accessToken, tokenCookieOptions(ACCESS_TOKEN_MINUTES * 60));
  cookieStore.set('refresh_token', newRefreshToken, tokenCookieOptions(REFRESH_DAYS * 86400));
  cookieStore.set('active_role', selectedProfile.active_role, tokenCookieOptions(REFRESH_DAYS * 86400));
  cookieStore.set('active_school_id', selectedProfile.active_school_id, tokenCookieOptions(REFRESH_DAYS * 86400));
  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;
  try {
    if (refreshToken) {
      await database().query('UPDATE user_sessions SET revoked_at=NOW() WHERE refresh_token_hash=$1 AND revoked_at IS NULL', [hashToken(refreshToken)]);
    }
  } finally {
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    cookieStore.delete('active_role');
    cookieStore.delete('active_school_id');
  }
}

export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();
  const result = await database().query<{ id: string; email: string }>(
    'SELECT id,email FROM users WHERE email=$1 AND is_active=TRUE LIMIT 1', [normalized],
  );
  const user = result.rows[0];
  if (user) {
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    await database().query(
      'INSERT INTO password_reset_tokens (id,user_id,token_hash,expires_at,created_at) VALUES ($1,$2,$3,$4,$5)',
      [randomUUID(), user.id, hashToken(token), new Date(now.getTime() + 2 * 60 * 60 * 1000), now],
    );
    const resetUrl = `${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}/reset-password?token=${token}`;
    if (process.env.SMTP_HOST && process.env.SMTP_FROM) {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: process.env.SMTP_USERNAME ? { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD } : undefined,
      });
      try {
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: 'Reset your Siddhi password',
          text: `Use this link to reset your Siddhi password. It expires in two hours: ${resetUrl}`,
          html: `<p>Use the link below to reset your Siddhi password. It expires in two hours.</p><p><a href="${resetUrl}">Reset password</a></p>`,
        });
      } catch (error) { console.error('[password-reset] SMTP delivery failed', error); }
    } else if (process.env.NODE_ENV !== 'production') {
      console.info(`[DEV PASSWORD RESET] ${resetUrl}`);
    } else {
      console.error('[password-reset] SMTP is not configured; reset email could not be delivered.');
    }
  }
  return { message: 'If this email address exists in the system, password reset instructions have been sent.' };
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) { const error = new Error('Password must be at least 8 characters long.') as Error & { status: number }; error.status = 400; throw error; }
  const result = await database().query<{ id: string; user_id: string }>(
    `SELECT id,user_id FROM password_reset_tokens
     WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() LIMIT 1`,
    [hashToken(token)],
  );
  const reset = result.rows[0];
  if (!reset) { const error = new Error('Invalid or expired password reset token.') as Error & { status: number }; error.status = 400; throw error; }
  const passwordHash = await argon2.hash(newPassword);
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2 AND is_active=TRUE', [passwordHash, reset.user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1', [reset.id]);
    await client.query('UPDATE user_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [reset.user_id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  return { message: 'Password reset successfully.' };
}

export async function selectRole(role: string, schoolId?: string) {
  const actor = await currentUser();
  if (!actor) return null;
  const membership = await database().query<{ school_id: string }>(
    'SELECT school_id FROM school_memberships WHERE user_id=$1 AND role=$2 AND is_active=TRUE AND ($3::uuid IS NULL OR school_id=$3) ORDER BY created_at LIMIT 1',
    [actor.id, role, schoolId || null],
  );
  const selected = membership.rows[0];
  if (!selected) return null;
  const accessToken = await new SignJWT({ school_id: selected.school_id, role })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(actor.id).setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_MINUTES}m`).sign(secret);
  const cookieStore = await cookies();
  cookieStore.set('access_token', accessToken, tokenCookieOptions(ACCESS_TOKEN_MINUTES * 60));
  cookieStore.set('active_role', role, tokenCookieOptions(REFRESH_DAYS * 86400));
  cookieStore.set('active_school_id', selected.school_id, tokenCookieOptions(REFRESH_DAYS * 86400));
  const result = await database().query<UserRow>(
    'SELECT id,faculty_id,email,password_hash,full_name,phone,is_active FROM users WHERE id=$1',[actor.id],
  );
  return profile(result.rows[0], role, selected.school_id);
}
