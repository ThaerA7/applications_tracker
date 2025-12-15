"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, UserRound } from "lucide-react";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";

const ROUTES: Record<string, { title: string }> = {
  "/": { title: "Overview" },
  "/applied": { title: "Applied" },
  "/interviews": { title: "Interviews" },
  "/job-search": { title: "Job Search" },
  "/offers-received": { title: "Offers" },
  "/rejected": { title: "Rejected" },
  "/withdrawn": { title: "Withdrawn" },
  "/wishlist": { title: "Wishlist" },
  "/calendar": { title: "Calendar" },
  "/notes": { title: "Notes" },
  "/settings": { title: "Settings" },
};

type Accent = {
  washFrom: string;
  barFrom: string;
  barTo: string;
  focus: string;
};

const ACCENTS: Record<string, Accent> = {
  "/": {
    washFrom: "from-sky-50",
    barFrom: "after:from-sky-500",
    barTo: "after:to-sky-400",
    focus: "focus-visible:ring-sky-300",
  },
  "/applied": {
    washFrom: "from-sky-50",
    barFrom: "after:from-sky-500",
    barTo: "after:to-fuchsia-500",
    focus: "focus-visible:ring-sky-300",
  },
  "/interviews": {
    washFrom: "from-emerald-50",
    barFrom: "after:from-emerald-500",
    barTo: "after:to-teal-500",
    focus: "focus-visible:ring-emerald-300",
  },
  "/job-search": {
    washFrom: "from-amber-50",
    barFrom: "after:from-amber-500",
    barTo: "after:to-orange-500",
    focus: "focus-visible:ring-amber-300",
  },
  "/offers-received": {
    washFrom: "from-lime-50",
    barFrom: "after:from-lime-500",
    barTo: "after:to-emerald-500",
    focus: "focus-visible:ring-lime-300",
  },
  "/rejected": {
    washFrom: "from-rose-50",
    barFrom: "after:from-rose-500",
    barTo: "after:to-pink-500",
    focus: "focus-visible:ring-rose-300",
  },
  "/withdrawn": {
    washFrom: "from-amber-50",
    barFrom: "after:from-amber-500",
    barTo: "after:to-rose-500",
    focus: "focus-visible:ring-amber-300",
  },
  "/wishlist": {
    washFrom: "from-yellow-50",
    barFrom: "after:from-yellow-500",
    barTo: "after:to-amber-400",
    focus: "focus-visible:ring-yellow-300",
  },
  "/calendar": {
    washFrom: "from-indigo-50",
    barFrom: "after:from-indigo-500",
    barTo: "after:to-sky-500",
    focus: "focus-visible:ring-indigo-300",
  },
  "/notes": {
    washFrom: "from-fuchsia-50",
    barFrom: "after:from-fuchsia-500",
    barTo: "after:to-violet-500",
    focus: "focus-visible:ring-fuchsia-300",
  },
  "/settings": {
    washFrom: "from-slate-50",
    barFrom: "after:from-slate-500",
    barTo: "after:to-neutral-500",
    focus: "focus-visible:ring-slate-300",
  },
};

type TopBarProps = {
  collapsed: boolean;
  onToggleSidebar: () => void;
};

function ConfirmLogoutDialog({
  open,
  onClose,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // scroll lock
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />

      {/* Dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          className={[
            "relative w-full max-w-[520px]",
            "rounded-[22px] p-[1px]",
            "bg-gradient-to-br from-rose-200/70 via-orange-100/50 to-amber-100/60",
            "shadow-[0_20px_70px_-20px_rgba(0,0,0,0.35)]",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
            className={[
              "relative overflow-hidden rounded-[21px]",
              "bg-white ring-1 ring-black/5",
            ].join(" ")}
          >
            {/* Soft glow accents */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3
                    id="logout-title"
                    className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900"
                  >
                    Log out of your account?
                  </h3>

                  <p
                    id="logout-desc"
                    className="mt-2 text-sm sm:text-base text-neutral-600"
                  >
                    You’ll be signed out on this device. Your synced data will
                    remain safe in your account.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={!!busy}
                  className={[
                    "inline-flex items-center justify-center",
                    "rounded-xl px-4 py-2.5 text-sm font-medium",
                    "border border-neutral-200",
                    "bg-white hover:bg-neutral-50",
                    "text-neutral-900",
                    "shadow-sm",
                    "transition active:scale-[0.99]",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300",
                  ].join(" ")}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={!!busy}
                  className={[
                    "inline-flex items-center justify-center gap-2",
                    "rounded-xl px-4 py-2.5 text-sm font-semibold",
                    "bg-rose-600 text-white",
                    "hover:bg-rose-700",
                    "shadow-sm",
                    "transition active:scale-[0.99]",
                    "disabled:opacity-70 disabled:cursor-not-allowed",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300",
                  ].join(" ")}
                >
                  <LogOut className="h-4 w-4" />
                  {busy ? "Logging out..." : "Log out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopBar({ collapsed, onToggleSidebar }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeKey =
    Object.keys(ROUTES)
      .sort((a, b) => b.length - a.length)
      .find((key) => pathname.startsWith(key)) || "/";

  const { title } = ROUTES[activeKey];
  const accent = ACCENTS[activeKey];

  const [user, setUser] = useState<User | null>(null);

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Load session + subscribe
  // Load session + subscribe
useEffect(() => {
  const supabase = getSupabaseClient();
  let active = true;

  supabase.auth
    .getSession()
    .then(({ data }: { data: { session: Session | null } }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
    });

  const { data: sub } = supabase.auth.onAuthStateChange(
    (_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    }
  );

  return () => {
    active = false;
    sub.subscription.unsubscribe();
  };
}, []);


  const avatarLabel = useMemo(() => {
    if (!user) return "Guest";

    const meta = user.user_metadata as Record<string, any> | undefined;

    const name =
      meta?.full_name || meta?.name || meta?.given_name || meta?.first_name;

    if (name) return name;

    if (user.email) {
      const local = user.email.split("@")[0] ?? "";
      return local.replace(/[._-]+/g, " ").trim() || user.email;
    }

    return "User";
  }, [user]);

  const avatarInitial = useMemo(() => {
    const txt = (avatarLabel || "").trim();
    return txt ? txt[0].toUpperCase() : "U";
  }, [avatarLabel]);

  const openSignInGate = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("job-tracker:open-signin-gate"));
  }, []);

  const confirmLogout = useCallback(() => {
    setLogoutOpen(true);
  }, []);

  

      const handleLogout = useCallback(async () => {
    if (loggingOut) return;

    setLogoutOpen(false);
    setLoggingOut(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out failed:", error.message);
      }

      // The onAuthStateChange listener in this component will clear `user`
      router.refresh();
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut, router]);



  return (
    <>
      <ConfirmLogoutDialog
        open={logoutOpen}
        busy={loggingOut}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />

      <header
        className={[
          "sticky top-0 z-40 shadow-lg",
          "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
          "relative bg-gradient-to-r to-transparent",
          accent.washFrom,
        ].join(" ")}
      >
        {/* keep 5px padding left/right */}
        <div className="w-full h-14 pl-[15px] pr-[15px] flex items-center justify-between">
          {/* Left: collapse icon + title */}
          <div className="flex items-center gap-2 sm:gap-2">
            <button
              type="button"
              onClick={onToggleSidebar}
              className={[
                "inline-flex items-center justify-center p-1.5",
                "text-neutral-700 hover:text-neutral-900",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                accent.focus,
              ].join(" ")}
              aria-label={
                collapsed ? "Expand navigation" : "Collapse navigation"
              }
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>

            <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
          </div>

          {/* Right: auth-aware area */}
          <div className="flex items-center gap-3">
            {/* Avatar / Guest badge */}
            <div
              className={[
                "grid h-8 w-8 place-items-center rounded-full",
                user
                  ? "bg-neutral-200/80 text-neutral-700 ring-1 ring-neutral-300"
                  : "bg-amber-100/80 text-amber-800 ring-1 ring-amber-200",
                "text-sm font-semibold",
              ].join(" ")}
              aria-label={user ? "User avatar" : "Guest"}
              title={avatarLabel}
            >
              {user ? (
                avatarInitial
              ) : (
                // ✅ Always show guest avatar icon unless signed in
                <UserRound className="h-4 w-4" aria-hidden="true" />
              )}
            </div>

            {user ? (
              <button
                type="button"
                onClick={confirmLogout}
                className={[
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                  "text-red-600",
                  "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                  "border border-red-200/60 shadow-sm",
                  "transition-colors duration-150",
                  "hover:bg-rose-50 hover:border-rose-300/70 hover:text-rose-700",
                  "active:bg-rose-100",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-300",
                ].join(" ")}
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log out
              </button>
            ) : (
              <button
                type="button"
                onClick={openSignInGate}
                className={[
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                  "text-neutral-900",
                  "bg-white/80",
                  "border border-neutral-200 shadow-sm",
                  "transition-colors duration-150",
                  "hover:bg-sky-50 hover:border-sky-200 hover:text-sky-900",
                  "active:bg-sky-100",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  accent.focus,
                ].join(" ")}
                aria-label="Sign in"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
