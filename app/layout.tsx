// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Merriweather } from 'next/font/google';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Application Tracker',
  description: 'Track your applications, interviews, offers, and notes.',
};

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-display',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full text-[115%] ${merriweather.variable}`}>
      <body className="h-full bg-neutral-100 text-neutral-900 antialiased font-display">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
