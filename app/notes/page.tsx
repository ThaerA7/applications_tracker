// app/notes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

import {
  loadNotes,
  upsertNote,
  deleteNote,
  migrateGuestNotesToUser,
  type Note,
  type ColorKey,
  type NotesStorageMode,
} from "@/lib/storage/notes";

const COUNTS_EVENT = "job-tracker:refresh-counts";
const NOTES_EVENT = "job-tracker:refresh-notes";
function notifyNotesChanged() {
  window.dispatchEvent(new Event(NOTES_EVENT));
  window.dispatchEvent(new Event(COUNTS_EVENT));
}

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

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {}
  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function NotesPage() {
  const [mode, setMode] = useState<NotesStorageMode>("guest");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [expandedNote, setExpandedNote] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  // Load from storage (Supabase if signed in, else guest)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await migrateGuestNotesToUser().catch(() => {});
        const res = await loadNotes();
        if (!alive) return;
        setMode(res.mode);
        setNotes(res.items);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    notes.forEach((n) => (n.tags ?? []).forEach((t: string) => s.add(t)));
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();

    let res = notes.filter((n) => {
      const title = (n.title ?? "").toLowerCase();
      const content = (n.content ?? "").toLowerCase();
      const tags = (n.tags ?? []).map((t: string) => t.toLowerCase());

      const matchesQ =
        !q ||
        title.includes(q) ||
        content.includes(q) ||
        tags.some((t: string) => t.includes(q));

      const matchesTag =
        activeTag === "All" || (n.tags ?? []).includes(activeTag);

      const noteColor: ColorKey = (n.color ?? "gray") as ColorKey;
      const matchesColor = activeColor === "all" || noteColor === activeColor;

      return matchesQ && matchesTag && matchesColor;
    });

    res.sort((a, b) => {
      const ap = !!a.pinned;
      const bp = !!b.pinned;
      if (bp === ap) {
        return (
          new Date(b.updatedAt ?? 0).getTime() -
          new Date(a.updatedAt ?? 0).getTime()
        );
      }
      return (bp ? 1 : 0) - (ap ? 1 : 0);
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
    setDraftTitle(note.title ?? "");
    setDraftContent(note.content ?? "");
    setDraftTags((note.tags ?? []).join(", "));
    setDraftColor((note.color ?? "gray") as ColorKey);
    setIsDialogOpen(true);
  }

  async function saveEdit() {
    if (!editingId) return;

    const tags = draftTags
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    if (editingId === "new") {
      const newNote: Note = {
        id: makeId(),
        title: draftTitle || "Untitled note",
        content: draftContent,
        tags,
        color: draftColor,
        updatedAt: new Date().toISOString(),
        pinned: false,
      };

      setNotes((prev) => [newNote, ...prev]);

      const saved = await upsertNote(newNote, mode);

      if (saved.id !== newNote.id) {
        setNotes((prev) =>
          prev.map((n) => (n.id === newNote.id ? { ...saved } : n))
        );
      }

      setEditingId(null);
      setIsDialogOpen(false);
      notifyNotesChanged();
      return;
    }

    const updated: Note = {
      ...(notes.find((n) => n.id === editingId) ?? { id: editingId }),
      title: draftTitle || "Untitled note",
      content: draftContent,
      tags,
      color: draftColor,
      updatedAt: new Date().toISOString(),
    };

    setNotes((prev) => prev.map((n) => (n.id === editingId ? updated : n)));
    await upsertNote(updated, mode);

    setEditingId(null);
    setIsDialogOpen(false);
    notifyNotesChanged();
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setEditingId(null);
  }

  async function togglePin(id: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );

    const target = notes.find((n) => n.id === id);
    if (!target) return;

    await upsertNote({ ...target, pinned: !target.pinned }, mode);
    notifyNotesChanged();
  }

  function requestDelete(note: Note) {
    setDeleteTarget(note);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;

    setNotes((prev) => prev.filter((n) => n.id !== id));
    await deleteNote(id, mode);

    setDeleteTarget(null);
    notifyNotesChanged();
  }

  function cancelDelete() {
    setDeleteTarget(null);
  }

  const toggleExpanded = (id: string) =>
    setExpandedNote((s) => ({ ...s, [id]: !s[id] }));

  const noteCount = filtered.length;

  return (
    <>
      <section
        className={[
          "relative rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-fuchsia-50 via-white to-violet-50",
          "p-8 shadow-md overflow-hidden",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="flex items-center gap-2">
          <Image
            src="/icons/note.png"
            alt=""
            width={37}
            height={37}
            aria-hidden="true"
            className="shrink-0 -mt-1"
          />
          <h1 className="text-2xl font-semibold text-neutral-900">Notes</h1>
          <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-neutral-800 shadow-sm">
            {noteCount} note{noteCount === 1 ? "" : "s"}
          </span>
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
            <button
              type="button"
              onClick={openAddDialog}
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
            <div className="flex flex-wrap items-center gap-2">
              {allTags.map((t: string) => {
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
          {loading && (
            <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-neutral-200 bg-white/70 p-10 text-center">
              <p className="text-sm text-neutral-700">Loading notes…</p>
            </div>
          )}

          {!loading &&
            filtered.map((n) => {
              const color: ColorKey = (n.color ?? "gray") as ColorKey;
              const long = isLong(n.content ?? "");
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${COLOR_STYLES[color].dot}`}
                        aria-hidden="true"
                      />
                      <h2 className="text-sm font-semibold text-neutral-900">
                        {n.title ?? "Untitled note"}
                      </h2>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void togglePin(n.id)}
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

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Updated</span>
                      <time dateTime={n.updatedAt ?? ""}>
                        {n.updatedAt ? fmtDate(n.updatedAt) : "—"}
                      </time>
                    </span>

                    <div className="flex flex-wrap gap-1">
                      {(n.tags ?? []).map((t: string) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full border border-neutral-200 bg-white/70 px-2 py-0.5 text-[11px] text-neutral-700 backdrop-blur"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="whitespace-pre-line text-sm text-neutral-700">
                      {!expanded && long
                        ? truncateText(n.content ?? "")
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

          {!loading && filtered.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <div className="mb-2 text-5xl">📝</div>
              <p className="text-sm text-neutral-700">
                No notes match your filters.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteTarget && (
        <div
          className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12450] flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          onClick={cancelDelete}
        >
          <div
            className="absolute inset-0 bg-fuchsia-950/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          <div
            className="relative z-10 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <article className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-2xl p-5">
              <p className="text-sm font-semibold text-neutral-900">
                Delete this note?
              </p>
              <p className="mt-1 text-sm text-neutral-700">
                <span className="font-medium">
                  {deleteTarget.title ?? "Untitled"}
                </span>{" "}
                will be permanently removed.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                This action cannot be undone.
              </p>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDelete()}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-600 bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
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
          <div
            className="absolute inset-0 bg-fuchsia-950/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          <div
            className="relative z-10 w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <article
              style={{
                borderLeftWidth: 4,
                borderLeftColor: getColorHex(draftColor),
              }}
              className="relative flex flex-col rounded-xl border p-4 sm:p-5 shadow-2xl transition-all bg-gradient-to-br from-white via-white to-neutral-50 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-neutral-100/80"
            >
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
                        className={`h-7 w-7 rounded-full border transition ${
                          selected ? `ring-2 ${COLOR_STYLES[c].ring}` : "ring-0"
                        } ${
                          c === "yellow" || c === "gray"
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

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-neutral-800"
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
