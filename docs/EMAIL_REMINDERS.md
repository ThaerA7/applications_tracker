# Interview Email Reminders Setup

This guide explains how to set up interview reminder emails using Supabase Edge Functions and Resend.

## Overview

The system sends email reminders to users before their scheduled interviews. It uses:
- **Resend** - Email delivery (free tier: 100 emails/day, no custom domain required)
- **Supabase Edge Functions** - Serverless function to send emails
- **Vercel Cron** - Scheduled trigger to check for upcoming interviews

## Setup Steps

### 1. Create a Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. Navigate to API Keys and create a new API key
3. Copy the API key (starts with `re_`)

### 2. Set Up Environment Variables

Add these to your Supabase project secrets:

```bash
# In your terminal, run:
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

The `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

Add to Vercel environment variables:
- `RESEND_API_KEY` - Your Resend API key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (from Supabase Dashboard > Settings > API)
- `CRON_SECRET` - A random string to secure the cron endpoint

### 3. Run Database Migration

Execute the SQL in `supabase/migrations/001_create_email_preferences.sql` in your Supabase SQL Editor:

1. Go to Supabase Dashboard > SQL Editor
2. Paste the contents of the migration file
3. Click "Run"

This creates the `user_email_preferences` table where users can opt-in to email reminders.

### 4. Deploy the Edge Function

```bash
npx supabase functions deploy send-interview-reminders
```

### 5. Deploy to Vercel

The `vercel.json` is already configured with a daily cron job at 8 AM UTC:

```json
{
  "crons": [
    {
      "path": "/api/cron/interview-reminders",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Deploy your app to Vercel - the cron job will be automatically configured.

## How It Works

1. **Daily at 8 AM UTC**: Vercel cron triggers `/api/cron/interview-reminders`
2. **API Route**: Calls the Supabase Edge Function with service role authorization
3. **Edge Function**:
   - Fetches users with `email_reminders_enabled = true`
   - Finds interviews happening within their preferred reminder window (default: 24 hours)
   - Sends personalized reminder emails via Resend
   - Marks interviews as `reminderSent: true` to prevent duplicate emails

## Email Sender

By default, emails are sent from `onboarding@resend.dev` which is Resend's free shared domain. This works without requiring your own domain.

If you later add a custom domain in Resend, update the `from` field in:
- `supabase/functions/send-interview-reminders/index.ts`

## User Settings

Users can enable/disable email reminders in Settings. The preferences are stored in the `user_email_preferences` table:

- `email_reminders_enabled` - Boolean to enable/disable reminders
- `reminder_hours_before` - How many hours before the interview to send reminder (default: 24)
- `weekly_digest_enabled` - For future weekly digest emails

## Testing

### Test the Edge Function locally:

```bash
npx supabase functions serve send-interview-reminders --env-file .env.local
```

Then make a request:
```bash
curl -X POST http://localhost:54321/functions/v1/send-interview-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"hoursBeforeInterview": 24}'
```

### Test the API route:

```bash
curl -X POST https://applicationstracker.vercel.app/api/cron/interview-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Troubleshooting

1. **No emails sent**: Check if users have `email_reminders_enabled` set to `true`
2. **Edge Function errors**: Check Supabase Dashboard > Edge Functions > Logs
3. **Cron not triggering**: Verify `vercel.json` is properly deployed and check Vercel Dashboard > Cron Jobs
