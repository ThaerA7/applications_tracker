"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { loadApplied } from "@/lib/storage/applied";

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

const INTERVIEWS_STORAGE_KEY = "job-tracker:interviews";
const OFFERS_RECEIVED_STORAGE_KEY = "job-tracker:offers-received";
const REJECTIONS_STORAGE_KEY = "job-tracker:rejected";
const WITHDRAWN_STORAGE_KEY = "job-tracker:withdrawn";
const WISHLIST_STORAGE_KEY = "job-wishlist-v1";
const NOTES_STORAGE_KEY = "job-tracker:notes";

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

    const initApplied = async () => {
      try {
        const { items } = await loadApplied();
        if (!alive) return;
        setAppliedCount(items.length);
      } catch (err) {
        console.error("Failed to load applied applications count", err);
      }
    };

    const initInterviews = () => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(INTERVIEWS_STORAGE_KEY);
        if (!alive) return;

        if (!raw) {
          setInterviewsCount(0);
          return;
        }

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setInterviewsCount(parsed.length);
        } else {
          setInterviewsCount(0);
        }
      } catch (err) {
        console.error("Failed to load interviews count", err);
        setInterviewsCount(0);
      }
    };

    const initOffers = () => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(OFFERS_RECEIVED_STORAGE_KEY);
        if (!alive) return;

        if (!raw) {
          setOffersCount(0);
          return;
        }

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setOffersCount(parsed.length);
        } else {
          setOffersCount(0);
        }
      } catch (err) {
        console.error("Failed to load offers count", err);
        setOffersCount(0);
      }
    };

    const initRejected = () => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(REJECTIONS_STORAGE_KEY);
        if (!alive) return;

        if (!raw) {
          setRejectedCount(0);
          return;
        }

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRejectedCount(parsed.length);
        } else {
          setRejectedCount(0);
        }
      } catch (err) {
        console.error("Failed to load rejected count", err);
        setRejectedCount(0);
      }
    };

    const initWithdrawn = () => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(WITHDRAWN_STORAGE_KEY);
        if (!alive) return;

        if (!raw) {
          setWithdrawnCount(0);
          return;
        }

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setWithdrawnCount(parsed.length);
        } else {
          setWithdrawnCount(0);
        }
      } catch (err) {
        console.error("Failed to load withdrawn count", err);
        setWithdrawnCount(0);
      }
    };

    const initWishlist = () => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
        if (!alive) return;

        if (!raw) {
          setWishlistCount(0);
          return;
        }

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setWishlistCount(parsed.length);
        } else {
          setWishlistCount(0);
        }
      } catch (err) {
        console.error("Failed to load wishlist count", err);
        setWishlistCount(0);
      }
    };

    const initNotes = () => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(NOTES_STORAGE_KEY);
        if (!alive) return;

        if (!raw) {
          setNotesCount(0);
          return;
        }

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setNotesCount(parsed.length);
        } else {
          setNotesCount(0);
        }
      } catch (err) {
        console.error("Failed to load notes count", err);
        setNotesCount(0);
      }
    };

    initApplied();
    initInterviews();
    initOffers();
    initRejected();
    initWithdrawn();
    initWishlist();
    initNotes();

    return () => {
      alive = false;
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
