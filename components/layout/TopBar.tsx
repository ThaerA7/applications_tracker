"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Search, UserRound, X } from "lucide-react";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";
import { loadApplied } from "@/lib/services/applied";
import { loadInterviews } from "@/lib/services/interviews";
import { loadNotes } from "@/lib/services/notes";
import { loadOffers } from "@/lib/services/offers";
import { loadRejected } from "@/lib/services/rejected";
import { loadWishlist } from "@/lib/services/wishlist";
import { loadWithdrawn } from "@/lib/services/withdrawn";

const ROUTES: Record<string, { title: string }> = {
  "/": { title: "Overview" },
  "/applied": { title: "Applied" },
  "/interviews": { title: "Interviews" },
  "/job-search": { title: "Job Search" },
  "/offers-received": { title: "Offers" },
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
  "/job-search": {
    washFrom: "from-amber-50",
    barFrom: "after:from-amber-500",
    barTo: "after:to-orange-500",
    focus: "focus-visible:ring-amber-300",
  },
  "/offers-received": {
    washFrom: "from-lime-50",
    barFrom: "after:from-lime-500",
    barTo: "after:to-emerald-500",
    focus: "focus-visible:ring-lime-300",
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
    washFrom: "from-indigo-50",
    barFrom: "after:from-indigo-500",
    barTo: "after:to-sky-500",
    focus: "focus-visible:ring-indigo-300",
  },
};

type SearchKind =
  | "applied"
  | "interviews"
  | "offers"
  | "rejected"
  | "withdrawn"
  | "wishlist"
  | "notes";

type SearchItem = {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
  searchText: string;
};

const SEARCH_SECTIONS: Array<{ kind: SearchKind; label: string; href: string }> = [
  { kind: "applied", label: "Applied", href: "/applied" },
  { kind: "interviews", label: "Interviews", href: "/interviews" },
  { kind: "offers", label: "Offers", href: "/offers-received" },
  { kind: "rejected", label: "Rejected", href: "/rejected" },
  { kind: "withdrawn", label: "Withdrawn", href: "/withdrawn" },
  { kind: "wishlist", label: "Wishlist", href: "/wishlist" },
  { kind: "notes", label: "Notes", href: "/notes" },
];

const SEARCH_RESULT_LIMIT = 40;
const SEARCH_SECTION_LIMIT = 6;

function buildSearchText(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => (part ?? "").toString().trim())
    .filter((part) => part.length > 0)
    .join(" ")
    .toLowerCase();
}

function makeSnippet(value: string | null | undefined, maxLength = 80) {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 3))}...`;
}

function buildFocusHref(base: string, id: string) {
  const params = new URLSearchParams({ focus: id });
  return `${base}?${params.toString()}`;
}

type TopBarProps = {
  collapsed: boolean;
  onToggleSidebar: () => void;
};

function ConfirmLogoutDialog({
  open,
  onClose,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // scroll lock
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />

      {/* Dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          className={[
            "relative w-full max-w-[520px]",
            "rounded-[22px] p-[1px]",
            "bg-gradient-to-br from-rose-200/70 via-orange-100/50 to-amber-100/60",
            "shadow-[0_20px_70px_-20px_rgba(0,0,0,0.35)]",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
            className={[
              "relative overflow-hidden rounded-[21px]",
              "bg-white ring-1 ring-black/5",
            ].join(" ")}
          >
            {/* Soft glow accents */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3
                    id="logout-title"
                    className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900"
                  >
                    Log out of your account?
                  </h3>

                  <p
                    id="logout-desc"
                    className="mt-2 text-sm sm:text-base text-neutral-600"
                  >
                    You’ll be signed out on this device. Your synced data will
                    remain safe in your account.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={!!busy}
                  className={[
                    "inline-flex items-center justify-center",
                    "rounded-xl px-4 py-2.5 text-sm font-medium",
                    "border border-neutral-200",
                    "bg-white hover:bg-neutral-50",
                    "text-neutral-900",
                    "shadow-sm",
                    "transition active:scale-[0.99]",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300",
                  ].join(" ")}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={!!busy}
                  className={[
                    "inline-flex items-center justify-center gap-2",
                    "rounded-xl px-4 py-2.5 text-sm font-semibold",
                    "bg-rose-600 text-white",
                    "hover:bg-rose-700",
                    "shadow-sm",
                    "transition active:scale-[0.99]",
                    "disabled:opacity-70 disabled:cursor-not-allowed",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300",
                  ].join(" ")}
                >
                  <LogOut className="h-4 w-4" />
                  {busy ? "Logging out..." : "Log out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopBar({ collapsed, onToggleSidebar }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeKey =
    Object.keys(ROUTES)
      .sort((a, b) => b.length - a.length)
      .find((key) => pathname.startsWith(key)) || "/";

  const { title } = ROUTES[activeKey];
  const accent = ACCENTS[activeKey];

  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Load session and subscribe to auth changes.
  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        if (!active) return;
        setUser(data.session?.user ?? null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      },
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadSearchIndex = async () => {
      setSearchLoading(true);
      try {
        const [
          appliedRes,
          interviewsRes,
          offersRes,
          rejectedRes,
          withdrawnRes,
          wishlistRes,
          notesRes,
        ] = await Promise.all([
          loadApplied(),
          loadInterviews(),
          loadOffers(),
          loadRejected(),
          loadWithdrawn(),
          loadWishlist(),
          loadNotes(),
        ]);

        if (!active) return;

        const next: SearchItem[] = [];

        next.push(
          ...appliedRes.items.map((item: any): SearchItem => {
            const company = String(item.company ?? "").trim();
            const role = String(item.role ?? "").trim();
            const location = String(item.location ?? "").trim();
            const status = String(item.status ?? "").trim();
            const notes = String(item.notes ?? "").trim();
            const title = company || "Untitled application";
            const subtitle = role || location || status || undefined;

            return {
              id: item.id,
              kind: "applied",
              title,
              subtitle,
              meta: location || status || undefined,
              href: buildFocusHref("/applied", item.id),
              searchText: buildSearchText([
                company,
                role,
                location,
                status,
                notes,
                item.contactPerson,
                item.contactEmail,
                item.contactPhone,
              ]),
            };
          })
        );

        next.push(
          ...interviewsRes.items.map((item: any): SearchItem => {
            const company = String(item.company ?? "").trim();
            const role = String(item.role ?? "").trim();
            const location = String(item.location ?? "").trim();
            const type = String(item.type ?? "").trim();
            const date = String(item.date ?? "").trim();
            const notes = String(item.notes ?? "").trim();
            const title = company || "Untitled interview";
            const subtitle = role || location || undefined;

            return {
              id: item.id,
              kind: "interviews",
              title,
              subtitle,
              meta: type || location || undefined,
              href: buildFocusHref("/interviews", item.id),
              searchText: buildSearchText([
                company,
                role,
                location,
                type,
                date,
                notes,
                item.contact?.name,
                item.contact?.email,
                item.contact?.phone,
              ]),
            };
          })
        );

        next.push(
          ...offersRes.items.map((item: any): SearchItem => {
            const company = String(item.company ?? "").trim();
            const role = String(item.role ?? "").trim();
            const location = String(item.location ?? "").trim();
            const salary = String(item.salary ?? "").trim();
            const notes = String(item.notes ?? "").trim();
            const title = company || "Untitled offer";
            const subtitle = role || location || undefined;

            return {
              id: item.id,
              kind: "offers",
              title,
              subtitle,
              meta: salary || undefined,
              href: buildFocusHref("/offers-received", item.id),
              searchText: buildSearchText([
                company,
                role,
                location,
                salary,
                notes,
                item.offerReceivedDate,
                item.offerAcceptedDate,
                item.offerDeclinedDate,
                item.decisionDate,
                item.employmentType,
              ]),
            };
          })
        );

        next.push(
          ...rejectedRes.items.map((item: any): SearchItem => {
            const company = String(item.company ?? "").trim();
            const role = String(item.role ?? "").trim();
            const location = String(item.location ?? "").trim();
            const reason = String(item.reason ?? "").trim();
            const notes = String(item.notes ?? "").trim();
            const title = company || "Untitled rejection";
            const subtitle = role || location || undefined;

            return {
              id: item.id,
              kind: "rejected",
              title,
              subtitle,
              meta: reason || undefined,
              href: buildFocusHref("/rejected", item.id),
              searchText: buildSearchText([
                company,
                role,
                location,
                reason,
                notes,
                item.rejectionType,
                item.decisionDate,
              ]),
            };
          })
        );

        next.push(
          ...withdrawnRes.items.map((item: any): SearchItem => {
            const company = String(item.company ?? "").trim();
            const role = String(item.role ?? "").trim();
            const location = String(item.location ?? "").trim();
            const reason = String(item.withdrawnReason ?? "").trim();
            const notes = String(item.notes ?? "").trim();
            const title = company || "Untitled withdrawn";
            const subtitle = role || location || undefined;

            return {
              id: item.id,
              kind: "withdrawn",
              title,
              subtitle,
              meta: reason || undefined,
              href: buildFocusHref("/withdrawn", item.id),
              searchText: buildSearchText([
                company,
                role,
                location,
                reason,
                notes,
                item.withdrawnDate,
                item.interviewDate,
                item.interviewType,
              ]),
            };
          })
        );

        next.push(
          ...wishlistRes.items.map((item: any): SearchItem => {
            const company = String(item.company ?? "").trim();
            const role = String(item.role ?? "").trim();
            const location = String(item.location ?? "").trim();
            const notes = String(item.notes ?? "").trim();
            const priority = String(item.priority ?? "").trim();
            const title = company || "Untitled wishlist";
            const subtitle = role || location || undefined;

            return {
              id: item.id,
              kind: "wishlist",
              title,
              subtitle,
              meta: priority || undefined,
              href: buildFocusHref("/wishlist", item.id),
              searchText: buildSearchText([
                company,
                role,
                location,
                priority,
                notes,
                item.offerType,
                item.website,
              ]),
            };
          })
        );

        next.push(
          ...notesRes.items.map((note: any): SearchItem => {
            const title = String(note.title ?? "").trim() || "Untitled note";
            const snippet = makeSnippet(note.content, 90);
            const tagText = Array.isArray(note.tags) ? note.tags.join(" ") : "";

            return {
              id: note.id,
              kind: "notes",
              title,
              subtitle: snippet || undefined,
              meta: note.pinned ? "Pinned" : undefined,
              href: buildFocusHref("/notes", note.id),
              searchText: buildSearchText([title, note.content, tagText]),
            };
          })
        );

        setSearchItems(next);
      } catch (err) {
        console.error("Failed to load search data:", err);
        if (active) setSearchItems([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    };

    void loadSearchIndex();

    const handleRefresh = () => {
      void loadSearchIndex();
    };

    window.addEventListener("job-tracker:refresh-counts", handleRefresh);
    return () => {
      active = false;
      window.removeEventListener("job-tracker:refresh-counts", handleRefresh);
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [searchOpen]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    const matches = searchItems.filter((item) =>
      item.searchText.includes(normalizedQuery)
    );
    return matches.slice(0, SEARCH_RESULT_LIMIT);
  }, [normalizedQuery, searchItems]);

  const resultsByKind = useMemo(() => {
    const grouped = new Map<SearchKind, SearchItem[]>();
    for (const item of searchResults) {
      const list = grouped.get(item.kind);
      if (list) {
        list.push(item);
      } else {
        grouped.set(item.kind, [item]);
      }
    }
    return grouped;
  }, [searchResults]);

  const showResults = searchOpen && normalizedQuery.length > 0;

  const avatarLabel = useMemo(() => {
    if (!user) return "Guest";

    const meta = user.user_metadata as Record<string, any> | undefined;

    const name =
      meta?.full_name || meta?.name || meta?.given_name || meta?.first_name;

    if (name) return name;

    if (user.email) {
      const local = user.email.split("@")[0] ?? "";
      return local.replace(/[._-]+/g, " ").trim() || user.email;
    }

    return "User";
  }, [user]);

  const avatarInitial = useMemo(() => {
    const txt = (avatarLabel || "").trim();
    return txt ? txt[0].toUpperCase() : "U";
  }, [avatarLabel]);

  const openSignInGate = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("job-tracker:open-signin-gate"));
  }, []);

  const confirmLogout = useCallback(() => {
    setLogoutOpen(true);
  }, []);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;

    setLogoutOpen(false);
    setLoggingOut(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out failed:", error.message);
      }

      // The onAuthStateChange listener in this component will clear `user`
      router.refresh();
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut, router]);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchQuery(value);
      setSearchOpen(value.trim().length > 0);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchOpen(false);
  }, []);

  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        handleClearSearch();
        event.currentTarget.blur();
        return;
      }

      if (event.key === "Enter" && searchResults.length > 0) {
        router.push(searchResults[0].href);
        setSearchOpen(false);
      }
    },
    [handleClearSearch, router, searchResults]
  );

  const handleSelectResult = useCallback(
    (href: string) => {
      router.push(href);
      setSearchOpen(false);
    },
    [router]
  );

  return (
    <>
      <ConfirmLogoutDialog
        open={logoutOpen}
        busy={loggingOut}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />

      <header
        className={[
          "sticky top-0 z-40 shadow-lg overflow-visible",
          "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
          "relative bg-gradient-to-r to-transparent",
          accent.washFrom,
          "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-gradient-to-r after:content-['']",
          "after:opacity-80",
          accent.barFrom,
          accent.barTo,
        ].join(" ")}
      >
        {/* keep 5px padding left/right */}
        <div className="w-full h-14 pl-[15px] pr-[15px] flex items-center gap-3 overflow-visible">
          {/* Left: collapse icon + title */}
          <div className="flex items-center gap-2 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleSidebar}
              className={[
                "inline-flex items-center justify-center p-1.5",
                "text-neutral-700 hover:text-neutral-900",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                accent.focus,
              ].join(" ")}
              aria-label={
                collapsed ? "Expand navigation" : "Collapse navigation"
              }
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>

            <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
          </div>

          {/* Center: global search */}
          <div
            ref={searchRef}
            className="relative flex-1 min-w-[160px] overflow-visible"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) {
                    setSearchOpen(true);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search all lists..."
                aria-label="Search all lists"
                className={[
                  "h-9 w-full rounded-lg pl-9 pr-9 text-sm text-neutral-900 placeholder:text-neutral-500",
                  "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
                  "border border-neutral-200",
                  "focus:outline-none focus:ring-2 focus:ring-offset-1",
                  accent.focus,
                ].join(" ")}
              />
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:text-neutral-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {showResults && (
              <div className="absolute left-0 right-0 z-50 mt-2 rounded-xl border border-neutral-200 bg-white/95 shadow-xl backdrop-blur">
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  {searchLoading ? (
                    <div className="px-3 py-2 text-xs text-neutral-500">
                      Loading results...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-neutral-500">
                      No results for "{searchQuery.trim()}".
                    </div>
                  ) : (
                    <>
                      {SEARCH_SECTIONS.map((section) => {
                        const items = resultsByKind.get(section.kind) ?? [];
                        if (items.length === 0) return null;

                        return (
                          <div key={section.kind} className="mb-2 last:mb-0">
                            <div className="flex items-center justify-between px-2 py-1">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                                {section.label}
                              </span>
                              {items.length > SEARCH_SECTION_LIMIT && (
                                <span className="text-[10px] text-neutral-400">
                                  Showing first {SEARCH_SECTION_LIMIT}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              {items
                                .slice(0, SEARCH_SECTION_LIMIT)
                                .map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSelectResult(item.href)}
                                    className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-neutral-900">
                                        {item.title}
                                      </p>
                                      {item.subtitle && (
                                        <p className="truncate text-xs text-neutral-500">
                                          {item.subtitle}
                                        </p>
                                      )}
                                    </div>
                                    {item.meta && (
                                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-neutral-400">
                                        {makeSnippet(item.meta, 22)}
                                      </span>
                                    )}
                                  </button>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: auth-aware area */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Avatar / Guest badge */}
            <div
              className={[
                "grid h-8 w-8 place-items-center rounded-full",
                user
                  ? "bg-neutral-200/80 text-neutral-700 ring-1 ring-neutral-300"
                  : "bg-amber-100/80 text-amber-800 ring-1 ring-amber-200",
                "text-sm font-semibold",
              ].join(" ")}
              aria-label={user ? "User avatar" : "Guest"}
              title={avatarLabel}
            >
              {user ? (
                avatarInitial
              ) : (
                <UserRound className="h-4 w-4" aria-hidden="true" />
              )}
            </div>

            {user ? (
              <button
                type="button"
                onClick={confirmLogout}
                className={[
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                  "text-red-600",
                  "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                  "border border-red-200/60 shadow-sm",
                  "transition-colors duration-150",
                  "hover:bg-rose-50 hover:border-rose-300/70 hover:text-rose-700",
                  "active:bg-rose-100",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-300",
                ].join(" ")}
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log out
              </button>
            ) : (
              <button
                type="button"
                onClick={openSignInGate}
                className={[
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                  "text-neutral-900",
                  "bg-white/80",
                  "border border-neutral-200 shadow-sm",
                  "transition-colors duration-150",
                  "hover:bg-sky-50 hover:border-sky-200 hover:text-sky-900",
                  "active:bg-sky-100",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  accent.focus,
                ].join(" ")}
                aria-label="Sign in"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
