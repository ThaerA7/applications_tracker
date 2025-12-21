"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import SignInGateDialog from "@/components/dialogs/SignInGateDialog";
import WeeklyDigestDialog from "@/components/dialogs/WeeklyDigestDialog";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import RouteTransition from "@/components/layout/RouteTransition";
import {
  initializeNotifications,
  calculateWeeklyDigest,
  markDigestShown,
  WEEKLY_DIGEST_EVENT,
  type WeeklyDigestData,
} from "@/lib/services/notifications";

const STORAGE_KEY = "job-tracker:sidebar-collapsed";
const ALWAYS_COLLAPSED_KEY = "job-tracker:sidebar-always-collapsed";
const ALWAYS_COLLAPSED_EVENT = "job-tracker:set-sidebar-always-collapsed";
const SIGNIN_GATE_SHOWN_KEY = "job-tracker:signin-gate-shown";
const PREFS_KEY = "job-tracker:settings-preferences";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [alwaysCollapsed, setAlwaysCollapsed] = useState(false);
  const [signInGateDefaultOpen, setSignInGateDefaultOpen] = useState(false);
  const [digestOpen, setDigestOpen] = useState(false);
  const [digestData, setDigestData] = useState<WeeklyDigestData | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const pathname = usePathname();

  // Handle weekly digest dialog trigger
  const openDigestDialog = useCallback(async () => {
    setDigestOpen(true);
    setDigestLoading(true);
    try {
      const data = await calculateWeeklyDigest();
      setDigestData(data);
      markDigestShown();
    } catch (error) {
      console.error("Failed to calculate weekly digest:", error);
    } finally {
      setDigestLoading(false);
    }
  }, []);

  // Initialize notifications system
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load preferences
    let remindersEnabled = true;
    let digestEnabled = false;
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const prefs = JSON.parse(raw);
        remindersEnabled = prefs.reminders ?? true;
        digestEnabled = prefs.digest ?? false;
      }
    } catch { }

    // Listen for weekly digest event
    const handleDigestEvent = () => {
      openDigestDialog();
    };
    window.addEventListener(WEEKLY_DIGEST_EVENT, handleDigestEvent);

    // Initialize notification system
    const cleanup = initializeNotifications(remindersEnabled, digestEnabled);

    return () => {
      cleanup();
      window.removeEventListener(WEEKLY_DIGEST_EVENT, handleDigestEvent);
    };
  }, [openDigestDialog]);

  // Show the sign-in gate once on a user's first visit (per browser).
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const alreadyShown = window.localStorage.getItem(SIGNIN_GATE_SHOWN_KEY);
      if (alreadyShown === "1") return;

      window.localStorage.setItem(SIGNIN_GATE_SHOWN_KEY, "1");
      setSignInGateDefaultOpen(true);
    } catch {
      // If storage is blocked, fall back to not auto-opening.
    }
  }, []);

  // Load persisted state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1" || stored === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedAlways = window.localStorage.getItem(ALWAYS_COLLAPSED_KEY);
    const nextAlways = storedAlways === "1" || storedAlways === "true";
    setAlwaysCollapsed(nextAlways);
    if (nextAlways) setCollapsed(true);

    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent)?.detail as
        | { alwaysCollapsed?: unknown }
        | undefined;
      if (typeof detail?.alwaysCollapsed === "boolean") {
        setAlwaysCollapsed(detail.alwaysCollapsed);
        if (detail.alwaysCollapsed) setCollapsed(true);
      }
    };

    window.addEventListener(ALWAYS_COLLAPSED_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(ALWAYS_COLLAPSED_EVENT, handler as EventListener);
    };
  }, []);

  // Persist + drive CSS variable for layout
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");

    // w-64 = 16rem, w-20 = 5rem
    const width = collapsed ? "5rem" : "16rem";
    document.documentElement.style.setProperty("--sidebar-width", width);
  }, [collapsed]);

  return (
    <>
      <SignInGateDialog defaultOpen={signInGateDefaultOpen} />
      <WeeklyDigestDialog
        open={digestOpen}
        onClose={() => setDigestOpen(false)}
        data={digestData}
        loading={digestLoading}
      />

      <Sidebar collapsed={collapsed} />
      <div className="min-h-screen pl-[var(--sidebar-width)] transition-[padding-left] duration-200">
        <TopBar
          collapsed={collapsed}
          onToggleSidebar={() =>
            setCollapsed((prev) => (alwaysCollapsed ? true : !prev))
          }
        />
        <main className="min-h-screen bg-white">
          <RouteTransition triggerKey={pathname} fadeOutMs={820} fadeInMs={760}>
            <div className="w-full px-5 py-5">{children}</div>
          </RouteTransition>
        </main>
      </div>
    </>
  );
}
