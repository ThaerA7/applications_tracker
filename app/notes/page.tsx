// app/notes/page.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Pin,
  PinOff,
  Tag,
  CalendarDays,
  Edit3,
  Trash2,
  Save,
  X,
  Palette,
} from "lucide-react";
import Image from "next/image";

type ColorKey =
  | "gray"
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "pink"
  | "purple";

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string; // ISO string
  pinned?: boolean;
  color?: ColorKey;
};

const COLORS: ColorKey[] = [
  "gray",
  "blue",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
];

const COLOR_STYLES: Record<ColorKey, { dot: string; ring: string }> = {
  gray: { dot: "bg-neutral-400", ring: "ring-neutral-300" },
  blue: { dot: "bg-blue-500", ring: "ring-blue-300" },
  green: { dot: "bg-green-500", ring: "ring-green-300" },
  yellow: { dot: "bg-yellow-500", ring: "ring-yellow-300" },
  orange: { dot: "bg-orange-500", ring: "ring-orange-300" },
  red: { dot: "bg-red-500", ring: "ring-red-300" },
  pink: { dot: "bg-pink-500", ring: "ring-pink-300" },
  purple: { dot: "bg-purple-500", ring: "ring-purple-300" },
};

const COLOR_ACCENT: Record<ColorKey, string> = {
  gray: "before:from-slate-400 before:to-slate-500",
  blue: "before:from-sky-500 before:to-blue-500",
  green: "before:from-emerald-500 before:to-teal-500",
  yellow: "before:from-amber-500 before:to-yellow-500",
  orange: "before:from-orange-500 before:to-amber-500",
  red: "before:from-rose-500 before:to-red-500",
  pink: "before:from-pink-500 before:to-fuchsia-500",
  purple: "before:from-violet-500 before:to-purple-500",
};

const INITIAL_NOTES: Note[] = [
  {
    id: "n1",
    title: "Globex — Phone screen prep",
    content:
      "Review behavioral stories (STAR), brush up on async patterns in TS, and common React perf pitfalls.\n\nQuestions to ask: team structure, on-call, growth path.",
    tags: ["interview", "prep"],
    updatedAt: "2025-11-02T09:15:00.000Z",
    pinned: true,
    color: "yellow",
  },
  {
    id: "n2",
    title: "Acme — Frontend system design",
    content:
      "Component architecture, state boundaries, data fetching patterns (React Server Components + caching). Consider monitoring/observability.",
    tags: ["system-design", "frontend"],
    updatedAt: "2025-10-31T17:42:00.000Z",
    color: "blue",
  },
  {
    id: "n3",
    title: "Research: Stripe career site",
    content:
      "Look for roles aligned with DX and UI platforms. Note interview format; collect links to recent posts.",
    tags: ["research"],
    updatedAt: "2025-10-28T14:03:00.000Z",
    color: "gray",
  },
];

// Lock locale & timezone so SSR and CSR output identical strings.
const FORMAT_LOCALE = "en-US";
const FORMAT_TIMEZONE: Intl.DateTimeFormatOptions["timeZone"] = "UTC";
function fmtDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(FORMAT_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: FORMAT_TIMEZONE,
  }).format(d);
}

/** Heuristic: multi-line or > 220 chars => "long". */
function isLong(text: string) {
  if (!text) return false;
  return text.length > 220 || text.split(/\n/).length > 6;
}

function truncateText(text: string, max = 220) {
  if (!text || text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

/** Solid color values used for swatches. */
function getColorHex(c: ColorKey): string {
  switch (c) {
    case "gray":
      return "#9CA3AF";
    case "blue":
      return "#3B82F6";
    case "green":
      return "#22C55E";
    case "yellow":
      return "#EAB308";
    case "orange":
      return "#F97316";
    case "red":
      return "#EF4444";
    case "pink":
      return "#EC4899";
    case "purple":
      return "#A855F7";
  }
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTag, setActiveTag] = useState<string>("All");
  const [activeColor, setActiveColor] = useState<ColorKey | "all">("all");

  // dialog state (for add + edit)
  const [editingId, setEditingId] = useState<string | null>(null); // "new" for add
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [draftColor, setDraftColor] = useState<ColorKey>("gray");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [expandedNote, setExpandedNote] = useState<Record<string, boolean>>(
    {}
  );

  // ✅ delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => s.add(t)));
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let res = notes.filter((n) => {
      const matchesQ =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q));

      const matchesTag = activeTag === "All" || n.tags.includes(activeTag);

      const noteColor: ColorKey = n.color || "gray";
      const matchesColor = activeColor === "all" || noteColor === activeColor;

      return matchesQ && matchesTag && matchesColor;
    });

    res.sort((a, b) => {
      if (!!b.pinned === !!a.pinned) {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
      return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    });
    return res;
  }, [notes, query, activeTag, activeColor]);

  function openAddDialog() {
    setEditingId("new");
    setDraftTitle("");
    setDraftContent("");
    setDraftTags("");
    setDraftColor("gray");
    setIsDialogOpen(true);
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftTags(note.tags.join(", "));
    setDraftColor(note.color || "gray");
    setIsDialogOpen(true);
  }

  function saveEdit() {
    if (!editingId) return;

    const tags = draftTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setNotes((prev) => {
      if (editingId === "new") {
        const id = `n${Date.now()}`;
        const newNote: Note = {
          id,
          title: draftTitle || "Untitled note",
          content: draftContent,
          tags,
          color: draftColor,
          updatedAt: new Date().toISOString(),
          pinned: false,
        };
        return [newNote, ...prev];
      }

      return prev.map((n) =>
        n.id === editingId
          ? {
            ...n,
            title: draftTitle || "Untitled note",
            content: draftContent,
            tags,
            color: draftColor,
            updatedAt: new Date().toISOString(),
          }
          : n
      );
    });

    setEditingId(null);
    setIsDialogOpen(false);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setEditingId(null);
  }

  function togglePin(id: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  }

  // ✅ open confirm dialog instead of deleting immediately
  function requestDelete(note: Note) {
    setDeleteTarget(note);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDeleteTarget(null);
  }

  function cancelDelete() {
    setDeleteTarget(null);
  }

  function addNote() {
    openAddDialog();
  }

  const toggleExpanded = (id: string) =>
    setExpandedNote((s) => ({ ...s, [id]: !s[id] }));

  return (
    <>
      <section
        className={[
          "relative rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-fuchsia-50 via-white to-violet-50",
          "p-8 shadow-md overflow-hidden",
        ].join(" ")}
      >
        {/* soft fuchsia/violet blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="flex items-center gap-1">
          <Image
            src="/icons/note.png"
            alt=""
            width={37}
            height={37}
            aria-hidden="true"
            className="shrink-0 -mt-1"
          />
          <h1 className="text-2xl font-semibold text-neutral-900">Notes</h1>
        </div>
        <p className="mt-1 text-neutral-700">
          Quick research, interview prep, and reminders.
        </p>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search notes by title, text, or tag…"
              aria-label="Search notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={[
                "h-11 w-full rounded-lg pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500",
                "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                "border border-neutral-200 shadow-sm",
                "hover:bg-white focus:bg-white",
                "ring-1 ring-transparent",
                "focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-300",
                "transition-shadow",
              ].join(" ")}
            />
          </div>

          <div className="flex gap-2">
            {/* Add */}
            <button
              type="button"
              onClick={addNote}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800",
                "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-fuchsia-300",
              ].join(" ")}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </button>

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-800",
                "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                "border border-neutral-200 shadow-sm hover:bg-white active:bg-neutral-50",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-fuchsia-300",
              ].join(" ")}
              aria-expanded={showFilters}
              aria-controls="notes-filters"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filter
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div
            id="notes-filters"
            className="mt-3 relative rounded-lg border border-neutral-200 bg-white/70 p-3 pb-10 backdrop-blur supports-[backdrop-filter]:bg-white/60"
          >
            {/* Tag filter row – now can go full width */}
            <div className="flex flex-wrap items-center gap-2">
              {allTags.map((t) => {
                const active = activeTag === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTag(t)}
                    aria-pressed={active}
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition",
                      active
                        ? "bg-fuchsia-600 text-white shadow-sm"
                        : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100",
                    ].join(" ")}
                  >
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    {t}
                  </button>
                );
              })}
            </div>

            {/* Color filter cluster – still bottom-right */}
            <div className="absolute bottom-2 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveColor("all")}
                aria-pressed={activeColor === "all"}
                aria-label="Show notes of any color"
                className={[
                  "h-7 w-7 rounded-full border transition",
                  activeColor === "all"
                    ? "ring-2 ring-fuchsia-300 border-neutral-300"
                    : "ring-0 border-neutral-300",
                  "bg-[conic-gradient(at_50%_50%,#ec4899,#eab308,#22c55e,#3b82f6,#a855f7,#ec4899)]",
                ].join(" ")}
              />

              {COLORS.map((c) => {
                const selected = activeColor === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setActiveColor(c)}
                    aria-label={`Filter by color: ${c}`}
                    aria-pressed={selected}
                    className={[
                      "h-7 w-7 rounded-full border transition",
                      selected ? `ring-2 ${COLOR_STYLES[c].ring}` : "ring-0",
                      c === "yellow" || c === "gray"
                        ? "border-neutral-300"
                        : "border-transparent",
                    ].join(" ")}
                    style={{ background: getColorHex(c) }}
                    title={c}
                  />
                );
              })}
            </div>
          </div>
        )}



        {/* Notes grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n) => {
            const color = n.color || "gray";
            const long = isLong(n.content);
            const expanded = !!expandedNote[n.id];

            return (
              <article
                key={n.id}
                className={[
                  "relative flex flex-col rounded-xl border p-4 shadow-sm transition-all",
                  "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
                  "border-neutral-200/80 hover:-translate-y-0.5 hover:shadow-md",
                  "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl before:bg-gradient-to-b before:opacity-90",
                  COLOR_ACCENT[color],
                ].join(" ")}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${COLOR_STYLES[color].dot}`}
                      aria-hidden="true"
                    />
                    <h2 className="text-sm font-semibold text-neutral-900">
                      {n.title}
                    </h2>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => togglePin(n.id)}
                      className="rounded-md border border-neutral-200 bg-white/70 p-1 text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"
                      aria-label={n.pinned ? "Unpin note" : "Pin note"}
                      title={n.pinned ? "Unpin" : "Pin"}
                    >
                      {n.pinned ? (
                        <Pin className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <PinOff className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEdit(n)}
                      className="rounded-md border border-neutral-200 bg-white/70 p-1 text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"
                      aria-label="Edit note"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {/* ✅ delete now opens confirmation dialog */}
                    <button
                      type="button"
                      onClick={() => requestDelete(n)}
                      className="rounded-md border border-neutral-200 bg-white/70 p-1 text-neutral-700 shadow-sm hover:bg-white hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                      aria-label="Delete note"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Updated</span>
                    <time dateTime={n.updatedAt}>{fmtDate(n.updatedAt)}</time>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {n.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-full border border-neutral-200 bg-white/70 px-2 py-0.5 text-[11px] text-neutral-700 backdrop-blur"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="mt-3">
                  <p className="whitespace-pre-line text-sm text-neutral-700">
                    {!expanded && long
                      ? truncateText(n.content)
                      : n.content || "No content yet."}
                  </p>
                  {long && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(n.id)}
                      className="mt-2 text-xs font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-700"
                      aria-expanded={expanded}
                      aria-label={expanded ? "Show less" : "Show more"}
                    >
                      {expanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div
              className="md:col-span-2 xl:col-span-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur"
            >
              <div className="mb-2 text-5xl">📝</div>
              <p className="text-sm text-neutral-700">
                No notes match your filters.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =============================== */}
      {/* ✅ DELETE CONFIRMATION DIALOG */}
      {/* =============================== */}
      {deleteTarget && (
        <div
          className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12450] flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          onClick={cancelDelete}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-fuchsia-950/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <article
              className={[
                "relative overflow-hidden rounded-2xl border border-neutral-200/80",
                "bg-white shadow-2xl p-5",
              ].join(" ")}
            >
              <p className="text-sm font-semibold text-neutral-900">
                Delete this note?
              </p>
              <p className="mt-1 text-sm text-neutral-700">
                <span className="font-medium">{deleteTarget.title}</span> will
                be permanently removed.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                This action cannot be undone.
              </p>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className={[
                    "inline-flex items-center gap-1 rounded-md border border-neutral-200",
                    "bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-white",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300",
                  ].join(" ")}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className={[
                    "inline-flex items-center gap-1 rounded-md border border-rose-600",
                    "bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-rose-500",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300",
                  ].join(" ")}
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* NOTE DIALOG */}
      {isDialogOpen && (
        <div
          className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12500] flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          onClick={closeDialog}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-fuchsia-950/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <article
              style={{
                borderLeftWidth: 4,
                borderLeftColor: getColorHex(draftColor),
              }}
              className={[
                "relative flex flex-col rounded-xl border p-4 sm:p-5 shadow-2xl transition-all",
                "bg-gradient-to-br from-white via-white to-neutral-50",
                "backdrop-blur supports-[backdrop-filter]:bg-white/90",
                "border-neutral-100/80",
              ].join(" ")}
            >
              {/* Header – dot + title */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${COLOR_STYLES[draftColor].dot}`}
                  aria-hidden="true"
                />
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  aria-label="Note title"
                  placeholder="Note title"
                  className="h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/40"
                />
              </div>

              {/* Content */}
              <div className="mt-3">
                <label htmlFor="notes-dialog-content" className="sr-only">
                  Note content
                </label>
                <textarea
                  id="notes-dialog-content"
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/40"
                  placeholder="Write your note…"
                />
              </div>

              {/* Color picker */}
              <div className="mt-3">
                <div className="mb-1 inline-flex items-center gap-2 text-xs text-neutral-600">
                  <Palette className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Color</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {COLORS.map((c) => {
                    const selected = draftColor === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDraftColor(c)}
                        aria-label={`Set note color: ${c}`}
                        aria-pressed={selected}
                        className={`h-7 w-7 rounded-full border transition ${selected ? `ring-2 ${COLOR_STYLES[c].ring}` : "ring-0"
                          } ${c === "yellow" || c === "gray"
                            ? "border-neutral-300"
                            : "border-transparent"
                          }`}
                        style={{ background: getColorHex(c) }}
                        title={c}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Tags input */}
              <div className="mt-3">
                <label
                  htmlFor="notes-dialog-tags"
                  className="block text-xs text-neutral-600"
                >
                  Tags (comma-separated)
                </label>
                <input
                  id="notes-dialog-tags"
                  value={draftTags}
                  onChange={(e) => setDraftTags(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/40"
                  placeholder="e.g. interview, research"
                />
              </div>

              {/* Footer – Cancel / Save */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"
                  aria-label="Cancel"
                  title="Cancel"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-neutral-800"
                  aria-label="Save note"
                  title="Save"
                >
                  <Save className="h-3 w-3" aria-hidden="true" />
                  Save
                </button>
              </div>
            </article>
          </div>
        </div>
      )}
    </>
  );
}
