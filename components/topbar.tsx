// components/topbar.tsx
"use client";

import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

type RouteMeta = {
  title: string;
};

const ROUTES: Record<string, RouteMeta> = {
  "/": { title: "Overview" },
  "/applied": { title: "Applied" },
  "/interviews": { title: "Interviews" },
  "/offers": { title: "Offers" },
  "/rejected": { title: "Rejected" },
  "/withdrawn": { title: "Withdrawn" },
  "/wishlist": { title: "Wishlist" },
  "/calendar": { title: "Calendar" },
  "/notes": { title: "Notes" },
  "/settings": { title: "Settings" },
};

type Accent = {
  washFrom: string;
  barFrom: string;
  barTo: string;
  focus: string;
};

const ACCENTS: Record<string, Accent> = {
  "/": {
    washFrom: "from-sky-50",
    barFrom: "after:from-sky-500",
    barTo: "after:to-sky-400",
    focus: "focus-visible:ring-sky-300",
  },
  "/applied": {
    washFrom: "from-sky-50",
    barFrom: "after:from-sky-500",
    barTo: "after:to-fuchsia-500",
    focus: "focus-visible:ring-sky-300",
  },
  "/interviews": {
    washFrom: "from-emerald-50",
    barFrom: "after:from-emerald-500",
    barTo: "after:to-teal-500",
    focus: "focus-visible:ring-emerald-300",
  },
  "/offers": {
    washFrom: "from-amber-50",
    barFrom: "after:from-amber-500",
    barTo: "after:to-orange-500",
    focus: "focus-visible:ring-amber-300",
  },
  "/rejected": {
    washFrom: "from-rose-50",
    barFrom: "after:from-rose-500",
    barTo: "after:to-pink-500",
    focus: "focus-visible:ring-rose-300",
  },
  "/withdrawn": {
    washFrom: "from-amber-50",
    barFrom: "after:from-amber-500",
    barTo: "after:to-rose-500",
    focus: "focus-visible:ring-amber-300",
  },
  "/wishlist": {
    washFrom: "from-yellow-50",
    barFrom: "after:from-yellow-500",
    barTo: "after:to-amber-400",
    focus: "focus-visible:ring-yellow-300",
  },
  "/calendar": {
    washFrom: "from-indigo-50",
    barFrom: "after:from-indigo-500",
    barTo: "after:to-sky-500",
    focus: "focus-visible:ring-indigo-300",
  },
  "/notes": {
    washFrom: "from-fuchsia-50",
    barFrom: "after:from-fuchsia-500",
    barTo: "after:to-violet-500",
    focus: "focus-visible:ring-fuchsia-300",
  },
  "/settings": {
    washFrom: "from-slate-50",
    barFrom: "after:from-slate-500",
    barTo: "after:to-neutral-500",
    focus: "focus-visible:ring-slate-300",
  },
};

type TopBarProps = {
  collapsed: boolean;
  onToggleSidebar: () => void;
};

export default function TopBar({ collapsed, onToggleSidebar }: TopBarProps) {
  const pathname = usePathname();

  const activeKey =
    Object.keys(ROUTES)
      .sort((a, b) => b.length - a.length)
      .find((key) => pathname.startsWith(key)) || "/";

  const { title } = ROUTES[activeKey];
  const accent = ACCENTS[activeKey];

  return (
    <header
      className={[
        "sticky top-0 z-40 shadow-lg",
        "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        "relative bg-gradient-to-r to-transparent",
        accent.washFrom,
      ].join(" ")}
    >
      {/* keep 5px padding left/right */}
      <div className="w-full h-14 pl-[15px] pr-[15px] flex items-center justify-between">
        {/* Left: collapse icon + title */}
        <div className="flex items-center gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={[
              // 🔹 no bg / border / shadow, just the icon
              "inline-flex items-center justify-center p-1.5",
              "text-neutral-700 hover:text-neutral-900",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300",
            ].join(" ")}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <h1 className="text-lg font-semibold text-neutral-900">
            {title}
          </h1>
        </div>

        {/* Right: avatar + logout */}
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
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              "text-red-600 hover:text-red-700",
              "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
              "border border-red-200/60 shadow-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-300",
            ].join(" ")}
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
