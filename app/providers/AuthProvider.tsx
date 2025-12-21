"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { setCachedSession } from "@/lib/supabase/sessionCache";
import { migrateGuestAppliedToUser } from "@/lib/services/applied";
import { migrateGuestInterviewsToUser } from "@/lib/services/interviews";
import { migrateGuestRejectedToUser } from "@/lib/services/rejected";
import { migrateGuestWithdrawnToUser } from "@/lib/services/withdrawn";
import { migrateGuestOffersToUser } from "@/lib/services/offers";
import { migrateGuestWishlistToUser } from "@/lib/services/wishlist";
import { migrateGuestNotesToUser } from "@/lib/services/notes";
import { migrateGuestActivityToUser } from "@/lib/services/activity";

const COUNTS_EVENT = "job-tracker:refresh-counts";
const NOTES_EVENT = "job-tracker:refresh-notes";
const ACTIVITY_EVENT = "job-tracker:refresh-activity";
const AUTH_EVENT = "job-tracker:auth-changed";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = getSupabaseClient();

    let disposed = false;
    let migrateInFlight = false;

    const dispatchRefreshEvents = () => {
      window.dispatchEvent(new Event(COUNTS_EVENT));
      window.dispatchEvent(new Event(NOTES_EVENT));
      window.dispatchEvent(new Event(ACTIVITY_EVENT));
    };

    const dispatchAuthEvent = (userId: string | null) => {
      try {
        window.dispatchEvent(
          new CustomEvent(AUTH_EVENT, {
            detail: { userId, at: Date.now() },
          })
        );
      } catch {
        // ignore
      }
    };

    const migrateGuestDataIfNeeded = async () => {
      if (migrateInFlight) return;
      migrateInFlight = true;
      try {
        // Merge guest data into cloud (does not delete cloud data).
        // Individual migrations are defensive and no-op when guest storage is empty.
        await Promise.allSettled([
          migrateGuestAppliedToUser(),
          migrateGuestInterviewsToUser(),
          migrateGuestRejectedToUser(),
          migrateGuestWithdrawnToUser(),
          migrateGuestOffersToUser(),
          migrateGuestWishlistToUser(),
          migrateGuestNotesToUser(),
        ]);

        // Activity migration touches multiple variants; keep it separate.
        await migrateGuestActivityToUser();
      } finally {
        migrateInFlight = false;
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session ?? null;
      setCachedSession(session);
      dispatchAuthEvent(session?.user?.id ?? null);

      // If the app boots already signed-in, we still want to merge any guest data
      // created before login into the cloud account.
      if (session?.user) {
        setTimeout(() => {
          void (async () => {
            if (disposed) return;
            await migrateGuestDataIfNeeded();
            if (!disposed) dispatchRefreshEvents();
          })();
        }, 0);
      } else {
        dispatchRefreshEvents();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      setCachedSession(session);
      dispatchAuthEvent(session?.user?.id ?? null);

      if (evt === "SIGNED_IN" && session?.user) {
        setTimeout(() => {
          void (async () => {
            if (disposed) return;
            await migrateGuestDataIfNeeded();
            if (!disposed) dispatchRefreshEvents();
          })();
        }, 0);
        return;
      }

      dispatchRefreshEvents();
    });

    return () => {
      disposed = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
