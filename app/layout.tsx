import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'CallFlow AI - Voice AI Personal Assistant for Small Businesses',
  description: 'Automated missed-call workflows, AI voice assistant, and follow-up management for small businesses.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900 bg-slate-50 min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
