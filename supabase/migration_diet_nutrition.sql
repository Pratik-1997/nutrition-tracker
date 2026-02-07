-- Run in Supabase SQL Editor after schema.sql.
-- Adds: diet_templates (fixed foods), nutrition columns on diet_entries.

-- 1) Diet templates (user's saved "My Foods" with default nutrition)
CREATE TABLE IF NOT EXISTS public.diet_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  calories integer NOT NULL DEFAULT 0,
  protein_grams numeric(8,1) NOT NULL DEFAULT 0,
  fat_grams numeric(8,1) NOT NULL DEFAULT 0,
  carbs_grams numeric(8,1) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diet_templates_user ON public.diet_templates (user_id);

ALTER TABLE public.diet_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own diet_templates"
  ON public.diet_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Add nutrition + quantity columns to diet_entries
ALTER TABLE public.diet_entries
  ADD COLUMN IF NOT EXISTS calories integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS protein_grams numeric(8,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fat_grams numeric(8,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carbs_grams numeric(8,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.diet_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity numeric(6,2) NOT NULL DEFAULT 1;
