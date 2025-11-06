// components/topbar.tsx
'use client';

import { usePathname } from 'next/navigation';
import {
  Home,
  ClipboardList,
  CalendarCheck,
  Briefcase,
  XCircle,
  Star,
  StickyNote,
  Settings,
  LogOut,
} from 'lucide-react';

type RouteMeta = {
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const ROUTES: Record<string, RouteMeta> = {
  '/': { title: 'Overview', Icon: Home },
  '/applied': { title: 'Applied', Icon: ClipboardList },
  '/interviews': { title: 'Interviews', Icon: CalendarCheck },
  '/offers': { title: 'Offers', Icon: Briefcase },
  '/rejected': { title: 'Rejected', Icon: XCircle },
  '/wishlist': { title: 'Wishlist', Icon: Star },
  '/notes': { title: 'Notes', Icon: StickyNote },
  '/settings': { title: 'Settings', Icon: Settings },
};

export default function TopBar() {
  const pathname = usePathname();
  const { title, Icon } = ROUTES[pathname] ?? ROUTES['/'];

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="w-full h-14 px-10 flex items-center justify-between">
        {/* Left: icon + page title */}
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-neutral-500" aria-hidden="true" />
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        {/* Right: avatar + red "Log out" with icon */}
        <div className="flex items-center gap-3">
          <div
            className="grid h-8 w-8 place-items-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-700 ring-1 ring-neutral-300"
            aria-label="User avatar"
          >
            T
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 font-medium text-red-600 hover:text-red-700"
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
