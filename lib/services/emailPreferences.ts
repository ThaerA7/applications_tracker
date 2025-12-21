"use client";

import { getSupabaseClient } from "@/lib/supabase/client";

export type EmailPreferences = {
  emailRemindersEnabled: boolean;
  reminderHoursBefore: number;
  weeklyDigestEnabled: boolean;
};

const DEFAULT_EMAIL_PREFS: EmailPreferences = {
  emailRemindersEnabled: false,
  reminderHoursBefore: 24,
  weeklyDigestEnabled: false,
};

/**
 * Load email preferences from Supabase
 */
export async function loadEmailPreferences(): Promise<EmailPreferences> {
  try {
    const supabase = getSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEFAULT_EMAIL_PREFS;

    const { data, error } = await supabase
      .from("user_email_preferences")
      .select("email_reminders_enabled, reminder_hours_before, weekly_digest_enabled")
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      // If no preferences exist, create default ones
      await supabase
        .from("user_email_preferences")
        .upsert({ user_id: user.id })
        .select()
        .single();
      
      return DEFAULT_EMAIL_PREFS;
    }

    return {
      emailRemindersEnabled: data.email_reminders_enabled ?? false,
      reminderHoursBefore: data.reminder_hours_before ?? 24,
      weeklyDigestEnabled: data.weekly_digest_enabled ?? false,
    };
  } catch (error) {
    console.error("Failed to load email preferences:", error);
    return DEFAULT_EMAIL_PREFS;
  }
}

/**
 * Save email preferences to Supabase
 */
export async function saveEmailPreferences(
  prefs: Partial<EmailPreferences>
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user logged in");
      return false;
    }

    const updates: Record<string, unknown> = {
      user_id: user.id,
    };

    if (prefs.emailRemindersEnabled !== undefined) {
      updates.email_reminders_enabled = prefs.emailRemindersEnabled;
    }
    if (prefs.reminderHoursBefore !== undefined) {
      updates.reminder_hours_before = prefs.reminderHoursBefore;
    }
    if (prefs.weeklyDigestEnabled !== undefined) {
      updates.monthly_digest_enabled = prefs.weeklyDigestEnabled;
    }

    const { error } = await supabase
      .from("user_email_preferences")
      .upsert(updates, { onConflict: "user_id" });

    if (error) {
      console.error("Failed to save email preferences:", error.message, error.code, error.details);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to save email preferences:", error);
    return false;
  }
}

/**
 * Toggle email reminders
 */
export async function toggleEmailReminders(enabled: boolean): Promise<boolean> {
  return saveEmailPreferences({ emailRemindersEnabled: enabled });
}

/**
 * Set reminder hours before interview
 */
export async function setReminderHours(hours: number): Promise<boolean> {
  return saveEmailPreferences({ reminderHoursBefore: hours });
}
