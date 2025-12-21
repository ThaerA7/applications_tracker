"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadApplied } from "@/lib/services/applied";
import { loadInterviews } from "@/lib/services/interviews";
import { loadWithdrawn } from "@/lib/services/withdrawn";
import { loadRejected } from "@/lib/services/rejected";
import { loadOffers } from "@/lib/services/offers";
import { loadWishlist } from "@/lib/services/wishlist";
import { loadNotes } from "@/lib/services/notes";

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
  // Bottom cluster (order matters).
  { href: "/wishlist", label: "Wishlist", icon: "/icons/star.png" },
  { href: "/notes", label: "Notes", icon: "/icons/note.png" },
  { href: "/calendar", label: "Calendar", icon: "/icons/calendar.png" },
  { href: "/settings", label: "Settings", icon: "/icons/settings.png" },
];

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
    const supabase = getSupabaseClient();

    const safeSet = (fn: () => void) => {
      if (alive) fn();
    };

    const len = (v: any) => (Array.isArray(v?.items) ? v.items.length : 0);

    const refreshCounts = async () => {
      // Run loads in parallel but guard against a hung Supabase/network call.
      const loads = [
        loadApplied(),
        loadInterviews(),
        loadWithdrawn(),
        loadRejected(),
        loadOffers(),
        loadWishlist(),
        loadNotes(),
      ];

      const timeout = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 5000),
      );

      const settled = (await Promise.race([
        Promise.allSettled(loads),
        timeout,
      ])) as PromiseSettledResult<any>[] | null;

      if (settled === null) {
        // Timeout: default to zeros so the UI doesn't remain blank.
        safeSet(() => setAppliedCount(0));
        safeSet(() => setInterviewsCount(0));
        safeSet(() => setWithdrawnCount(0));
        safeSet(() => setRejectedCount(0));
        safeSet(() => setOffersCount(0));
        safeSet(() => setWishlistCount(0));
        safeSet(() => setNotesCount(0));
        return;
      }

      const [
        appliedRes,
        interviewsRes,
        withdrawnRes,
        rejectedRes,
        offersRes,
        wishlistRes,
        notesRes,
      ] = settled;

      safeSet(() =>
        setAppliedCount(
          appliedRes.status === "fulfilled" ? len(appliedRes.value) : 0,
        ),
      );

      safeSet(() =>
        setInterviewsCount(
          interviewsRes.status === "fulfilled" ? len(interviewsRes.value) : 0,
        ),
      );

      safeSet(() =>
        setWithdrawnCount(
          withdrawnRes.status === "fulfilled" ? len(withdrawnRes.value) : 0,
        ),
      );

      safeSet(() =>
        setRejectedCount(
          rejectedRes.status === "fulfilled" ? len(rejectedRes.value) : 0,
        ),
      );

      safeSet(() =>
        setOffersCount(
          offersRes.status === "fulfilled" ? len(offersRes.value) : 0,
        ),
      );

      safeSet(() =>
        setWishlistCount(
          wishlistRes.status === "fulfilled" ? len(wishlistRes.value) : 0,
        ),
      );

      safeSet(() =>
        setNotesCount(notesRes.status === "fulfilled" ? len(notesRes.value) : 0),
      );
    };

    // Subscribe early to catch INITIAL_SESSION on hard refresh.
    const { data: sub } = supabase.auth.onAuthStateChange(
      () => {
        void refreshCounts();
      },
    );

    // Hydrate session, then refresh once (guarded by a short timeout).
    void (async () => {
      try {
        await Promise.race([
          supabase.auth.getSession(),
          new Promise((r) => setTimeout(r, 3000)),
        ]);
      } catch { }
      void refreshCounts();
    })();

    const handler = () => void refreshCounts();
    const onFocus = () => void refreshCounts();
    const onVis = () => {
      if (!document.hidden) refreshCounts();
    };

    window.addEventListener(COUNTS_EVENT, handler);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
      window.removeEventListener(COUNTS_EVENT, handler);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname]);

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
              <span className="block uppercase tracking-widest">Application</span>
              <span className="block uppercase tracking-widest">Tracker</span>
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
                    {!collapsed && <span className="font-medium">{label}</span>}
                  </div>

                  {!collapsed && isAppliedItem && appliedCount !== null && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                      {appliedCount ?? "…"}
                    </span>
                  )}

                  {!collapsed &&
                    isInterviewsItem &&
                    interviewsCount !== null && (
                      <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                        {interviewsCount ?? "…"}
                      </span>
                    )}

                  {!collapsed && isOffersItem && offersCount !== null && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                      {offersCount ?? "…"}
                    </span>
                  )}

                  {!collapsed && isRejectedItem && rejectedCount !== null && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                      {rejectedCount ?? "…"}
                    </span>
                  )}

                  {!collapsed &&
                    isWithdrawnItem &&
                    withdrawnCount !== null && (
                      <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                        {withdrawnCount ?? "…"}
                      </span>
                    )}

                  {!collapsed && isWishlistItem && wishlistCount !== null && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                      {wishlistCount ?? "…"}
                    </span>
                  )}

                  {!collapsed && isNotesItem && notesCount !== null && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                      {notesCount ?? "…"}
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
