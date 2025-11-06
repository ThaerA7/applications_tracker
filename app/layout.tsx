// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import Sidebar from '@/components/sidebar';
import TopBar from '@/components/topbar'; // ⬅️ add this
import { Merriweather } from 'next/font/google';

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
    <html lang="en" className={`h-full ${merriweather.variable}`}>
      <body className="h-full bg-neutral-100 text-neutral-900 antialiased font-display">
        <Sidebar />
        <div className="min-h-screen pl-64">
          <TopBar />
          <main className="min-h-screen bg-white">
            {/* ⬇️ wider + 10 gap left/right */}
            <div className="w-full px-5 py-5">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
