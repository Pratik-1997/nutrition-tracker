-- Run this in Supabase Dashboard → SQL Editor to create tables and RLS.
-- Tables: daily_steps, diet_entries, gym_log

-- 1) Daily steps (one row per user per day)
CREATE TABLE IF NOT EXISTS public.daily_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  steps integer NOT NULL DEFAULT 0 CHECK (steps >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

-- 2) Diet entries (name + completed tick per item)
CREATE TABLE IF NOT EXISTS public.diet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  name text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) Gym – which body part was hit (multiple per day allowed)
CREATE TABLE IF NOT EXISTS public.gym_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  body_part text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast lookups by user and date
CREATE INDEX IF NOT EXISTS idx_daily_steps_user_date ON public.daily_steps (user_id, date);
CREATE INDEX IF NOT EXISTS idx_diet_entries_user_date ON public.diet_entries (user_id, date);
CREATE INDEX IF NOT EXISTS idx_gym_log_user_date ON public.gym_log (user_id, date);

-- RLS: enable and policy so users only see/edit their own data
ALTER TABLE public.daily_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_log ENABLE ROW LEVEL SECURITY;

-- daily_steps
CREATE POLICY "Users can manage own daily_steps"
  ON public.daily_steps FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- diet_entries
CREATE POLICY "Users can manage own diet_entries"
  ON public.diet_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- gym_log
CREATE POLICY "Users can manage own gym_log"
  ON public.gym_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Optional: updated_at trigger for daily_steps and diet_entries
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS daily_steps_updated_at ON public.daily_steps;
CREATE TRIGGER daily_steps_updated_at
  BEFORE UPDATE ON public.daily_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS diet_entries_updated_at ON public.diet_entries;
CREATE TRIGGER diet_entries_updated_at
  BEFORE UPDATE ON public.diet_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
