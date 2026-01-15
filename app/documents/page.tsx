"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Lightbulb,
  Pin,
  PinOff,
  Tag,
  CalendarDays,
  Edit3,
  Trash2,
  Save,
  X,
  Maximize2,
  FileText,
  Upload,
  Download,
} from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { animateCardExit } from "@/components/dialogs/cardExitAnimation";

import ThreeBounceSpinner from "@/components/ui/ThreeBounceSpinner";

import {
  loadDocuments,
  upsertDocument,
  deleteDocument,
  migrateGuestDocumentsToUser,
  uploadDocumentFile,
  deleteDocumentFile,
  downloadDocumentFile,
  type Document,
  type DocumentsStorageMode,
} from "@/lib/services/documents";

const COUNTS_EVENT = "job-tracker:refresh-counts";
const DOCUMENTS_EVENT = "job-tracker:refresh-documents";
const VIEW_CONTENT_PLACEHOLDER = "No content yet.";
function notifyDocumentsChanged() {
  window.dispatchEvent(new Event(DOCUMENTS_EVENT));
  window.dispatchEvent(new Event(COUNTS_EVENT));
}

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

function normalizeViewContent(value: string, initial: string) {
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");
  const lines = normalized.split("\n");
  while (lines.length && lines[0].trim() === "") lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  const collapsed = lines.join("\n");
  const trimmed = collapsed.trim();
  if (!initial && trimmed === VIEW_CONTENT_PLACEHOLDER) {
    return "";
  }
  return collapsed;
}

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch { }
  return `document-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type DocumentDraftSnapshot = {
  title: string;
  tags: string;
  file?: File | null;
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

export default function DocumentsPage() {
  const pathname = usePathname();
  const isActiveRoute = pathname === "/documents";

  const [mode, setMode] = useState<DocumentsStorageMode>("guest");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTag, setActiveTag] = useState<string>("All");

  // dialog state (for add + edit)
  const [editingId, setEditingId] = useState<string | null>(null); // "new" for add
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogSnapshot, setDialogSnapshot] = useState<DocumentDraftSnapshot | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedDocument, setExpandedDocument] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [viewContent, setViewContent] = useState("");
  const viewContentRef = useRef("");
  const viewInitialContentRef = useRef("");

  // Helper to get file preview URL
  const getFilePreviewUrl = (doc: Document): string | null => {
    if (doc.fileUrl) return doc.fileUrl;
    if (doc.fileData && doc.fileType?.startsWith("image/")) {
      return doc.fileData;
    }
    return null;
  };

  // Helper to check if file is previewable
  const isPreviewable = (doc: Document): boolean => {
    if (!doc.fileType) return false;
    return doc.fileType.startsWith("image/") || doc.fileType === "application/pdf";
  };

  // Load from storage (Supabase if signed in, else guest)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await migrateGuestDocumentsToUser().catch(() => { });
        const res = await loadDocuments();
        if (!alive) return;
        setMode(res.mode);
        setDocuments(res.items);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    // no-op (intentionally no warm cache)
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    documents.forEach((d) => (d.tags ?? []).forEach((t: string) => s.add(t)));
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [documents]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();

    const res = documents.filter((d) => {
      const title = (d.title ?? "").toLowerCase();
      const content = (d.content ?? "").toLowerCase();
      const fileName = (d.fileName ?? "").toLowerCase();
      const tags = (d.tags ?? []).map((t: string) => t.toLowerCase());

      const matchesQ =
        !q ||
        title.includes(q) ||
        content.includes(q) ||
        fileName.includes(q) ||
        tags.some((t: string) => t.includes(q));

      const matchesTag =
        activeTag === "All" || (d.tags ?? []).includes(activeTag);

      return matchesQ && matchesTag;
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
  }, [documents, query, activeTag]);

  const isDialogDirty =
    isDialogOpen &&
    !!dialogSnapshot &&
    (draftTitle !== dialogSnapshot.title ||
      draftTags !== dialogSnapshot.tags ||
      selectedFile !== dialogSnapshot.file);

  function openAddDialog() {
    const snapshot: DocumentDraftSnapshot = {
      title: "",
      tags: "",
      file: null,
    };

    setEditingId("new");
    setDraftTitle(snapshot.title);
    setDraftContent("");
    setDraftTags(snapshot.tags);
    setSelectedFile(null);
    setDialogSnapshot(snapshot);
    setIsDialogOpen(true);
  }

  function startEdit(document: Document) {
    const snapshot: DocumentDraftSnapshot = {
      title: document.title ?? "",
      tags: (document.tags ?? []).join(", "),
      file: null,
    };

    setEditingId(document.id);
    setDraftTitle(snapshot.title);
    setDraftContent(document.content ?? "");
    setDraftTags(snapshot.tags);
    setSelectedFile(null);
    setDialogSnapshot(snapshot);
    setIsDialogOpen(true);
  }

  function openView(document: Document) {
    const content = document.content ?? "";
    setViewingDocument(document);
    setViewContent(content);
    viewContentRef.current = content;
    viewInitialContentRef.current = content;
  }

  async function saveEdit() {
    if (!editingId) return;

    const tags = draftTags
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    setUploadingFile(true);

    try {
      if (editingId === "new") {
        // Require file for new documents
        if (!selectedFile) {
          alert("Please select a file to upload");
          setUploadingFile(false);
          return;
        }

        const newDocument: Document = {
          id: makeId(),
          title: draftTitle || selectedFile?.name || "Untitled document",
          content: draftContent || "",
          tags,
          updatedAt: new Date().toISOString(),
          pinned: false,
        };

        // Upload file if selected
        if (selectedFile) {
          const uploadResult = await uploadDocumentFile(selectedFile, newDocument.id, mode);
          if (uploadResult) {
            newDocument.fileName = uploadResult.fileName;
            newDocument.fileUrl = uploadResult.url;
            newDocument.fileSize = uploadResult.fileSize;
            newDocument.fileType = uploadResult.fileType;
            newDocument.fileData = uploadResult.fileData;
          }
        }

        setDocuments((prev) => [newDocument, ...prev]);

        const saved = await upsertDocument(newDocument, mode);

        if (saved.id !== newDocument.id) {
          setDocuments((prev) =>
            prev.map((d) => (d.id === newDocument.id ? { ...saved } : d))
          );
        }

        setEditingId(null);
        setIsDialogOpen(false);
        setDialogSnapshot(null);
        setSelectedFile(null);
        notifyDocumentsChanged();
        return;
      }

      const existing = documents.find((d) => d.id === editingId);
      const updated: Document = {
        ...(existing ?? { id: editingId }),
        title: draftTitle || "Untitled document",
        content: draftContent || "",
        tags,
        updatedAt: new Date().toISOString(),
      };

      // Upload new file if selected
      if (selectedFile) {
        // Delete old file if exists (only for authenticated users with Supabase URLs)
        if (existing?.fileUrl && mode === "user") {
          await deleteDocumentFile(existing.fileUrl);
        }

        const uploadResult = await uploadDocumentFile(selectedFile, editingId, mode);
        if (uploadResult) {
          updated.fileName = uploadResult.fileName;
          updated.fileUrl = uploadResult.url;
          updated.fileSize = uploadResult.fileSize;
          updated.fileType = uploadResult.fileType;
          updated.fileData = uploadResult.fileData;
        }
      }

      setDocuments((prev) => prev.map((d) => (d.id === editingId ? updated : d)));
      await upsertDocument(updated, mode);

      setEditingId(null);
      setIsDialogOpen(false);
      setDialogSnapshot(null);
      setSelectedFile(null);
      notifyDocumentsChanged();
    } finally {
      setUploadingFile(false);
    }
  }

  function closeDialog(force = false) {
    if (!force && isDialogDirty) return;
    setIsDialogOpen(false);
    setEditingId(null);
    setDialogSnapshot(null);
  }

  function closeViewDialog(force = false) {
    if (!force && viewingDocument) {
      const initial = viewInitialContentRef.current;
      const current = viewContentRef.current;
      const normalizedInitial = normalizeViewContent(initial, initial);
      const normalizedCurrent = normalizeViewContent(current, initial);

      if (normalizedCurrent !== normalizedInitial) return;
    }

    setViewingDocument(null);
  }

  async function togglePin(id: string) {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, pinned: !d.pinned } : d))
    );

    const target = documents.find((d) => d.id === id);
    if (!target) return;

    await upsertDocument({ ...target, pinned: !target.pinned }, mode);
    notifyDocumentsChanged();
  }

  function requestDelete(document: Document) {
    setDeleteTarget(document);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const elementId = `document-card-${id}`;

    animateCardExit(elementId, "delete", async () => {
      // Delete file from storage if exists (only for authenticated users)
      if (deleteTarget?.fileUrl && mode === "user") {
        await deleteDocumentFile(deleteTarget.fileUrl);
      }
      // For guest users, fileData is stored in the document itself, so it will be removed with the document

      setDocuments((prev) => prev.filter((d) => d.id !== id));
      await deleteDocument(id, mode);

      setDeleteTarget(null);
      notifyDocumentsChanged();
    });
  }

  function cancelDelete() {
    setDeleteTarget(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title if empty
      if (!draftTitle) {
        setDraftTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }

  function handleFileRemove() {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const toggleExpanded = (id: string) =>
    setExpandedDocument((s) => ({ ...s, [id]: !s[id] }));

  const documentCount = filtered.length;
  const headerTips = [
    "Tip: Store resumes, cover letters, and references.",
    "Tip: Keep important documents organized with tags.",
  ];

  return (
    <>
      <section
        className={[
          "relative rounded-2xl border border-neutral-200/70",
          "bg-gradient-to-br from-blue-50 via-white to-indigo-50",
          "p-8 shadow-md overflow-hidden",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Image
                src="/icons/documents.png"
                alt=""
                width={37}
                height={37}
                aria-hidden="true"
                className="shrink-0 -mt-1"
              />
              <h1 className="text-2xl font-semibold text-neutral-900">Documents</h1>
              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-neutral-800 shadow-sm">
                {documentCount} document{documentCount === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 text-neutral-700">
              Store resumes, cover letters, and important documents.
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-end gap-2">
            {headerTips.map((tip) => (
              <div key={tip} className="flex items-center justify-end">
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm">
                  <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  <span className="text-neutral-700">{tip}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search documents by title, text, or tag…"
              aria-label="Search documents"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={[
                "h-11 w-full rounded-lg pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500",
                "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                "border border-neutral-200 shadow-sm",
                "hover:bg-white focus:bg-white",
                "ring-1 ring-transparent",
                "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300",
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
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-300",
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
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-300",
              ].join(" ")}
              aria-expanded={showFilters}
              aria-controls="documents-filters"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filter
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div
            id="documents-filters"
            className="mt-3 relative rounded-lg border border-neutral-200 bg-white/70 p-3 backdrop-blur supports-[backdrop-filter]:bg-white/60"
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
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100",
                    ].join(" ")}
                  >
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              {isActiveRoute ? <ThreeBounceSpinner label="Loading documents" /> : null}
            </div>
          ) : (
            filtered.map((d) => {
              const long = isLong(d.content ?? "");
              const expanded = !!expandedDocument[d.id];

              return (
                <article
                  key={d.id}
                  id={`document-card-${d.id}`}
                  className={[
                    "relative flex flex-col rounded-xl border shadow-sm transition-all",
                    "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70",
                    "border-neutral-200/80 hover:-translate-y-0.5 hover:shadow-md",
                    "overflow-hidden",
                  ].join(" ")}
                >
                  {/* File Preview */}
                  {isPreviewable(d) && (
                    <div className="w-full bg-neutral-50">
                      {d.fileType?.startsWith("image/") && (
                        <img
                          src={getFilePreviewUrl(d)!}
                          alt={d.title || "Document preview"}
                          className="w-full h-auto max-h-80 object-cover"
                        />
                      )}
                      {d.fileType === "application/pdf" && (d.fileUrl || d.fileData) && (
                        <iframe
                          src={d.fileUrl ? `${d.fileUrl}#view=FitH` : d.fileData!}
                          className="w-full h-80"
                          title={d.title || "PDF preview"}
                        />
                      )}
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="p-4">
                    <h2 className="text-sm font-semibold text-neutral-900 line-clamp-1">
                      {d.title ?? d.fileName ?? "Untitled document"}
                    </h2>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        <time dateTime={d.updatedAt ?? ""}>
                          {d.updatedAt ? fmtDate(d.updatedAt) : "—"}
                        </time>
                      </span>

                      {d.fileName && d.fileSize && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                          <FileText className="h-3 w-3" aria-hidden="true" />
                          {formatFileSize(d.fileSize)}
                        </span>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {(d.tags ?? []).map((t: string) => (
                          <span
                            key={t}
                            className="inline-flex items-center rounded-full border border-neutral-200 bg-white/70 px-2 py-0.5 text-[11px] text-neutral-700 backdrop-blur"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Show content only if exists and no file preview */}
                    {d.content && !isPreviewable(d) && (
                      <div className="mt-3">
                        <p className="whitespace-pre-line text-sm text-neutral-700 line-clamp-3">
                          {d.content}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex items-center gap-2 pt-3 border-t border-neutral-200">
                      {(d.fileUrl || d.fileData) && d.fileName && (
                        <button
                          type="button"
                          onClick={() => downloadDocumentFile(d)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          Download
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void togglePin(d.id)}
                        className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white/70 p-2 text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        aria-label={d.pinned ? "Unpin document" : "Pin document"}
                        title={d.pinned ? "Unpin" : "Pin"}
                      >
                        {d.pinned ? (
                          <Pin className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <PinOff className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openView(d)}
                        className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white/70 p-2 text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                        aria-label="View full document"
                        title="View Full"
                      >
                        <Maximize2 className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(d)}
                        className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white/70 p-2 text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        aria-label="Edit document"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => requestDelete(d)}
                        className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white/70 p-2 text-neutral-700 shadow-sm hover:bg-white hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                        aria-label="Delete document"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}

          {!loading && filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/70 p-10 text-center backdrop-blur">
              <div className="mb-2 text-5xl">📄</div>
              <p className="text-sm font-semibold text-neutral-900">
                No documents match your filters.
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                Try clearing filters or add a new document.
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
            className="absolute inset-0 bg-blue-950/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          <div
            className="relative z-10 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <article className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-2xl p-5">
              <p className="text-sm font-semibold text-neutral-900">
                Delete this document?
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
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
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

      {/* DOCUMENT DIALOG */}
      {isDialogOpen && (
        <div
          className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12500] flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          onClick={() => closeDialog()}
        >
          <div
            className="absolute inset-0 bg-blue-950/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          <div
            className="relative z-10 w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <article
              style={{
                borderLeftWidth: 4,
                borderLeftColor: "#3B82F6",
              }}
              className="relative flex flex-col rounded-xl border p-4 sm:p-5 shadow-2xl transition-all bg-gradient-to-br from-white via-white to-neutral-50 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-neutral-100/80"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  aria-label="Document title"
                  placeholder="Document title (optional - will use filename)"
                  className="h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-300/40"
                />
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-neutral-700 mb-2">
                  Upload Document *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Choose File
                  </label>
                  {selectedFile && (
                    <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 text-blue-600" aria-hidden="true" />
                      <span className="text-blue-700 font-medium">{selectedFile.name}</span>
                      <span className="text-blue-600">({formatFileSize(selectedFile.size)})</span>
                      <button
                        type="button"
                        onClick={handleFileRemove}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Supported formats: PDF, DOC, DOCX, TXT, PNG, JPG
                </p>
              </div>

              <div className="mt-3">
                <label
                  htmlFor="documents-dialog-tags"
                  className="block text-xs text-neutral-600"
                >
                  Tags (comma-separated)
                </label>
                <input
                  id="documents-dialog-tags"
                  value={draftTags}
                  onChange={(e) => setDraftTags(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-300/40"
                  placeholder="e.g. resume, cover letter"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => closeDialog(true)}
                  disabled={uploadingFile}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  disabled={uploadingFile}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingFile ? (
                    <>
                      <ThreeBounceSpinner label="" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3" aria-hidden="true" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* VIEW FULL DOCUMENT DIALOG */}
      {viewingDocument && (
        <div
          className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[12600] flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          onClick={() => closeViewDialog()}
        >
          <div
            className="absolute inset-0 bg-indigo-950/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          <div
            className="relative z-10 w-full h-screen flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full max-w-6xl max-h-[90vh] rounded-lg overflow-visible shadow-2xl">
              {/* Document Viewer */}
              {viewingDocument.fileType?.startsWith("image/") && (
                <img
                  src={getFilePreviewUrl(viewingDocument)!}
                  alt={viewingDocument.title || "Document"}
                  className="w-full h-full object-contain bg-neutral-900 rounded-lg"
                />
              )}
              {viewingDocument.fileType === "application/pdf" && (viewingDocument.fileUrl || viewingDocument.fileData) && (
                <iframe
                  src={viewingDocument.fileUrl ? `${viewingDocument.fileUrl}#view=FitH` : viewingDocument.fileData!}
                  className="w-full h-full border-0 rounded-lg"
                />
              )}
              {!isPreviewable(viewingDocument) && (
                <div className="w-full h-full bg-white flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-neutral-300 mx-auto mb-3" />
                    <p className="text-sm text-neutral-500">No preview available</p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => closeViewDialog(true)}
              className="absolute top-6 right-6 z-50 rounded-full bg-white border border-neutral-300 p-2.5 text-neutral-700 shadow-lg hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
