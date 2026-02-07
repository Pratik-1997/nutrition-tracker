"use server";

import { createClient } from "@/lib/supabase/server";
import type { DietEntry, DailySteps, GymLogEntry, DietTemplate } from "@/lib/types";

export async function getStepsForDate(date: string): Promise<DailySteps | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("daily_steps")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  return data as DailySteps | null;
}

export async function setSteps(date: string, steps: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("daily_steps").upsert(
    {
      user_id: user.id,
      date,
      steps,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  );

  return error ? { error: error.message } : {};
}

export async function getDietEntriesForDate(
  date: string
): Promise<DietEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("diet_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .order("created_at", { ascending: true });

  return (data ?? []) as DietEntry[];
}

export async function addDietEntry(
  date: string,
  name: string,
  nutrition?: { calories?: number; protein_grams?: number; fat_grams?: number; carbs_grams?: number },
  templateId?: string | null,
  quantity: number = 1
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", entry: null };

  const row = {
    user_id: user.id,
    date,
    name: name.trim(),
    completed: false,
    quantity: quantity,
    calories: nutrition?.calories ?? 0,
    protein_grams: nutrition?.protein_grams ?? 0,
    fat_grams: nutrition?.fat_grams ?? 0,
    carbs_grams: nutrition?.carbs_grams ?? 0,
    template_id: templateId ?? null,
  };

  const { data: entry, error } = await supabase
    .from("diet_entries")
    .insert(row)
    .select()
    .single();

  if (error) return { error: error.message, entry: null };
  return { entry: entry as DietEntry, error: undefined };
}

export async function getDietTemplates(): Promise<DietTemplate[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("diet_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  return (data ?? []) as DietTemplate[];
}

export async function addDietTemplate(
  name: string,
  nutrition: { calories: number; protein_grams: number; fat_grams: number; carbs_grams: number }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("diet_templates").insert({
    user_id: user.id,
    name: name.trim(),
    ...nutrition,
  });

  return error ? { error: error.message } : {};
}

export async function updateDietTemplate(
  id: string,
  name: string,
  nutrition: { calories: number; protein_grams: number; fat_grams: number; carbs_grams: number }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("diet_templates")
    .update({ name: name.trim(), ...nutrition })
    .eq("id", id)
    .eq("user_id", user.id);

  return error ? { error: error.message } : {};
}

export async function deleteDietTemplate(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("diet_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return error ? { error: error.message } : {};
}

export async function updateDietQuantity(id: string, quantity: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const q = Math.max(0.25, Math.min(99, quantity));
  const { error } = await supabase
    .from("diet_entries")
    .update({ quantity: q })
    .eq("id", id)
    .eq("user_id", user.id);
  return error ? { error: error.message } : {};
}

export async function toggleDietCompleted(id: string, completed: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("diet_entries")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", user.id);

  return error ? { error: error.message } : {};
}

export async function deleteDietEntry(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("diet_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return error ? { error: error.message } : {};
}

export async function getGymLogForDate(date: string): Promise<GymLogEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("gym_log")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .order("created_at", { ascending: true });

  return (data ?? []) as GymLogEntry[];
}

export async function addGymLog(date: string, bodyPart: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("gym_log").insert({
    user_id: user.id,
    date,
    body_part: bodyPart,
  });

  return error ? { error: error.message } : {};
}

export async function removeGymLog(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("gym_log")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return error ? { error: error.message } : {};
}

/** For calendar: get days in month that have any activity (steps > 0, diet, or gym) */
export async function getActiveDaysInMonth(
  year: number,
  month: number
): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [stepsRes, dietRes, gymRes] = await Promise.all([
    supabase
      .from("daily_steps")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end)
      .gt("steps", 0),
    supabase
      .from("diet_entries")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end),
    supabase
      .from("gym_log")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end),
  ]);

  const days = new Set<string>();
  (stepsRes.data ?? []).forEach((r) => days.add(r.date));
  (dietRes.data ?? []).forEach((r) => days.add(r.date));
  (gymRes.data ?? []).forEach((r) => days.add(r.date));
  return Array.from(days).sort();
}

/** For progress graph: steps per day over last N days */
export async function getStepsHistory(days: number = 14) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const { data } = await supabase
    .from("daily_steps")
    .select("date, steps")
    .eq("user_id", user.id)
    .gte("date", start.toISOString().slice(0, 10))
    .lte("date", end.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  return (data ?? []) as { date: string; steps: number }[];
}

/** Daily nutrition totals for last N days (for Summary track) */
export async function getDailyNutritionHistory(days: number = 14) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("diet_entries")
    .select("date, calories, protein_grams, fat_grams, carbs_grams, quantity")
    .eq("user_id", user.id)
    .gte("date", startStr)
    .lte("date", endStr);

  const byDate = new Map<
    string,
    { calories: number; protein: number; fat: number; carbs: number }
  >();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    byDate.set(dateStr, { calories: 0, protein: 0, fat: 0, carbs: 0 });
  }
  (rows ?? []).forEach((r: { date: string; calories?: number; protein_grams?: number; fat_grams?: number; carbs_grams?: number; quantity?: number }) => {
    const q = Math.max(0.25, r.quantity ?? 1);
    const cur = byDate.get(r.date);
    if (cur) {
      cur.calories += (r.calories ?? 0) * q;
      cur.protein += (r.protein_grams ?? 0) * q;
      cur.fat += (r.fat_grams ?? 0) * q;
      cur.carbs += (r.carbs_grams ?? 0) * q;
    }
  });
  return Array.from(byDate.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type FullHistoryRow = {
  date: string;
  steps: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  gym: string[];
};

/** Combined history for History page (steps + nutrition + gym by day) */
export async function getFullHistory(days: number = 90): Promise<FullHistoryRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const [stepsRes, dietRes, gymRes] = await Promise.all([
    supabase.from("daily_steps").select("date, steps").eq("user_id", user.id).gte("date", startStr).lte("date", endStr),
    supabase.from("diet_entries").select("date, calories, protein_grams, fat_grams, carbs_grams, quantity").eq("user_id", user.id).gte("date", startStr).lte("date", endStr),
    supabase.from("gym_log").select("date, body_part").eq("user_id", user.id).gte("date", startStr).lte("date", endStr),
  ]);

  const byDate = new Map<string, FullHistoryRow>();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    byDate.set(dateStr, { date: dateStr, steps: 0, calories: 0, protein: 0, fat: 0, carbs: 0, gym: [] });
  }
  (stepsRes.data ?? []).forEach((r: { date: string; steps: number }) => {
    const row = byDate.get(r.date);
    if (row) row.steps = r.steps ?? 0;
  });
  (dietRes.data ?? []).forEach((r: { date: string; calories?: number; protein_grams?: number; fat_grams?: number; carbs_grams?: number; quantity?: number }) => {
    const row = byDate.get(r.date);
    if (row) {
      const q = Math.max(0.25, r.quantity ?? 1);
      row.calories += (r.calories ?? 0) * q;
      row.protein += (r.protein_grams ?? 0) * q;
      row.fat += (r.fat_grams ?? 0) * q;
      row.carbs += (r.carbs_grams ?? 0) * q;
    }
  });
  (gymRes.data ?? []).forEach((r: { date: string; body_part: string }) => {
    const row = byDate.get(r.date);
    if (row && !row.gym.includes(r.body_part)) row.gym.push(r.body_part);
  });

  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}
