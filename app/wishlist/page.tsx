"use client";

import { useEffect, useMemo, useState, useRef, FormEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Search,
  Plus,
  MapPin,
  ExternalLink,
  Star,
  Lightbulb,
  Pin,
  PinOff,
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
  CalendarDays,
  Tag,
  X,
  Image as ImageIcon,
  CheckCircle,
} from "lucide-react";

import WishlistFilter, {
  DEFAULT_WISHLIST_FILTERS,
  filterWishlistItems,
  type WishlistFilters,
} from "@/components/filters/WishlistFilter";

import AddApplicationDialog, {
  type NewApplicationForm,
} from "@/components/dialogs/AddApplicationDialog";

import { animateCardExit } from "@/components/dialogs/cardExitAnimation";

import ThreeBounceSpinner from "@/components/ui/ThreeBounceSpinner";

import {
  loadWishlist,
  upsertWishlistItem,
  deleteWishlistItem,
  type WishlistItem,
  type WishlistStorageMode,
} from "@/lib/services/wishlist";

import {
  upsertApplied,
  type AppliedStorageMode,
} from "@/lib/services/applied";

/** sidebar refresh event name used across the app */
const COUNTS_EVENT = "job-tracker:refresh-counts";

function makeUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizePriority(priority?: WishlistItem["priority"]) {
  return priority === "Dream" ? "High" : priority;
}

function priorityClasses(priority?: WishlistItem["priority"]) {
  switch (normalizePriority(priority)) {
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

function prioritySortValue(priority?: WishlistItem["priority"]) {
  switch (normalizePriority(priority)) {
    case "High":
      return 3;
    case "Medium":
      return 2;
    case "Low":
      return 1;
    default:
      return 0;
  }
}

function priorityAccentClasses(priority?: WishlistItem["priority"]) {
  switch (normalizePriority(priority)) {
    case "High":
      return "before:from-amber-500 before:via-orange-500 before:to-rose-500";
    case "Medium":
      return "before:from-sky-500 before:via-cyan-500 before:to-blue-500";
    case "Low":
      return "before:from-slate-400 before:via-slate-500 before:to-slate-600";
    default:
      return "before:from-yellow-500 before:via-amber-500 before:to-orange-400";
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

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("button, a, input, select, textarea, label, [role='button']")
  );
}

/* ---------- Add dialog types / component ---------- */

type WishlistPriorityValue = "Default" | "Low" | "Medium" | "High";

export type NewWishlistItemForm = {
  company: string;
  role: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  employmentType: string;
  offerUrl: string;
  logoUrl?: string;
  priority: WishlistPriorityValue;
};

const EMPLOYMENT_OPTIONS: string[] = [
  "Full-time",
  "Part-time",
  "Internship",
  "Working student",
  "Contract",
  "Temporary",
  "Mini-job",
  "Freelance",
];

const LONG_PRESS_MS = 550;
const LONG_PRESS_MOVE_PX = 12;

function makeInitialWishlistForm(): NewWishlistItemForm {
  return {
    company: "",
    role: "",
    location: "",
    startDate: "",
    employmentType: "",
    offerUrl: "",
    logoUrl: "",
    priority: "Default",
  };
}

function makeWishlistFormFromItem(
  item?: WishlistItem | null
): NewWishlistItemForm {
  if (!item) return makeInitialWishlistForm();
  const priority = normalizePriority(item.priority) ?? "Default";
  return {
    company: item.company ?? "",
    role: item.role ?? "",
    location: item.location ?? "",
    startDate: item.startDate ?? "",
    employmentType: item.offerType ?? "",
    offerUrl: item.website ?? "",
    logoUrl: item.logoUrl ?? "",
    priority: priority as WishlistPriorityValue,
  };
}

type AddDialogProps = {
  open: boolean;
  mode: "add" | "edit";
  initialItem?: WishlistItem | null;
  onClose: () => void;
  onSave: (data: NewWishlistItemForm) => void;
};

function AddWishlistItemDialog({
  open,
  mode,
  initialItem,
  onClose,
  onSave,
}: AddDialogProps) {
  const [form, setForm] = useState<NewWishlistItemForm>(() =>
    makeInitialWishlistForm()
  );
  const [logoError, setLogoError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const isEditMode = mode === "edit";
  const titleId = "wishlist-item-dialog-title";

  // Reset form + focus when opened
  useEffect(() => {
    if (!open) return;
    setForm(makeWishlistFormFromItem(initialItem));
    setLogoError(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    const t = firstFieldRef.current;
    if (t) setTimeout(() => t.focus(), 10);
  }, [open, initialItem?.id]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleChange =
    (field: keyof NewWishlistItemForm) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { value } = e.target;
        setForm((f) => ({ ...f, [field]: value }));
      };

  // Persist logo as a Data URL (base64) for local storage.
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setLogoError(null);
      if (!isEditMode) {
        setForm((f) => ({ ...f, logoUrl: "" }));
      }
      return;
    }

    const maxSizeBytes = 1 * 1024 * 1024; // 1 MB
    if (file.size > maxSizeBytes) {
      setLogoError("Logo must be smaller than 1 MB.");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setLogoError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setForm((f) => ({ ...f, logoUrl: result }));
    };
    reader.onerror = () => setLogoError("Failed to read the image file.");
    reader.readAsDataURL(file);
  };

  const canSubmit =
    form.company.trim().length > 0 && form.role.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave(form);
    onClose();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const dialog = (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[10000] flex items-center justify-center px-4 py-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          "relative z-10 max-h-full w-full max-w-2xl overflow-hidden rounded-2xl border border-yellow-100/80",
          "bg-gradient-to-br from-yellow-50 via-white to-amber-50 shadow-xl",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-yellow-100/80 px-5 py-3">
          <div className="flex items-center gap-2">
            <img
              src="/icons/addtowl.png"
              alt={isEditMode ? "Edit wishlist item" : "Add wishlist item"}
              className="h-9 w-9 md:h-11 md:w-11 object-contain"
            />
            <div>
              <h2
                id={titleId}
                className="text-base font-semibold text-neutral-900"
              >
                {isEditMode ? "Edit wishlist offer" : "Add wishlist offer"}
              </h2>
              <p className="mt-0.5 text-xs text-neutral-600">
                {isEditMode
                  ? "Update the details for this wishlist item."
                  : "Save a job offer manually to your wishlist."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-500 shadow-sm hover:bg-white"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-h-[75vh] overflow-y-auto px-5 py-4 space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {/* Company name */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Company name<span className="text-rose-500">*</span>
              </span>
              <input
                ref={firstFieldRef}
                type="text"
                value={form.company}
                onChange={handleChange("company")}
                placeholder="Acme GmbH"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
                required
              />
            </label>

            {/* Logo upload + preview */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">
                Company logo (optional)
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-xs font-medium text-neutral-800 shadow-sm hover:bg-white">
                    <ImageIcon
                      className="h-4 w-4 text-neutral-400"
                      aria-hidden="true"
                    />
                    <span>Upload logo (PNG, JPG, SVG. Max size 1 MB)</span>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="sr-only"
                    />
                  </label>

                  {logoError && (
                    <p className="mt-1 text-[11px] text-rose-600">
                      {logoError}
                    </p>
                  )}
                </div>

                {form.logoUrl?.trim() && (
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white/70">
                    <img
                      src={form.logoUrl}
                      alt={`${form.company || "Company"} logo`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </label>

            {/* Role */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Role / position<span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                value={form.role}
                onChange={handleChange("role")}
                placeholder="Frontend Engineer"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
                required
              />
            </label>

            {/* Location */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Location</span>
              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={form.location}
                  onChange={handleChange("location")}
                  placeholder="Berlin, DE / Remote"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
                />
              </div>
            </label>

            {/* Start date */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Start date</span>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={form.startDate}
                  onChange={handleChange("startDate")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
                />
              </div>
            </label>

            {/* Employment type */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">
                Type of employment
              </span>
              <div className="relative">
                <Briefcase
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <select
                  value={form.employmentType}
                  onChange={handleChange("employmentType")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
                >
                  <option value="">Select type…</option>
                  {EMPLOYMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            {/* Priority */}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-800">Priority</span>
              <select
                value={form.priority}
                onChange={handleChange("priority")}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
              >
                <option value="Default">Default</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>

            {/* Offer link */}
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-neutral-800">Offer link</span>
              <div className="relative">
                <ExternalLink
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="url"
                  value={form.offerUrl}
                  onChange={handleChange("offerUrl")}
                  placeholder="https://jobs.example.com/frontend-engineer"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white/80 pl-8 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
                />
              </div>
            </label>
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-end gap-3 border-t border-neutral-200/70 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={[
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                canSubmit
                  ? "bg-yellow-500 text-white hover:bg-yellow-400 focus-visible:ring-yellow-300"
                  : "cursor-not-allowed bg-neutral-200 text-neutral-500",
              ].join(" ")}
            >
              {isEditMode ? "Save changes" : "Save to wishlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

/* ---------- Main wishlist page ---------- */

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [storageMode, setStorageMode] = useState<WishlistStorageMode>("guest");
  const [appliedStorageMode, setAppliedStorageMode] = useState<AppliedStorageMode>("guest");

  const [hydrated, setHydrated] = useState(false);

  const [query, setQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [filters, setFilters] = useState<WishlistFilters>(
    DEFAULT_WISHLIST_FILTERS
  );
  const dialogMode: "add" | "edit" = editingItem ? "edit" : "add";

  // Application dialog state (for moving to applied)
  const [appDialogOpen, setAppDialogOpen] = useState(false);
  const [appDialogData, setAppDialogData] = useState<NewApplicationForm | null>(null);
  const [itemBeingMovedToApplied, setItemBeingMovedToApplied] = useState<WishlistItem | null>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);

  // Load on mount + refresh when other pages change wishlist
  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const { mode, items } = await loadWishlist().catch(() => ({
          mode: "guest" as WishlistStorageMode,
          items: [] as WishlistItem[],
        }));
        if (!alive) return;
        setStorageMode(mode);
        setItems(items);
        // Load applied storage mode for when we save items to applied
        setAppliedStorageMode(mode as AppliedStorageMode);
      } finally {
        if (alive) setHydrated(true);
      }
    };

    void run();

    const handler = () => void run();
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

  const filtered = useMemo(() => {
    const list = filterWishlistItems(items, query, filters);
    return list
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => {
        const ap = a.item.pinned ? 1 : 0;
        const bp = b.item.pinned ? 1 : 0;
        if (bp !== ap) return bp - ap;
        const apr = prioritySortValue(a.item.priority);
        const bpr = prioritySortValue(b.item.priority);
        if (bpr !== apr) return bpr - apr;
        return a.idx - b.idx;
      })
      .map(({ item }) => item);
  }, [items, query, filters]);

  const cardCount = filtered.length;
  const priorityCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0, other: 0 };
    for (const item of filtered) {
      switch (normalizePriority(item.priority)) {
        case "High":
          counts.high += 1;
          break;
        case "Medium":
          counts.medium += 1;
          break;
        case "Low":
          counts.low += 1;
          break;
        default:
          counts.other += 1;
          break;
      }
    }
    return counts;
  }, [filtered]);
  
  const cardSummary = (

    <span className="inline-flex flex-wrap items-center gap-1">

      <span>

        {cardCount} {cardCount === 1 ? "Card" : "Cards"}:

      </span>

      <span className="text-amber-700">{priorityCounts.high} high,</span>

      <span className="text-sky-700">{priorityCounts.medium} medium,</span>

      <span className="text-slate-700">{priorityCounts.low} low,</span>

      <span className="text-neutral-600">{priorityCounts.other} others</span>

    </span>

  );
  const headerTips = [
    "Tip: Set a priority to group offers fast.",
    "Tip: Pin standout offers to keep them on top.",
  ];

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: WishlistItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    clearLongPress();
  };

  const wishlistItemToApplicationForm = (item: WishlistItem): NewApplicationForm => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      company: item.company || "",
      role: item.role || "",
      location: item.location || "",
      appliedOn: today,
      startDate: item.startDate || "",
      employmentType: item.offerType || "",
      offerUrl: item.website || "",
      salary: "",
      contactPerson: "",
      contactPhone: "",
      contactEmail: "",
      source: "",
      status: "Applied",
      notes: item.notes || "",
      logoUrl: item.logoUrl || "",
      website: item.website || "",
    };
  };

  const openMoveToAppliedDialog = (item: WishlistItem) => {
    setItemBeingMovedToApplied(item);
    const formData = wishlistItemToApplicationForm(item);
    setAppDialogData(formData);
    setAppDialogOpen(true);
  };

  const closeAppDialog = () => {
    setAppDialogOpen(false);
    setAppDialogData(null);
    setItemBeingMovedToApplied(null);
  };

  const handleMoveToApplied = async (data: NewApplicationForm) => {
    if (!itemBeingMovedToApplied) return;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const appId = makeUuid();
      const elementId = `wishlist-card-${itemBeingMovedToApplied.id}`;
      
      const application = {
        id: appId,
        company: data.company,
        role: data.role,
        location: data.location,
        appliedOn: data.appliedOn || today,
        startDate: data.startDate || "",
        employmentType: data.employmentType,
        offerUrl: data.offerUrl,
        salary: data.salary,
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        source: data.source,
        status: data.status,
        notes: data.notes,
        logoUrl: data.logoUrl,
        website: data.website,
      };

      // Close dialog first
      closeAppDialog();

      // Animate card exit and then save
      animateCardExit(elementId, "move", async () => {
        // Remove from wishlist
        setItems((prev) => prev.filter((item) => item.id !== itemBeingMovedToApplied.id));
        await deleteWishlistItem(itemBeingMovedToApplied.id, storageMode);

        // Save to applied
        await upsertApplied(application, appliedStorageMode);

        // Notify other pages to refresh
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(COUNTS_EVENT));
        }
      });
    } catch (err) {
      console.error("Failed to move to applied:", err);
    }
  };

  const handleCardPointerDown = (
    item: WishlistItem,
    event: PointerEvent<HTMLElement>
  ) => {
    if (isDialogOpen) return;
    if (isInteractiveTarget(event.target)) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    clearLongPress();
    longPressStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = setTimeout(() => {
      clearLongPress();
      openEditDialog(item);
    }, LONG_PRESS_MS);
  };

  const handleCardPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!longPressTimerRef.current || !longPressStartRef.current) return;
    const dx = Math.abs(event.clientX - longPressStartRef.current.x);
    const dy = Math.abs(event.clientY - longPressStartRef.current.y);
    if (dx > LONG_PRESS_MOVE_PX || dy > LONG_PRESS_MOVE_PX) {
      clearLongPress();
    }
  };

  function handleTogglePin(id: string) {
    setItems((prev) => {
      let updated: WishlistItem | null = null;
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        updated = { ...item, pinned: !item.pinned };
        return updated;
      });
      if (updated) {
        void upsertWishlistItem(updated, storageMode);
      }
      return next;
    });
  }

  function handlePriorityChange(id: string, value: string) {
    const nextPriority =
      value === "Default" ? undefined : (value as WishlistItem["priority"]);
    setItems((prev) => {
      let updated: WishlistItem | null = null;
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        updated = { ...item, priority: nextPriority };
        return updated;
      });
      if (updated) {
        void upsertWishlistItem(updated, storageMode);
      }
      return next;
    });
  }

  // Delete from wishlist via star
  function handleDelete(id: string) {
    const elementId = `wishlist-card-${id}`;
    animateCardExit(elementId, "delete", async () => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      await deleteWishlistItem(id, storageMode);
    });
  }

  // Add/edit from dialog
  function handleSaveFromDialog(data: NewWishlistItemForm) {
    const website = data.offerUrl.trim() || undefined;
    const computedKey = `${data.company.trim()}|${data.role.trim()}|${data.location.trim()}`.toLowerCase();
    const sourceKey = website || editingItem?.sourceKey || computedKey;

    if (editingItem) {
      const nextItem: WishlistItem = {
        ...editingItem,
        sourceKey,
        company: data.company.trim(),
        role: data.role.trim() || undefined,
        location: data.location.trim() || undefined,
        logoUrl: data.logoUrl?.trim() || undefined,
        website,
        startDate: data.startDate || null,
        offerType: data.employmentType.trim() || undefined,
        priority: data.priority === "Default" ? undefined : data.priority,
      };

      setItems((prev) =>
        prev.map((item) => (item.id === editingItem.id ? nextItem : item))
      );
      void upsertWishlistItem(nextItem, storageMode);
      return;
    }

    const nextItem: WishlistItem = {
      id: makeUuid(),
      sourceKey,
      company: data.company.trim(),
      role: data.role.trim() || undefined,
      location: data.location.trim() || undefined,
      logoUrl: data.logoUrl?.trim() || undefined,
      website,
      startDate: data.startDate || null,
      offerType: data.employmentType.trim() || undefined,
      pinned: false,
      priority: data.priority === "Default" ? undefined : data.priority,
    };

    setItems((prev) => [nextItem, ...prev]);
    void upsertWishlistItem(nextItem, storageMode);
  }

  return (
    <section
      className={[
        "relative rounded-2xl border border-yellow-100/80",
        "bg-gradient-to-br from-yellow-50 via-white to-amber-50",
        "p-8 shadow-md",
      ].join(" ")}
    >
      {/* soft accent blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Image
              src="/icons/star.png"
              alt=""
              width={37}
              height={37}
              aria-hidden="true"
              className="shrink-0 -mt-1"
            />
            <h1 className="text-2xl font-semibold text-neutral-900">Wishlist</h1>

            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-neutral-800 shadow-sm">
              {cardSummary}
            </span>
          </div>

          <p className="mt-1 text-neutral-700">
            Saved offers you want to revisit later.
          </p>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-2">
          {headerTips.map((tip) => (
            <span
              key={tip}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm"
            >
              <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <span className="text-neutral-700">{tip}</span>
            </span>
          ))}
        </div>
      </div>

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
              "focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-300",
              "transition-shadow",
            ].join(" ")}
          />
        </div>

        {/* Add */}
        <button
          type="button"
          onClick={openAddDialog}
          className={[
            "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800",
            "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
            "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300",
          ].join(" ")}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>

        {/* Filter */}
        <WishlistFilter
          items={items}
          filters={filters}
          onChange={setFilters}
          filteredCount={filtered.length}
        />
      </div>

      {/* Results grid */}
      <div className="mt-5 grid grid-cols-1 gap-3">
        {!hydrated ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
            <ThreeBounceSpinner label="Loading wishlist" />
          </div>
        ) : (
          filtered.map((item, i) => {
            const Icon = pickJobIcon(item.role || item.company);
            const idx = i + 1;
            const startLabel = formatStartDate(item.startDate ?? null);
            const offerLabel =
              item.offerType && item.offerType.trim().length > 0
                ? item.offerType.trim()
                : undefined;
            const displayPriority = normalizePriority(item.priority);
            const priorityValue = displayPriority ?? "Default";

            return (
              <article
                key={item.id}
                id={`wishlist-card-${item.id}`}
                onPointerDown={(event) => handleCardPointerDown(item, event)}
                onPointerMove={handleCardPointerMove}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
                onPointerCancel={clearLongPress}
                className={[
                  "relative grid grid-cols-[64px,1fr,auto] items-center gap-4",
                  "rounded-xl border border-neutral-200/80",
                  "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
                  "p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                  "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl",
                  "before:bg-gradient-to-b",
                  priorityAccentClasses(item.priority),
                  "before:opacity-90",
                ].join(" ")}
              >
                {/* logo square */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ring-1 ring-white/60">
                  <div className="absolute left-1 top-1 rounded-md bg-neutral-900/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    {idx}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
                    <Icon className="h-7 w-7 text-yellow-700" aria-hidden="true" />
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

                {/* Company + details */}
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
                    {displayPriority && (
                      <span
                        className={[
                          "ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          priorityClasses(displayPriority),
                        ].join(" ")}
                      >
                        <Star
                          className="mr-1 h-3.5 w-3.5 text-yellow-500"
                          aria-hidden="true"
                        />
                        {displayPriority}
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
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-yellow-800">
                        <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                        {offerLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side: STAR (delete) + View */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(item.id)}
                    aria-label={item.pinned ? "Unpin wishlist item" : "Pin wishlist item"}
                    className={[
                      "inline-flex items-center justify-center",
                      "text-sm rounded-full",
                      "bg-transparent border-0 p-0",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300",
                    ].join(" ")}
                  >
                    {item.pinned ? (
                      <Pin
                        className="h-5 w-5 text-amber-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <PinOff
                        className="h-5 w-5 text-neutral-400 hover:text-neutral-500"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    aria-label="Remove from wishlist"
                    className={[
                      "inline-flex items-center justify-center",
                      "text-sm rounded-full",
                      "bg-transparent border-0 p-0",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300",
                    ].join(" ")}
                  >
                    <Star
                      className="h-5 w-5 transition-colors text-amber-500 fill-amber-400 hover:text-amber-600 hover:fill-amber-500"
                      aria-hidden="true"
                    />
                  </button>

                  <select
                    value={priorityValue}
                    onChange={(e) => handlePriorityChange(item.id, e.target.value)}
                    aria-label="Wishlist priority"
                    className={[
                      "h-8 rounded-md border border-neutral-200 bg-white/80 px-2 text-xs font-medium text-neutral-700 shadow-sm",
                      "hover:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300",
                    ].join(" ")}
                  >
                    <option value="Default">Default</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => openMoveToAppliedDialog(item)}
                    aria-label="Move to applied applications"
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-emerald-50/70 px-2.5 py-1.5 text-sm text-emerald-700 shadow-sm hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300"
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Applied
                  </button>

                  {item.website && (
                    <a
                      href={item.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white/70 px-2.5 py-1.5 text-sm text-neutral-800 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      View
                    </a>
                  )}
                </div>
              </article>
            );
          })
        )}

        {hydrated && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
            <div className="mb-2 text-5xl">🌟</div>
            <p className="text-sm text-neutral-700">
              {query.trim()
                ? "No wishlist items match your search."
                : "Your wishlist is currently empty. Star some offers or add one manually."}
            </p>
          </div>
        )}
      </div>

      <AddWishlistItemDialog
        open={isDialogOpen}
        mode={dialogMode}
        initialItem={editingItem}
        onClose={closeDialog}
        onSave={handleSaveFromDialog}
      />

      <AddApplicationDialog
        open={appDialogOpen}
        onClose={closeAppDialog}
        onSave={handleMoveToApplied}
        initialData={appDialogData}
      />
    </section>
  );
}
