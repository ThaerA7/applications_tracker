import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const APPLICATION_BUCKETS = [
  "applied",
  "interviews",
  "notes",
  "offers",
  "rejected",
  "wishlist",
  "withdrawn",
  "documents"
] as const;

const ACTIVITY_VARIANTS = [
  "applied",
  "interviews",
  "rejected",
  "withdrawn",
  "offers",
] as const;

export async function POST() {
  try {
    // User-scoped client (uses cookies) so RLS applies
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = data.user.id;

    // 1) Delete user data while RLS is active (safest)
    const { error: appsError } = await supabase
      .from("applications")
      .delete()
      .in("bucket", [...APPLICATION_BUCKETS]);

    if (appsError) {
      return NextResponse.json({ ok: false, error: appsError.message }, { status: 500 });
    }

    const { error: activityError } = await supabase
      .from("activity_logs")
      .delete()
      .in("variant", [...ACTIVITY_VARIANTS]);

    if (activityError) {
      return NextResponse.json({ ok: false, error: activityError.message }, { status: 500 });
    }

    // 2) Delete the auth user (requires service role)
    const admin = getSupabaseAdminClient();
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      return NextResponse.json(
        { ok: false, error: deleteUserError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
