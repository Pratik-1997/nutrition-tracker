"use server";

import { createClient } from "@/lib/supabase/server";
import type { DietEntry, DailySteps, GymLogEntry } from "@/lib/types";

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

export async function addDietEntry(date: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("diet_entries").insert({
    user_id: user.id,
    date,
    name: name.trim(),
    completed: false,
  });

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
