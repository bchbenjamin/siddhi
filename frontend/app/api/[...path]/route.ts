import { NextRequest, NextResponse } from 'next/server';
import { currentUser, login, logout, refreshSession } from '../../../lib/server/auth';
import { cookies } from 'next/headers';

type RouteContext = { params: Promise<{ path: string[] }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const path = (await context.params).path;
  if (path.join('/') === 'v1/auth/login') {
    const body = await request.json();
    const result = await login(body.identifier, body.password, body.client_mode || 'staff');
    return result
      ? NextResponse.json(result)
      : NextResponse.json({ detail: 'Invalid email or password' }, { status: 401 });
  }
  if (path.join('/') === 'v1/auth/logout') {
    await logout();
    return NextResponse.json({ message: 'Successfully logged out' });
  }
  if (path.join('/') === 'v1/auth/refresh') {
    const refreshed = await refreshSession((await cookies()).get('refresh_token')?.value);
    return refreshed
      ? NextResponse.json({ access_token: refreshed.accessToken, refresh_token: refreshed.refreshToken, token_type: 'bearer' })
      : NextResponse.json({ detail: 'Invalid or expired session' }, { status: 401 });
  }
  return NextResponse.json({ detail: 'This endpoint has not yet been migrated to Next.js.' }, { status: 501 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const path = (await context.params).path;
  if (path.join('/') === 'v1/auth/me') {
    const user = await currentUser();
    return user
      ? NextResponse.json(user)
      : NextResponse.json({ detail: 'Authentication required' }, { status: 401 });
  }
  return NextResponse.json({ detail: 'This endpoint has not yet been migrated to Next.js.' }, { status: 501 });
}
