// Supabase Edge Function for sending interview reminder emails
// Uses Resend for email delivery (works without a custom domain)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Types
interface Interview {
  id: string;
  user_id: string;
  data: {
    company: string;
    role: string;
    date: string;
    time?: string;
    type?: string;
    notes?: string;
    reminderSent?: boolean;
  };
}

// Send email via Resend
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Use Resend's free domain (no custom domain needed)
        from: "Applications Tracker <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Generate interview reminder email HTML
function generateReminderEmail(interview: Interview["data"]): string {
  const interviewDate = new Date(interview.date);
  const formattedDate = interviewDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format the interview time - use provided time or extract from date
  const formattedTime = interview.time || interviewDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="color: #1f2937; margin-bottom: 8px; font-size: 24px;">📅 Interview Reminder</h1>
        <p style="color: #6b7280; margin-bottom: 24px;">You have an upcoming interview!</p>
        
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 20px;">${interview.company}</h2>
          <p style="color: #4b5563; margin: 0 0 8px 0; font-size: 16px;"><strong>Role:</strong> ${interview.role}</p>
          <p style="color: #4b5563; margin: 0 0 8px 0; font-size: 16px;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="color: #4b5563; margin: 0 0 8px 0; font-size: 16px;"><strong>Time:</strong> ${formattedTime}</p>
          ${interview.type ? `<p style="color: #4b5563; margin: 0; font-size: 16px;"><strong>Type:</strong> ${interview.type}</p>` : ""}
        </div>
        
        ${interview.notes ? `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #374151; margin-bottom: 8px; font-size: 14px; text-transform: uppercase;">Notes</h3>
          <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5;">${interview.notes}</p>
        </div>
        ` : ""}
        
        <a href="https://applicationstracker.vercel.app/interviews" 
           style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          View in Applications Tracker
        </a>
      </div>
      
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
        This reminder was sent from Applications Tracker
      </p>
    </body>
    </html>
  `;
}

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization (cron jobs use service role key)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for optional parameters
    let hoursBeforeInterview = 24; // Default: remind 24 hours before
    let testMode = false; // Test mode sends to ALL upcoming interviews
    try {
      const body = await req.json();
      if (body.hoursBeforeInterview) {
        hoursBeforeInterview = body.hoursBeforeInterview;
      }
      if (body.testMode === true) {
        testMode = true;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Create Supabase admin client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Calculate the time window for reminders
    const now = new Date();

    // Fetch users who have email reminders enabled
    const { data: enabledUsers, error: prefsError } = await supabase
      .from("user_email_preferences")
      .select("user_id, reminder_hours_before")
      .eq("email_reminders_enabled", true);

    if (prefsError) {
      console.error("Error fetching user preferences:", prefsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user preferences" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!enabledUsers || enabledUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users have email reminders enabled", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = enabledUsers.map((u: { user_id: string }) => u.user_id);

    // Fetch interviews for users with reminders enabled
    const { data: interviews, error: interviewsError } = await supabase
      .from("applications")
      .select("id, user_id, data")
      .eq("bucket", "interviews")
      .in("user_id", userIds);

    if (interviewsError) {
      console.error("Error fetching interviews:", interviewsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch interviews" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!interviews || interviews.length === 0) {
      return new Response(
        JSON.stringify({ message: "No interviews to remind about", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter interviews that are within the reminder window and haven't been reminded
    const interviewsToRemind = interviews.filter((i: Interview) => {
      if (!i.data?.date || i.data.reminderSent) return false;
      
      const interviewDate = new Date(i.data.date);
      
      // Test mode: send for ANY upcoming interview (not in the past)
      if (testMode) {
        return interviewDate >= now;
      }
      
      // Get user's preferred reminder hours
      const userPref = enabledUsers.find(
        (u: { user_id: string; reminder_hours_before: number }) => u.user_id === i.user_id
      );
      const userReminderHours = userPref?.reminder_hours_before ?? hoursBeforeInterview;
      
      // Calculate window for this user
      const windowStart = new Date(now.getTime() + userReminderHours * 60 * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
      
      return interviewDate >= windowStart && interviewDate <= windowEnd;
    });

    const results: { email: string; success: boolean; error?: string }[] = [];

    // Process each interview
    for (const interview of interviewsToRemind) {
      // Get user email from auth.users
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        interview.user_id
      );

      if (userError || !userData?.user?.email) {
        console.error(`Could not get email for user ${interview.user_id}`);
        results.push({
          email: "unknown",
          success: false,
          error: "Could not get user email",
        });
        continue;
      }

      const email = userData.user.email;
      const subject = `Interview Reminder: ${interview.data.company} - ${interview.data.role}`;
      const html = generateReminderEmail(interview.data);

      // Send the email
      const sendResult = await sendEmail(email, subject, html);
      results.push({ email, ...sendResult });

      if (sendResult.success) {
        // Mark interview as reminded
        const updatedData = { ...interview.data, reminderSent: true };
        await supabase
          .from("applications")
          .update({ data: updatedData })
          .eq("id", interview.id);
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        message: `Processed ${interviewsToRemind.length} interviews`,
        sent: successCount,
        failed: results.length - successCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
