// components/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, ClipboardList, CalendarCheck, Briefcase, XCircle, Star, StickyNote, Settings,
} from 'lucide-react';

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
};

const items: Item[] = [
  { href: '/',            label: 'Overview',   Icon: Home,          iconClass: 'text-slate-300' },
  { href: '/applied',     label: 'Applied',    Icon: ClipboardList, iconClass: 'text-sky-400' },
  { href: '/interviews',  label: 'Interviews', Icon: CalendarCheck, iconClass: 'text-emerald-400' },
  { href: '/offers',      label: 'Offers',     Icon: Briefcase,     iconClass: 'text-amber-400' },
  { href: '/rejected',    label: 'Rejected',   Icon: XCircle,       iconClass: 'text-rose-400' },
  { href: '/wishlist',    label: 'Wishlist',   Icon: Star,          iconClass: 'text-yellow-400' },
  { href: '/notes',       label: 'Notes',      Icon: StickyNote,    iconClass: 'text-violet-400' },
  { href: '/settings',    label: 'Settings',   Icon: Settings,      iconClass: 'text-zinc-400' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-neutral-800 bg-black">
      {/* Brand */}
      <div className="flex h-14 items-center border-b border-neutral-800 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-900 font-bold">
            AT
          </span>
          {/* Use Knewave */}
          <span className="text-zinc-100 font-display text-lg tracking-tight">
            Application Tracker
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="p-3">
        <ul className="space-y-1">
          {items.map(({ href, label, Icon, iconClass }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition
                    ${active ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon
                    className={`h-4 w-4 ${iconClass} ${active ? '' : 'group-hover:opacity-100'} opacity-100`}
                    aria-hidden="true"
                  />
                  <span className="font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="absolute bottom-0 w-full border-t border-neutral-800 p-3 text-xs text-zinc-500">
        v0.1
      </div>
    </aside>
  );
}
