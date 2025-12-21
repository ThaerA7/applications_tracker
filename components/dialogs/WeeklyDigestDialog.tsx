"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    X,
    Calendar,
    Briefcase,
    XCircle,
    PartyPopper,
    Clock,
} from "lucide-react";
import type { WeeklyDigestData } from "@/lib/services/notifications";

type Props = {
    open: boolean;
    onClose: () => void;
    data: WeeklyDigestData | null;
    loading?: boolean;
};

function formatDateRange(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const startStr = startDate.toLocaleDateString("en-US", opts);
    const endStr = endDate.toLocaleDateString("en-US", {
        ...opts,
        year: "numeric",
    });

    return `${startStr} – ${endStr}`;
}

function formatInterviewDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });

    if (days === 0) return `Today at ${timeStr}`;
    if (days === 1) return `Tomorrow at ${timeStr}`;
    if (days < 7) {
        const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
        return `${dayName} at ${timeStr}`;
    }

    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function StatCard({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: typeof Briefcase;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200/80 bg-white/70 p-3 shadow-sm">
            <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}
            >
                <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
                <p className="text-lg font-bold text-neutral-900">{value}</p>
                <p className="text-xs text-neutral-600">{label}</p>
            </div>
        </div>
    );
}

export default function WeeklyDigestDialog({
    open,
    onClose,
    data,
    loading = false,
}: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [open, onClose]);

    if (!open || !mounted) return null;

    const total = data
        ? data.applied + data.interviews + data.offers + data.rejected + data.withdrawn
        : 0;

    const dialog = (
        <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-[14000] flex items-center justify-center px-4 py-8">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
                aria-hidden="true"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="weekly-digest-title"
                className={[
                    "relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-indigo-200/80",
                    "bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-2xl backdrop-blur-sm",
                ].join(" ")}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative blobs */}
                <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-purple-400/20 blur-3xl" />

                {/* Header */}
                <div className="relative z-10 flex items-start justify-between border-b border-indigo-100/80 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <img
                            src="/icons/summary.png"
                            alt="Weekly Digest"
                            className="h-11 w-11 rounded-xl shadow-lg"
                        />
                        <div>
                            <h2
                                id="weekly-digest-title"
                                className="text-base font-semibold text-neutral-900"
                            >
                                Weekly Digest
                            </h2>
                            {data && (
                                <p className="mt-0.5 text-xs text-neutral-600">
                                    {formatDateRange(data.weekStart, data.weekEnd)}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className={[
                            "inline-flex h-8 w-8 items-center justify-center rounded-full",
                            "border border-neutral-200 bg-white/80 text-neutral-500 shadow-sm",
                            "hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300",
                        ].join(" ")}
                        aria-label="Close dialog"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Body */}
                <div className="relative z-10 px-5 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                        </div>
                    ) : data ? (
                        <div className="space-y-4">
                            {/* Summary message */}
                            <div className="rounded-xl border border-indigo-100/80 bg-white/90 p-4 shadow-sm">
                                {total > 0 ? (
                                    <p className="text-sm text-neutral-700">
                                        <span className="font-semibold text-indigo-600">
                                            Great progress!
                                        </span>{" "}
                                        You had{" "}
                                        <span className="font-semibold">{total} activities</span>{" "}
                                        last week. Keep up the momentum! 🚀
                                    </p>
                                ) : (
                                    <p className="text-sm text-neutral-700">
                                        <span className="font-semibold text-amber-600">
                                            No activity last week.
                                        </span>{" "}
                                        This week is a fresh start – let's make it count! 💪
                                    </p>
                                )}
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <StatCard
                                    icon={Briefcase}
                                    label="Applied"
                                    value={data.applied}
                                    color="bg-sky-500"
                                />
                                <StatCard
                                    icon={Calendar}
                                    label="Interviews"
                                    value={data.interviews}
                                    color="bg-emerald-500"
                                />
                                <StatCard
                                    icon={PartyPopper}
                                    label="Offers"
                                    value={data.offers}
                                    color="bg-lime-500"
                                />
                                <StatCard
                                    icon={XCircle}
                                    label="Rejected"
                                    value={data.rejected}
                                    color="bg-rose-500"
                                />
                            </div>

                            {/* Upcoming interviews */}
                            {data.upcomingInterviews.length > 0 && (
                                <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/50 p-4 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock className="h-4 w-4 text-emerald-600" />
                                        <h3 className="text-sm font-semibold text-emerald-800">
                                            Upcoming Interviews
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {data.upcomingInterviews.map((interview) => (
                                            <div
                                                key={interview.id}
                                                className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-sm"
                                            >
                                                <div>
                                                    <p className="font-medium text-neutral-900">
                                                        {interview.company}
                                                    </p>
                                                    <p className="text-xs text-neutral-600">
                                                        {interview.role}
                                                    </p>
                                                </div>
                                                <p className="text-xs font-medium text-emerald-700">
                                                    {formatInterviewDate(interview.date)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-10 text-center text-sm text-neutral-600">
                            No data available
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-end border-t border-indigo-100/80 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className={[
                                "inline-flex items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold shadow-sm",
                                "bg-gradient-to-r from-indigo-600 to-purple-600 text-white",
                                "hover:from-indigo-500 hover:to-purple-500",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-300",
                            ].join(" ")}
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(dialog, document.body);
}
