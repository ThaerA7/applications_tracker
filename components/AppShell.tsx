"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SignInGateDialog from "@/components/dialogs/SignInGateDialog";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import RouteTransition from "@/components/RouteTransition";

const STORAGE_KEY = "job-tracker:sidebar-collapsed";
const ALWAYS_COLLAPSED_KEY = "job-tracker:sidebar-always-collapsed";
const ALWAYS_COLLAPSED_EVENT = "job-tracker:set-sidebar-always-collapsed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [alwaysCollapsed, setAlwaysCollapsed] = useState(false);
  const pathname = usePathname();

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
      <SignInGateDialog defaultOpen={false} />

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
