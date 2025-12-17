"use client";

import { useEffect, useState } from "react";
import SignInGateDialog from "@/components/dialogs/SignInGateDialog";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";

const STORAGE_KEY = "job-tracker:sidebar-collapsed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // Load persisted state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1" || stored === "true") {
      setCollapsed(true);
    }
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
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
        />
        <main className="min-h-screen bg-white">
          <div className="w-full px-5 py-5">{children}</div>
        </main>
      </div>
    </>
  );
}
