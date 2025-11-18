// components/sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

type Item = {
  href: string;
  label: string;
  icon: string; // path under /public
};

const items: Item[] = [
  { href: '/',           label: 'Overview',  icon: '/icons/home.png' },
  { href: '/offers',     label: 'Offers',    icon: '/icons/briefcase.png' },
  { href: '/applied',    label: 'Applied',   icon: '/icons/checklist.png' },
  { href: '/interviews', label: 'Interviews',icon: '/icons/interview.png' },
  { href: '/rejected',   label: 'Rejected',  icon: '/icons/cancel.png' },
  { href: '/wishlist',   label: 'Wishlist',  icon: '/icons/star.png' },
  { href: '/calendar',   label: 'Calendar',  icon: '/icons/calendar.png' },
  { href: '/notes',      label: 'Notes',     icon: '/icons/note.png' },
  { href: '/settings',   label: 'Settings',  icon: '/icons/settings.png' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-neutral-800 bg-black shadow-2xl shadow-black/40">
      {/* Brand */}
      <div className="flex items-center justify-center border-b border-neutral-800 overflow-visible px-4 py-2">
        <Link href="/" aria-label="Application Tracker" className="group inline-flex items-center gap-2">
          <Image
            src="/icons/site_logo.png"
            alt="Application Tracker logo"
            width={75}
            height={75}
            priority
            className="block shrink-0 rounded-md transition-transform group-hover:scale-105"
          />
          <span className="leading-tight text-white font-bold">
            <span className="block uppercase tracking-widest">Application</span>
            <span className="block uppercase tracking-widest">Tracker</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="p-3">
        <ul className="space-y-1">
          {items.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2 text-[1.09375rem] transition
                    ${active ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10 hover:text-white'}`}
                >
                  <Image
                    src={icon}
                    alt=""
                    width={35}
                    height={35}
                    aria-hidden="true"
                    className="shrink-0 transition-transform group-hover:scale-110"
                  />
                  <span className="font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="absolute bottom-0 w-full border-t border-neutral-800 p-3 text-[0.9375rem] text-zinc-500">
        v0.1
      </div>
    </aside>
  );
}
