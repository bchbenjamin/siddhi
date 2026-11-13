import { NextRequest, NextResponse } from 'next/server';
import { currentUser, login, logout } from '../../../lib/server/auth';

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
