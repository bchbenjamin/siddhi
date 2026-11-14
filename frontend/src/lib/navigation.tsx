'use client';

import React from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';

export function useNavigate() {
  const router = useRouter();
  return React.useCallback((path: string, options?: { replace?: boolean }) => options?.replace ? router.replace(path) : router.push(path), [router]);
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  const pathname = usePathname();
  const match = pathname.match(/^\/students\/([^/]+)/);
  return ({ studentId: match?.[1] } as unknown as T);
}

export function useLocation() {
  return { pathname: usePathname() };
}

export function useSearchParams() {
  const params = useNextSearchParams();
  return [params, (_next: URLSearchParams) => undefined] as const;
}

export function Link({ to, children, ...props }: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; children: React.ReactNode }) {
  return <NextLink href={to} {...props}>{children}</NextLink>;
}

export function NavLink({ to, children, className, ...props }: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className'> & { to: string; children: React.ReactNode; className?: string | ((state: { isActive: boolean }) => string) }) {
  const pathname = usePathname();
  const isActive = pathname === to || (to !== '/' && pathname.startsWith(`${to}/`));
  const resolved = typeof className === 'function' ? className({ isActive }) : className;
  return <NextLink href={to} className={resolved} aria-current={isActive ? 'page' : undefined} {...props}>{children}</NextLink>;
}

export function Navigate({ to, replace = false }: { to: string; replace?: boolean; state?: unknown }) {
  const router = useRouter();
  React.useEffect(() => { if (replace) router.replace(to); else router.push(to); }, [router, to, replace]);
  return null;
}
