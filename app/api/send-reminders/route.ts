import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Direct email sending via Resend (alternative to Edge Functions)
 * This can be triggered by Vercel Cron or manually
 */

interface InterviewData {
  company: string;
  role: string;
  date: string;
  time?: string;
  type?: string;
  notes?: string;
  reminderSent?: boolean;
}

interface InterviewRow {
  id: string;
  user_id: string;
  data: InterviewData;
}

function generateReminderEmail(interview: InterviewData): string {
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

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");

  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const supabase = await createClient();

    // Calculate reminder window (interviews happening in 24-25 hours)
    const now = new Date();
    const hoursBeforeInterview = 24;
    const reminderWindowStart = new Date(
      now.getTime() + hoursBeforeInterview * 60 * 60 * 1000
    );
    const reminderWindowEnd = new Date(
      reminderWindowStart.getTime() + 60 * 60 * 1000
    );

    // Fetch interviews that need reminders
    const { data: interviews, error: fetchError } = await supabase
      .from("applications")
      .select("id, user_id, data")
      .eq("bucket", "interviews");

    if (fetchError) {
      console.error("Error fetching interviews:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch interviews" },
        { status: 500 }
      );
    }

    // Filter interviews that are within the reminder window and haven't been reminded
    const interviewsToRemind = (interviews as InterviewRow[])?.filter((i) => {
      if (!i.data?.date || i.data.reminderSent) return false;

      const interviewDate = new Date(i.data.date);
      return (
        interviewDate >= reminderWindowStart && interviewDate <= reminderWindowEnd
      );
    });

    if (!interviewsToRemind || interviewsToRemind.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No interviews to remind about",
        sent: 0,
      });
    }

    const results: { email: string; success: boolean; error?: string }[] = [];

    // Note: To get user emails, you need the service role key and admin API
    // For this direct approach, you'd need to store user preferences/email in a separate table
    // or use the Supabase admin API from an Edge Function

    // For now, this demonstrates the email sending capability
    // In production, you'd query a user_preferences table with email preferences

    for (const interview of interviewsToRemind) {
      try {
        // You'll need to get the user's email from your user preferences table
        // This is a placeholder - replace with actual email lookup
        const userEmail = ""; // await getUserEmail(interview.user_id);

        if (!userEmail) {
          results.push({
            email: "unknown",
            success: false,
            error: "User email not found",
          });
          continue;
        }

        const { error: sendError } = await resend.emails.send({
          from: "Applications Tracker <onboarding@resend.dev>",
          to: [userEmail],
          subject: `Interview Reminder: ${interview.data.company} - ${interview.data.role}`,
          html: generateReminderEmail(interview.data),
        });

        if (sendError) {
          results.push({
            email: userEmail,
            success: false,
            error: sendError.message,
          });
          continue;
        }

        // Mark as reminded
        await supabase
          .from("applications")
          .update({ data: { ...interview.data, reminderSent: true } })
          .eq("id", interview.id);

        results.push({ email: userEmail, success: true });
      } catch (error) {
        results.push({
          email: "unknown",
          success: false,
          error: String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      processed: interviewsToRemind.length,
      sent: successCount,
      failed: results.length - successCount,
      results,
    });
  } catch (error) {
    console.error("Error sending reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
