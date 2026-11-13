import React, { useState } from 'react';
import { Sidebar, MobileTopBar } from './Sidebar';

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-paper-white">
      <Sidebar />

      {/* Mobile nav overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar onMenuOpen={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-6 max-w-screen-xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
