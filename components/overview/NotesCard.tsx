// app/components/NotesOverviewCard.tsx

"use client";

import { useState } from "react";
import { FileText, Palette, Plus, Tag, Save, X } from "lucide-react";

type ColorKey =
  | "gray"
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "pink"
  | "purple";

type OverviewNote = {
  id: number;
  title: string;
  preview: string;
  tags: string[];
  color: ColorKey;
};

const INITIAL_OVERVIEW_NOTES: OverviewNote[] = [
  {
    id: 1,
    title: "Globex — Phone screen prep",
    preview:
      "Review behavioral stories (STAR), brush up on async patterns in TS, and common React perf pitfalls.\n\nQuestions to ask: team structure, on-call, growth path.",
    tags: ["Interview", "Prep", "Phone screen"],
    color: "yellow",
  },
  {
    id: 2,
    title: "Acme — Frontend system design",
    preview:
      "Component architecture, state boundaries, data fetching patterns (React Server Components + caching). Consider monitoring/observability.",
    tags: ["System design", "Frontend", "Architecture"],
    color: "blue",
  },
  {
    id: 3,
    title: "Research: Stripe career site",
    preview:
      "Look for roles aligned with DX and UI platforms. Note interview format; collect links to recent posts.",
    tags: ["Research", "Stripe", "Career site"],
    color: "gray",
  },
];

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

const LONG_PRESS_MS = 450;

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

/** Turn comma-separated input into tags; always return at least one. */
function parseTags(raw: string): string[] {
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length ? tags : ["Note"];
}

export default function NotesOverviewCard() {
  const [overviewNotes, setOverviewNotes] =
    useState<OverviewNote[]>(INITIAL_OVERVIEW_NOTES);

  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogContent, setDialogContent] = useState("");
  const [dialogTags, setDialogTags] = useState("");
  const [dialogColor, setDialogColor] = useState<ColorKey>("gray");

  const [editingNote, setEditingNote] = useState<OverviewNote | null>(null);
  const [longPressTimeoutId, setLongPressTimeoutId] = useState<number | null>(
    null
  );

  const openAddDialog = () => {
    setEditingNote(null);
    setDialogTitle("");
    setDialogContent("");
    setDialogTags("");
    setDialogColor("gray");
    setIsNoteDialogOpen(true);
  };

  const openEditDialog = (note: OverviewNote) => {
    setEditingNote(note);
    setDialogTitle(note.title);
    setDialogContent(note.preview);
    setDialogTags(note.tags.join(", "));
    setDialogColor(note.color);
    setIsNoteDialogOpen(true);
  };

  const closeNoteDialog = () => {
    setIsNoteDialogOpen(false);
    setEditingNote(null);
  };

  const handleSaveNote = () => {
    const title = dialogTitle.trim() || "Untitled note";
    const content = dialogContent.trim() || "Empty note";
    const tags = parseTags(dialogTags);

    setOverviewNotes((prev) => {
      if (editingNote) {
        // Update existing note
        return prev.map((n) =>
          n.id === editingNote.id
            ? {
                ...editingNote,
                title,
                preview: content,
                tags,
                color: dialogColor,
              }
            : n
        );
      }

      // Add new note
      const newNote: OverviewNote = {
        id: Date.now(),
        title,
        preview: content,
        tags,
        color: dialogColor,
      };

      return [newNote, ...prev].slice(0, 3);
    });

    closeNoteDialog();
  };

  const startLongPress = (note: OverviewNote) => {
    const id = window.setTimeout(() => {
      openEditDialog(note);
    }, LONG_PRESS_MS);
    setLongPressTimeoutId(id);
  };

  const cancelLongPress = () => {
    if (longPressTimeoutId != null) {
      window.clearTimeout(longPressTimeoutId);
      setLongPressTimeoutId(null);
    }
  };

  return (
    <>
      <section
        className={[
          "relative overflow-hidden rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-white via-slate-50 to-amber-50",
          "p-5 shadow-md",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute -top-16 -left-20 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-white/80 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm">
                <FileText className="h-3.5 w-3.5" />
                <span>Notes</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-neutral-900">
                Things to remember
              </p>
              <p className="mt-1 text-[11px] text-neutral-600">
                Keep your key notes visible and easy to review while you apply
                and prepare for interviews.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddDialog}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {overviewNotes.map((note) => (
              <article
                key={note.id}
                className={[
                  "relative flex flex-col rounded-xl border p-3 text-sm shadow-sm transition-all",
                  "bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90",
                  "border-neutral-200/80 hover:-translate-y-0.5 hover:shadow-md",
                  "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-xl before:bg-gradient-to-b before:opacity-90",
                  "cursor-pointer",
                  COLOR_ACCENT[note.color],
                ].join(" ")}
                onMouseDown={() => startLongPress(note)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(note)}
                onTouchEnd={cancelLongPress}
                onTouchCancel={cancelLongPress}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-neutral-900">
                    {note.title}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                    <Tag className="h-3 w-3" />
                    <span>{note.tags.slice(0, 3).join(" · ")}</span>
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] text-neutral-600 whitespace-pre-line">
                  {note.preview}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* NOTE DIALOG – positioned like ScheduleInterviewDialog */}
      {isNoteDialogOpen && (
        <div
          className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12500] flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          onClick={closeNoteDialog}
        >
          {/* Backdrop (click to close) */}
          <div
            className="absolute inset-0 bg-emerald-950/40"
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
                borderLeftColor: getColorHex(dialogColor),
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
                  className={`inline-block h-2.5 w-2.5 rounded-full ${COLOR_STYLES[dialogColor].dot}`}
                  aria-hidden="true"
                />
                <input
                  value={dialogTitle}
                  onChange={(e) => setDialogTitle(e.target.value)}
                  aria-label="Note title"
                  placeholder="Note title"
                  className="h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/40"
                />
              </div>

              {/* Content */}
              <div className="mt-3">
                <label htmlFor="overview-dialog-content" className="sr-only">
                  Note content
                </label>
                <textarea
                  id="overview-dialog-content"
                  value={dialogContent}
                  onChange={(e) => setDialogContent(e.target.value)}
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
                    const selected = dialogColor === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDialogColor(c)}
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

              {/* Tags */}
              <div className="mt-3">
                <label
                  htmlFor="overview-dialog-tags"
                  className="block text-xs text-neutral-600"
                >
                  Tags (comma-separated)
                </label>
                <input
                  id="overview-dialog-tags"
                  value={dialogTags}
                  onChange={(e) => setDialogTags(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/40"
                  placeholder="e.g. interview, prep, phone screen"
                />
              </div>

              {/* Footer – Cancel / Save at the bottom */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeNoteDialog}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"
                  aria-label="Cancel"
                  title="Cancel"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
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
