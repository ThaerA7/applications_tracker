-- Create user_email_preferences table for storing email notification settings
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.user_email_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_reminders_enabled BOOLEAN DEFAULT true,
    reminder_hours_before INTEGER DEFAULT 24,
    weekly_digest_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own preferences
CREATE POLICY "Users can view their own preferences"
    ON public.user_email_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON public.user_email_preferences
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON public.user_email_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can read all (for sending reminders)
CREATE POLICY "Service role can read all preferences"
    ON public.user_email_preferences
    FOR SELECT
    TO service_role
    USING (true);

-- Function to auto-create preferences when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_email_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create preferences on signup
DROP TRIGGER IF EXISTS on_auth_user_created_email_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_email_prefs
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_email_preferences();

-- Grant permissions
GRANT ALL ON public.user_email_preferences TO authenticated;
GRANT ALL ON public.user_email_preferences TO service_role;
