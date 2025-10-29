// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import Sidebar from '@/components/sidebar';
import { Plus_Jakarta_Sans, Merriweather } from 'next/font/google';

export const metadata: Metadata = {
  title: 'Application Tracker',
  description: 'Track your applications, interviews, offers, and notes.',
};

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full } ${merriweather.variable}`}>
      <body className="h-full bg-neutral-100 text-neutral-900 antialiased font-display">
        <Sidebar />
        <div className="min-h-screen pl-64">
          <main className="min-h-screen bg-white">
            <div className="mx-auto w-full max-w-5xl px-6 py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
