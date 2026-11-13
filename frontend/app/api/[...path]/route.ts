import { NextRequest, NextResponse } from 'next/server';

async function proxy(request: NextRequest, path: string[]) {
  const backendOrigin =
    process.env.BACKEND_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : undefined);
  if (!backendOrigin) {
    return NextResponse.json(
      { detail: 'BACKEND_URL is not configured for the Next.js API bridge.' },
      { status: 500 },
    );
  }

  const target = new URL(`/api/${path.join('/')}`, backendOrigin);
  target.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    redirect: 'manual',
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-length');
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}
