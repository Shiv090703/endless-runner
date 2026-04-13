-- Endless Runner Tech Journey - Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Create the `runs` table to store player statistics
CREATE TABLE IF NOT EXISTS public.runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    ai_nodes INTEGER NOT NULL DEFAULT 0,
    cloud_tokens INTEGER NOT NULL DEFAULT 0,
    security_shields INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 0,
    synergy_focus TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: If you already created this table, run this command in SQL Editor:
-- ALTER TABLE public.runs ADD COLUMN coins INTEGER NOT NULL DEFAULT 0;

-- 2. Enable Row Level Security (Postgres Best Practice)
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

-- 3. Create policies so users can only create and view their own runs
-- (Allow inserts if authenticated, and only for their own user_id OR allow anonymous inserts if user_id is null for Guest Mode)
CREATE POLICY "Users can insert their own runs" 
    ON public.runs FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own runs" 
    ON public.runs FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);
