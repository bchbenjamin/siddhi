import React from 'react';
import { useAuth } from '../../app/AuthContext';
import { api } from '../../lib/api';

interface PageShellProps { children: React.ReactNode }

export function PageShell({ children }: PageShellProps) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-paper-white text-ink-black">
      <header className="w-full bg-paper-white">
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-6 flex items-center justify-between gap-4">
          <div className="font-medium text-ink-black tracking-[0.12em] text-sm uppercase">SIDDHI</div>
          {user && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden sm:block text-right min-w-0">
                <p className="text-sm text-ink-black truncate">{user.full_name}</p>
                <p className="text-xs text-mist-gray uppercase tracking-wide">{user.active_role.replace(/_/g, ' ')}</p>
              </div>
              {user.roles.length > 1 && (
                <select
                  aria-label="Switch workspace role"
                  value={user.active_role}
                  onChange={async (event) => {
                    await api.post('/auth/select-role', { role: event.target.value, school_id: user.active_school_id });
                    window.location.reload();
                  }}
                  className="max-w-40 text-xs border border-pale-sage rounded-full px-3 py-2 bg-white text-slate-gray"
                >
                  {user.roles.map((role) => <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>)}
                </select>
              )}
              <button onClick={() => logout()} className="text-sm text-ink-black underline underline-offset-4 hover:text-deep-violet">Sign out</button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-[1200px] mx-auto w-full px-6 md:px-8 pt-8 pb-16">
        {children}
      </main>
    </div>
  );
}
