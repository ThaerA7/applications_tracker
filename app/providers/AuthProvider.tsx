"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { setCachedSession } from "@/lib/supabase/sessionCache";

const COUNTS_EVENT = "job-tracker:refresh-counts";
const NOTES_EVENT = "job-tracker:refresh-notes";
const ACTIVITY_EVENT = "job-tracker:refresh-activity";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      setCachedSession(data.session ?? null);
      window.dispatchEvent(new Event(COUNTS_EVENT));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setCachedSession(session);
      window.dispatchEvent(new Event(COUNTS_EVENT));
      window.dispatchEvent(new Event(NOTES_EVENT));
      window.dispatchEvent(new Event(ACTIVITY_EVENT));
    });

    return () => sub?.subscription?.unsubscribe();
  }, []);

  return <>{children}</>;
}
