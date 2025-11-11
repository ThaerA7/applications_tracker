// components/topbar.tsx
'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';

type RouteMeta = {
  title: string;
  icon: string; // path under /public
};

const ROUTES: Record<string, RouteMeta> = {
  '/':           { title: 'Overview',   icon: '/icons/home.png' },
  '/applied':    { title: 'Applied',    icon: '/icons/checklist.png' },
  '/interviews': { title: 'Interviews', icon: '/icons/interview.png' },
  '/offers':     { title: 'Offers',     icon: '/icons/briefcase.png' },
  '/rejected':   { title: 'Rejected',   icon: '/icons/cancel.png' },
  '/wishlist':   { title: 'Wishlist',   icon: '/icons/star.png' },
  '/notes':      { title: 'Notes',      icon: '/icons/note.png' },
  '/settings':   { title: 'Settings',   icon: '/icons/settings.png' },
};

// Per-route accent (kept simple; only washFrom is used below)
type Accent = {
  washFrom: string;
  barFrom: string;
  barTo: string;
  focus: string;
};

const ACCENTS: Record<string, Accent> = {
  '/':           { washFrom: 'from-sky-50',     barFrom: 'after:from-sky-500',     barTo: 'after:to-sky-400',     focus: 'focus-visible:ring-sky-300' },
  '/applied':    { washFrom: 'from-sky-50',     barFrom: 'after:from-sky-500',     barTo: 'after:to-fuchsia-500', focus: 'focus-visible:ring-sky-300' },
  '/interviews': { washFrom: 'from-emerald-50', barFrom: 'after:from-emerald-500', barTo: 'after:to-teal-500',    focus: 'focus-visible:ring-emerald-300' },
  '/offers':     { washFrom: 'from-amber-50',   barFrom: 'after:from-amber-500',   barTo: 'after:to-orange-500',  focus: 'focus-visible:ring-amber-300' },
  '/rejected':   { washFrom: 'from-rose-50',    barFrom: 'after:from-rose-500',    barTo: 'after:to-pink-500',    focus: 'focus-visible:ring-rose-300' },
  '/wishlist':   { washFrom: 'from-violet-50',  barFrom: 'after:from-violet-500',  barTo: 'after:to-fuchsia-500', focus: 'focus-visible:ring-violet-300' },
  '/notes':      { washFrom: 'from-fuchsia-50', barFrom: 'after:from-fuchsia-500', barTo: 'after:to-violet-500',  focus: 'focus-visible:ring-fuchsia-300' },
  '/settings':   { washFrom: 'from-slate-50',   barFrom: 'after:from-slate-500',   barTo: 'after:to-neutral-500', focus: 'focus-visible:ring-slate-300' },
};

export default function TopBar() {
  const pathname = usePathname();

  // Longest-prefix match so nested routes still get the right accent
  const activeKey =
    Object.keys(ROUTES)
      .sort((a, b) => b.length - a.length)
      .find((key) => pathname.startsWith(key)) || '/';

  const { title, icon } = ROUTES[activeKey];
  const accent = ACCENTS[activeKey];

  return (
    <header
      className={[
        'sticky top-0 z-40 shadow-lg',
        'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60',
        'relative bg-gradient-to-r to-transparent',
        accent.washFrom,
      ].join(' ')}
    >
      <div className="w-full h-14 px-10 flex items-center justify-between">
        {/* Left: colorful icon + page title */}
        <div className="flex items-center gap-2">
          <Image
            src={icon}
            alt=""
            width={35}
            height={35}
            aria-hidden="true"
            className="shrink-0 select-none"
          />
          <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
        </div>

        {/* Right: avatar + glassy logout with colorful icon */}
        <div className="flex items-center gap-3">
          <div
            className="grid h-8 w-8 place-items-center rounded-full bg-neutral-200/80 text-sm font-semibold text-neutral-700 ring-1 ring-neutral-300"
            aria-label="User avatar"
          >
            T
          </div>
          <button
            type="button"
            className={[
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
              'text-red-600 hover:text-red-700',
              'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60',
              'border border-red-200/60 shadow-sm',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-300',
            ].join(' ')}
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
