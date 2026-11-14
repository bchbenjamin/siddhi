/**
 * Siddhi API client
 * - Sends credentials (cookies) on every request
 * - Handles 401 → redirect to /login
 * - Normalises error shape
 */

// Keep API calls same-origin so browser requests never require CORS.
const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response, path: string): Promise<T> {
  if (res.ok) {
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined as T;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return res.json() as Promise<T>;
    }
    // binary / other
    return res.blob() as unknown as T;
  }

  if (res.status === 401 && path !== '/auth/login') {
    // The login page intentionally calls /auth/me without a session.
    // Redirect only when an authenticated page loses its session.
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Session expired');
  }

  let detail = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') {
      detail = body.detail;
    } else if (Array.isArray(body.detail)) {
      detail = body.detail.map((d: { msg: string }) => d.msg).join('; ');
    }
  } catch {
    // ignore JSON parse failure
  }
  throw new ApiError(res.status, detail);
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.pathname + url.search;
}

async function request<T>(path: string, opts: RequestOptions = {}, allowRefresh = true): Promise<T> {
  const { body, params, headers = {}, ...rest } = opts;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  let finalBody: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData) {
      finalBody = body;
    } else {
      finalBody = JSON.stringify(body);
      finalHeaders['Content-Type'] = 'application/json';
    }
  }

  const url = buildUrl(path, params);
  const res = await fetch(url, {
    credentials: 'include',
    headers: finalHeaders,
    body: finalBody,
    ...rest,
  });

  if (res.status === 401 && allowRefresh && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshResponse = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshResponse.ok) {
      return request<T>(path, opts, false);
    }
  }
  return handleResponse<T>(res, path);
}

export const api = {
  get: <T>(path: string, params?: RequestOptions['params']) =>
    request<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),

  postBlob: (path: string, body?: unknown): Promise<Blob> =>
    request<Blob>(path, { method: 'POST', body }),
};

// Convenience: download a blob as a file
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
