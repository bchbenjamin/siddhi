'use client';

import dynamic from 'next/dynamic';

const LegacyApp = dynamic(() => import('../src/App'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-background" />,
});

export default function LegacyAppShell() {
  return <LegacyApp />;
}
