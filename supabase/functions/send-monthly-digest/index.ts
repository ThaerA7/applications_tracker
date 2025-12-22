// Supabase Edge Function for sending monthly digest emails
// Summarizes the user's job search activity for the past month

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface ApplicationRow {
  id: string;
  user_id: string;
  bucket: string;
  data: Record<string, unknown>;
  created_at: string;
}

interface MonthlyStats {
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
  withdrawn: number;
  wishlist: number;
  upcomingInterviews: Array<{
    company: string;
    role: string;
    date: string;
  }>;
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

// Get month name
function getMonthName(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Generate monthly digest email HTML
function generateDigestEmail(
  stats: MonthlyStats,
  monthName: string,
  userName?: string
): string {
  const totalActivity = stats.applied + stats.interviews + stats.offers + stats.rejected + stats.withdrawn;
  
  const greeting = userName ? `Hi ${userName},` : "Hi there,";
  
  const motivationalMessage = totalActivity === 0
    ? "No activity last month – but every journey starts with a single step. Let's make this month count! 🚀"
    : totalActivity < 5
    ? "You're making progress! Keep the momentum going. 💪"
    : totalActivity < 15
    ? "Great work last month! Your consistency is paying off. 🌟"
    : "Incredible effort! You're really crushing your job search. 🎉";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="color: #1f2937; margin-bottom: 8px; font-size: 24px;">📊 Your Monthly Digest</h1>
        <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px;">${monthName}</p>
        
        <p style="color: #374151; margin-bottom: 24px; font-size: 15px; line-height: 1.6;">
          ${greeting}<br><br>
          Here's a summary of your job search activity last month.
        </p>

        <!-- Stats Grid -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td style="background-color: #eff6ff; border-radius: 8px; padding: 16px; text-align: center; width: 33%;">
              <p style="color: #3b82f6; font-size: 28px; font-weight: bold; margin: 0;">${stats.applied}</p>
              <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase;">Applied</p>
            </td>
            <td width="12"></td>
            <td style="background-color: #fef3c7; border-radius: 8px; padding: 16px; text-align: center; width: 33%;">
              <p style="color: #d97706; font-size: 28px; font-weight: bold; margin: 0;">${stats.interviews}</p>
              <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase;">Interviews</p>
            </td>
            <td width="12"></td>
            <td style="background-color: #d1fae5; border-radius: 8px; padding: 16px; text-align: center; width: 33%;">
              <p style="color: #059669; font-size: 28px; font-weight: bold; margin: 0;">${stats.offers}</p>
              <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase;">Offers</p>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td style="background-color: #fee2e2; border-radius: 8px; padding: 16px; text-align: center; width: 33%;">
              <p style="color: #dc2626; font-size: 28px; font-weight: bold; margin: 0;">${stats.rejected}</p>
              <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase;">Rejected</p>
            </td>
            <td width="12"></td>
            <td style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; width: 33%;">
              <p style="color: #6b7280; font-size: 28px; font-weight: bold; margin: 0;">${stats.withdrawn}</p>
              <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase;">Withdrawn</p>
            </td>
            <td width="12"></td>
            <td style="background-color: #fae8ff; border-radius: 8px; padding: 16px; text-align: center; width: 33%;">
              <p style="color: #a855f7; font-size: 28px; font-weight: bold; margin: 0;">${stats.wishlist}</p>
              <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase;">Wishlist</p>
            </td>
          </tr>
        </table>

        ${stats.upcomingInterviews.length > 0 ? `
        <!-- Upcoming Interviews -->
        <div style="background-color: #fffbeb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase;">📅 Upcoming Interviews</h3>
          ${stats.upcomingInterviews.map(i => `
            <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #fde68a;">
              <p style="color: #1f2937; margin: 0; font-weight: 600;">${i.company}</p>
              <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 13px;">${i.role} • ${new Date(i.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
            </div>
          `).join("")}
        </div>
        ` : ""}

        <!-- Motivational Message -->
        <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #22c55e;">
          <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">${motivationalMessage}</p>
        </div>
        
        <a href="https://applicationstracker.vercel.app" 
           style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          View Dashboard
        </a>
      </div>
      
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
        This digest was sent from Applications Tracker.<br>
        You can disable monthly digests in Settings.
      </p>
    </body>
    </html>
  `;
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase admin client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Calculate date range - use LAST month for the digest summary
    const now = new Date();
    // Last month's date range
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const monthName = getMonthName(monthStart);

    // Fetch users who have monthly digest enabled
    const { data: enabledUsers, error: prefsError } = await supabase
      .from("user_email_preferences")
      .select("user_id")
      .eq("monthly_digest_enabled", true);

    if (prefsError) {
      console.error("Error fetching user preferences:", prefsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user preferences" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!enabledUsers || enabledUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users have monthly digest enabled", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { email: string; success: boolean; error?: string }[] = [];

    // Process each user
    for (const userPref of enabledUsers) {
      const userId = userPref.user_id;

      // Get user email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !userData?.user?.email) {
        console.error(`Could not get email for user ${userId}`);
        results.push({ email: "unknown", success: false, error: "Could not get user email" });
        continue;
      }

      const email = userData.user.email;
      const userName = userData.user.user_metadata?.full_name || userData.user.user_metadata?.name;

      // Helper function to check if a date falls within last month
      const isInLastMonth = (dateStr?: string): boolean => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d >= monthStart && d <= monthEnd;
      };

      // Fetch ALL applications for this user
      const { data: applications, error: appsError } = await supabase
        .from("applications")
        .select("id, bucket, data, created_at")
        .eq("user_id", userId);

      if (appsError) {
        console.error(`Error fetching applications for user ${userId}:`, appsError);
        results.push({ email, success: false, error: "Failed to fetch applications" });
        continue;
      }

      // Calculate stats - only count items from last month
      const stats: MonthlyStats = {
        applied: 0,
        interviews: 0,
        offers: 0,
        rejected: 0,
        withdrawn: 0,
        wishlist: 0,
        upcomingInterviews: [],
      };

      for (const app of (applications || []) as ApplicationRow[]) {
        // Check if this item was created or has a relevant date in last month
        const data = app.data as Record<string, unknown>;
        const appliedOn = data.appliedOn as string | undefined;
        const interviewDate = data.date as string | undefined;
        const offerDate = (data.offerReceivedDate || data.decisionDate) as string | undefined;
        const rejectedDate = data.decisionDate as string | undefined;
        const withdrawnDate = data.withdrawnDate as string | undefined;
        const createdAt = app.created_at;

        switch (app.bucket) {
          case "applied":
            if (isInLastMonth(appliedOn) || isInLastMonth(createdAt)) {
              stats.applied++;
            }
            break;
          case "interviews":
            if (isInLastMonth(interviewDate) || isInLastMonth(createdAt)) {
              stats.interviews++;
            }
            break;
          case "offers":
            if (isInLastMonth(offerDate) || isInLastMonth(createdAt)) {
              stats.offers++;
            }
            break;
          case "rejected":
            if (isInLastMonth(rejectedDate) || isInLastMonth(createdAt)) {
              stats.rejected++;
            }
            break;
          case "withdrawn":
            if (isInLastMonth(withdrawnDate) || isInLastMonth(createdAt)) {
              stats.withdrawn++;
            }
            break;
          case "wishlist":
            if (isInLastMonth(createdAt)) {
              stats.wishlist++;
            }
            break;
        }
      }

      // Fetch upcoming interviews (next 30 days)
      const { data: upcomingInterviews } = await supabase
        .from("applications")
        .select("data")
        .eq("user_id", userId)
        .eq("bucket", "interviews");

      if (upcomingInterviews) {
        const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        stats.upcomingInterviews = upcomingInterviews
          .filter((i) => {
            const date = (i.data as { date?: string })?.date;
            if (!date) return false;
            const interviewDate = new Date(date);
            return interviewDate >= now && interviewDate <= futureDate;
          })
          .map((i) => ({
            company: (i.data as { company?: string })?.company || "Unknown",
            role: (i.data as { role?: string })?.role || "Unknown",
            date: (i.data as { date?: string })?.date || "",
          }))
          .slice(0, 3);
      }

      // Generate and send email
      const subject = `📊 Your ${monthName} Job Search Digest`;
      const html = generateDigestEmail(stats, monthName, userName);
      const sendResult = await sendEmail(email, subject, html);
      results.push({ email, ...sendResult });
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        message: `Processed ${enabledUsers.length} users`,
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
