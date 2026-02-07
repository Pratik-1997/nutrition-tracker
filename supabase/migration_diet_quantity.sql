-- Run after migration_diet_nutrition.sql.
-- Adds quantity (e.g. 2 eggs, 3 egg whites) for diet_entries.

ALTER TABLE public.diet_entries
  ADD COLUMN IF NOT EXISTS quantity numeric(6,2) NOT NULL DEFAULT 1;
