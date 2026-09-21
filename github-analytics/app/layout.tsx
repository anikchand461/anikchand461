import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GitHub Analytics',
  description: 'A frontend-only analytics dashboard for a GitHub profile.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0d1117' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
