import '@fontsource-variable/inter';
import '../src/styles/index.css';

export const metadata = {
  title: 'Siddhi — IEP Tracking Platform',
  description: 'Individualized Education Program tracking for schools and guardians.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
