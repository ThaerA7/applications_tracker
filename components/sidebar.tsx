// components/Sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { loadApplied } from "@/lib/storage/applied";
import { loadInterviews } from "@/lib/storage/interviews";
import { loadWithdrawn } from "@/lib/storage/withdrawn";
import { loadRejected } from "@/lib/storage/rejected";
import { loadOffers } from "@/lib/storage/offers";

type Item = {
  href: string;
  label: string;
  icon: string; // path under /public
};

const items: Item[] = [
  { href: "/", label: "Overview", icon: "/icons/home.png" },
  { href: "/job-search", label: "Job Search", icon: "/icons/briefcase.png" },
  { href: "/offers-received", label: "Offers", icon: "/icons/accepted.png" },
  { href: "/applied", label: "Applied", icon: "/icons/checklist.png" },
  { href: "/interviews", label: "Interviews", icon: "/icons/interview.png" },
  { href: "/rejected", label: "Rejected", icon: "/icons/cancel.png" },
  { href: "/withdrawn", label: "Withdrawn", icon: "/icons/withdrawn.png" },
  // bottom cluster in this exact order:
  { href: "/wishlist", label: "Wishlist", icon: "/icons/star.png" },
  { href: "/notes", label: "Notes", icon: "/icons/note.png" },
  { href: "/calendar", label: "Calendar", icon: "/icons/calendar.png" },
  { href: "/settings", label: "Settings", icon: "/icons/settings.png" },
];

const WISHLIST_STORAGE_KEY = "job-wishlist-v1";
const NOTES_STORAGE_KEY = "job-tracker:notes";

const COUNTS_EVENT = "job-tracker:refresh-counts";

type SidebarProps = {
  collapsed: boolean;
};

export default function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const widthClass = collapsed ? "w-20" : "w-64";

  const [appliedCount, setAppliedCount] = useState<number | null>(null);
  const [interviewsCount, setInterviewsCount] = useState<number | null>(null);
  const [offersCount, setOffersCount] = useState<number | null>(null);
  const [rejectedCount, setRejectedCount] = useState<number | null>(null);
  const [withdrawnCount, setWithdrawnCount] = useState<number | null>(null);
  const [wishlistCount, setWishlistCount] = useState<number | null>(null);
  const [notesCount, setNotesCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    const refreshCounts = async () => {
      // Applied (Supabase or guest)
      try {
        const { items } = await loadApplied();
        if (alive) setAppliedCount(items.length);
      } catch (err) {
        console.error("Failed to load applied applications count", err);
        if (alive) setAppliedCount(0);
      }

      // Interviews (Supabase or guest)
      try {
        const { items } = await loadInterviews();
        if (alive) setInterviewsCount(items.length);
      } catch (err) {
        console.error("Failed to load interviews count", err);
        if (alive) setInterviewsCount(0);
      }

      // Withdrawn (Supabase or guest)
      try {
        const { items } = await loadWithdrawn();
        if (alive) setWithdrawnCount(items.length);
      } catch (err) {
        console.error("Failed to load withdrawn count", err);
        if (alive) setWithdrawnCount(0);
      }

      // Rejected (Supabase or guest)
      try {
        const { items } = await loadRejected();
        if (alive) setRejectedCount(items.length);
      } catch (err) {
        console.error("Failed to load rejected count", err);
        if (alive) setRejectedCount(0);
      }

      // Offers (Supabase or guest)
      try {
        const { items } = await loadOffers();
        if (alive) setOffersCount(items.length);
      } catch (err) {
        console.error("Failed to load offers count", err);
        if (alive) setOffersCount(0);
      }

      // Everything below is purely localStorage for now
      if (typeof window === "undefined") return;

      try {
        const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!alive) return;
        setWishlistCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch (err) {
        console.error("Failed to load wishlist count", err);
        if (alive) setWishlistCount(0);
      }

      try {
        const raw = window.localStorage.getItem(NOTES_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!alive) return;
        setNotesCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch (err) {
        console.error("Failed to load notes count", err);
        if (alive) setNotesCount(0);
      }
    };

    void refreshCounts();

    const handler = () => {
      void refreshCounts();
    };

    if (typeof window !== "undefined") {
      window.addEventListener(COUNTS_EVENT, handler);
    }

    return () => {
      alive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(COUNTS_EVENT, handler);
      }
    };
  }, []);

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-50 border-r border-neutral-800 bg-black shadow-2xl shadow-black/40",
        "transition-[width] duration-200 ease-out",
        widthClass,
      ].join(" ")}
    >
      {/* Brand */}
      <div className="flex items-center justify-center border-b border-neutral-800 overflow-visible px-4 py-2">
        <Link
          href="/"
          aria-label="Application Tracker"
          className="group inline-flex items-center gap-2"
        >
          <Image
            src="/icons/site_logo.png"
            alt="Application Tracker logo"
            width={75}
            height={75}
            priority
            className="block shrink-0 rounded-md transition-transform group-hover:scale-105"
          />
          {!collapsed && (
            <span className="leading-tight text-white font-bold">
              <span className="block uppercase tracking-widest">
                Application
              </span>
              <span className="block uppercase tracking-widest">
                Tracker
              </span>
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="p-3">
        <ul className="space-y-1">
          {items.map(({ href, label, icon }) => {
            const active = pathname === href;
            const isAppliedItem = href === "/applied";
            const isInterviewsItem = href === "/interviews";
            const isOffersItem = href === "/offers-received";
            const isRejectedItem = href === "/rejected";
            const isWithdrawnItem = href === "/withdrawn";
            const isWishlistItem = href === "/wishlist";
            const isNotesItem = href === "/notes";

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? label : undefined}
                  className={[
                    "group flex items-center rounded-md px-3 py-2 text-[1.09375rem] transition",
                    collapsed ? "justify-center" : "gap-3",
                    active
                      ? "bg-white text-black"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <div
                    className={
                      collapsed
                        ? "flex items-center"
                        : "flex items-center gap-3 flex-1"
                    }
                  >
                    <Image
                      src={icon}
                      alt=""
                      width={35}
                      height={35}
                      aria-hidden="true"
                      className="shrink-0 transition-transform group-hover:scale-110"
                    />
                    {!collapsed && (
                      <span className="font-medium">{label}</span>
                    )}
                  </div>

                  {/* Applied cards count */}
                  {!collapsed && isAppliedItem && appliedCount !== null && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                      {appliedCount}
                    </span>
                  )}

                  {/* Interviews total */}
                  {!collapsed &&
                    isInterviewsItem &&
                    interviewsCount !== null && (
                      <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                        {interviewsCount}
                      </span>
                    )}

                  {/* Offers total */}
                  {!collapsed && isOffersItem && offersCount !== null && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                      {offersCount}
                    </span>
                  )}

                  {/* Rejected total */}
                  {!collapsed && isRejectedItem && rejectedCount !== null && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                      {rejectedCount}
                    </span>
                  )}

                  {/* Withdrawn total */}
                  {!collapsed &&
                    isWithdrawnItem &&
                    withdrawnCount !== null && (
                      <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                        {withdrawnCount}
                      </span>
                    )}

                  {/* Wishlist total */}
                  {!collapsed && isWishlistItem && wishlistCount !== null && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                      {wishlistCount}
                    </span>
                  )}

                  {/* Notes total */}
                  {!collapsed && isNotesItem && notesCount !== null && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                      {notesCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 w-full border-t border-neutral-800 p-3 text-[0.9375rem] text-zinc-500">
        {!collapsed && <span>v0.1</span>}
      </div>
    </aside>
  );
}
