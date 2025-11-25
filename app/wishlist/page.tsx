"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  MapPin,
  ExternalLink,
  Star,
  Code2,
  Server,
  Stethoscope,
  Hammer,
  Wrench,
  GraduationCap,
  Palette,
  Truck,
  ChefHat,
  Building2,
  Briefcase,
  Heart,
  CalendarDays,
  Tag,
} from "lucide-react";

const WISHLIST_STORAGE_KEY = "job-wishlist-v1";

type WishlistItem = {
  id: string;
  company: string;
  role?: string;
  location?: string;
  priority?: "Dream" | "High" | "Medium" | "Low";
  logoUrl?: string;
  website?: string;
  notes?: string;
  startDate?: string | null;
  offerType?: string;
};

function priorityClasses(priority?: WishlistItem["priority"]) {
  switch (priority) {
    case "Dream":
      return "bg-violet-100 text-violet-800 ring-1 ring-inset ring-violet-300";
    case "High":
      return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300";
    case "Medium":
      return "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-300";
    case "Low":
      return "bg-slate-100 text-slate-800 ring-1 ring-inset ring-slate-300";
    default:
      return "bg-neutral-100 text-neutral-800 ring-1 ring-inset ring-neutral-300";
  }
}

function pickJobIcon(title: string) {
  const t = title.toLowerCase();
  if (
    /(dev|software|frontend|backend|full[- ]?stack|react|angular|vue|typescript|engineer|programm)/.test(
      t
    )
  )
    return Code2;
  if (
    /(data|ml|ai|cloud|devops|kubernetes|docker|sysadmin|sre|platform|server)/.test(
      t
    )
  )
    return Server;
  if (/(nurse|pfleg|arzt|ärzt|medizin|therap|apothe|health|care)/.test(t))
    return Stethoscope;
  if (
    /(mechanic|mechatron|installat|wartung|techniker|elektrik|elektron|service)/.test(
      t
    )
  )
    return Wrench;
  if (/(bau|construction|maurer|zimmerer|tiefbau|hochbau|handwerk)/.test(t))
    return Hammer;
  if (/(driver|fahrer|logistik|liefer|kurier|transport|truck|flotte)/.test(t))
    return Truck;
  if (
    /(koch|küche|chef|gastronomie|restaurant|küchenhilfe|kitchen|cook)/.test(t)
  )
    return ChefHat;
  if (/(design|ux|ui|grafik|creative|art|produktdesign)/.test(t))
    return Palette;
  if (
    /(teacher|ausbilder|trainer|schule|bildung|dozent|professor|ausbildung)/.test(
      t
    )
  )
    return GraduationCap;
  if (
    /(factory|produktion|fertigung|betrieb|warehouse|lager|industrie)/.test(t)
  )
    return Building2;
  if (/(sales|vertrieb|account|customer|kunden|business|consult)/.test(t))
    return Briefcase;
  return Briefcase;
}

function formatStartDate(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/ab\s*sofort/i.test(trimmed)) {
    return "ab sofort";
  }

  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    return trimmed;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);

  if (start <= today) {
    return "ab sofort";
  }

  return start.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [query, setQuery] = useState("");

  // Load wishlist items from localStorage (no demo data)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (!raw) {
        setItems([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setItems(parsed);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Failed to load wishlist", err);
      setItems([]);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter((w) =>
      [w.company, w.role, w.location, w.priority]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [query, items]);

  // Delete from wishlist via heart
  function handleDelete(id: string) {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            WISHLIST_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch (err) {
          console.error("Failed to update wishlist", err);
        }
      }
      return next;
    });
  }

  return (
    <section
      className={[
        "relative rounded-2xl border border-neutral-200/70",
        "bg-gradient-to-br from-amber-50 via-white to-yellow-50",
        "p-8 shadow-md overflow-hidden",
      ].join(" ")}
    >
      {/* soft accent blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />

      <h1 className="text-2xl font-semibold text-neutral-900">Wishlist</h1>
      <p className="mt-1 text-neutral-700">
        Offers you starred from the Offers page.
      </p>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search wishlist…"
            aria-label="Search wishlist"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={[
              "h-11 w-full rounded-lg pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500",
              "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
              "border border-neutral-200 shadow-sm",
              "hover:bg-white focus:bg-white",
              "ring-1 ring-transparent",
              "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300",
              "transition-shadow",
            ].join(" ")}
          />
        </div>

        {/* Add (visual for now) */}
        <button
          type="button"
          className={[
            "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800",
            "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
            "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300",
          ].join(" ")}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>

        {/* Filter (visual) */}
        <button
          type="button"
          className={[
            "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800",
            "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
            "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300",
          ].join(" ")}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filter
        </button>
      </div>

      {/* Results grid – same card design as Offers, with heart acting as delete */}
      <div className="mt-5 grid grid-cols-1 gap-3">
        {filtered.map((item, i) => {
          const Icon = pickJobIcon(item.role || item.company);
          const idx = i + 1;
          const startLabel = formatStartDate(item.startDate ?? null);
          const offerLabel =
            item.offerType && item.offerType.trim().length > 0
              ? item.offerType.trim()
              : undefined;

          return (
            <article
              key={item.id}
              className={[
                "relative grid grid-cols-[64px,1fr,auto] items-center gap-4",
                "rounded-xl border border-neutral-200/80",
                "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
                "p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl",
                "before:bg-gradient-to-b before:from-amber-500 before:via-orange-500 before:to-yellow-500",
                "before:opacity-90",
              ].join(" ")}
            >
              {/* same logo square as Offers */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
                <div className="absolute left-1 top-1 rounded-md bg-neutral-900/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {idx}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
                  <Icon className="h-7 w-7 text-amber-700" aria-hidden="true" />
                </div>
                {item.logoUrl && (
                  <img
                    src={item.logoUrl}
                    alt={`${item.company} logo`}
                    className="absolute inset-0 h-full w-full object-contain p-1.5"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                )}
              </div>

              {/* Company + details – mirrors Offers layout */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-neutral-900">
                    {item.company}
                  </h2>
                  {item.role && (
                    <span className="text-sm text-neutral-600">
                      • {item.role}
                    </span>
                  )}
                  {item.priority && (
                    <span
                      className={[
                        "ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        priorityClasses(item.priority),
                      ].join(" ")}
                    >
                      <Star
                        className="mr-1 h-3.5 w-3.5 text-amber-500"
                        aria-hidden="true"
                      />
                      {item.priority}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700">
                  {item.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin
                        className="h-4 w-4 text-neutral-400"
                        aria-hidden="true"
                      />
                      {item.location}
                    </span>
                  )}

                  {startLabel && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays
                        className="h-4 w-4 text-neutral-400"
                        aria-hidden="true"
                      />
                      {startLabel}
                    </span>
                  )}

                  {offerLabel && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
                      <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                      {offerLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Right side: heart + View row like Offers, but heart == delete */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  aria-label="Remove from wishlist"
                  className={[
                    "inline-flex items-center justify-center",
                    "text-sm rounded-full",
                    "bg-transparent border-0 p-0",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300",
                  ].join(" ")}
                >
                  <Heart
                    className="h-5 w-5 transition-colors text-rose-500 fill-rose-500 hover:text-rose-400 hover:fill-rose-400"
                    aria-hidden="true"
                  />
                </button>

                {item.website && (
                  <a
                    href={item.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white/70 px-2.5 py-1.5 text-sm text-neutral-800 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    View
                  </a>
                )}
              </div>
            </article>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
            <div className="mb-2 text-5xl">🌟</div>
            <p className="text-sm text-neutral-700">
              {query.trim()
                ? "No wishlist items match your search."
                : "Your wishlist is currently empty. Star some offers first."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
