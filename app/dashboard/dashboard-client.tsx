"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getStepsForDate,
  setSteps,
  getDietEntriesForDate,
  addDietEntry,
  toggleDietCompleted,
  updateDietQuantity,
  deleteDietEntry,
  getGymLogForDate,
  addGymLog,
  removeGymLog,
  getActiveDaysInMonth,
  getStepsHistory,
  getDietTemplates,
  addDietTemplate,
  updateDietTemplate,
  deleteDietTemplate,
  getDailyNutritionHistory,
} from "@/app/actions/progress";
import type { DailySteps, DietEntry, GymLogEntry, DietTemplate } from "@/lib/types";
import { GYM_BODY_PARTS, REFERENCE_FOODS } from "@/lib/types";
import { signOut } from "@/app/actions/auth";
import { useTheme } from "@/app/components/theme-provider";
import Link from "next/link";

const STEPS_GOAL = 10000;

// ----- Charts -----
function RingChart({
  data,
  size = 160,
  dark,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number;
  dark?: boolean;
}) {
  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - 24) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 14;
  const circumference = 2 * Math.PI * (r - stroke / 2);
  let offset = 0;
  return (
    <svg width={size} height={size} className="mx-auto">
      {data.map((d, i) => {
        const segment = (d.value / total) * circumference;
        const dashArray = `${segment} ${circumference - segment}`;
        const dashOffset = -offset;
        offset += segment;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r - stroke / 2}
            fill="none"
            stroke={d.color}
            strokeWidth={stroke}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
      <circle
        cx={cx}
        cy={cy}
        r={r - stroke - 8}
        className={dark ? "fill-[var(--card)]" : "fill-white"}
      />
    </svg>
  );
}

function BarChartSimple({
  data,
  maxSteps,
  height = 200,
}: {
  data: { date: string; steps: number }[];
  maxSteps: number;
  height?: number;
}) {
  const max = Math.max(maxSteps, 1);
  return (
    <div className="flex items-end gap-0.5 h-[200px]" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 min-w-0 flex flex-col items-center gap-1"
          title={`${d.date}: ${d.steps.toLocaleString()} steps`}
        >
          <div
            className="w-full rounded-t min-h-[4px] transition-all bg-[var(--ring-green)] dark:bg-emerald-500"
            style={{ height: `${Math.max(4, (d.steps / max) * (height - 24))}px` }}
          />
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate w-full text-center">
            {d.date}
          </span>
        </div>
      ))}
    </div>
  );
}

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];
  const startPad = first.getDay();
  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month - 1, 1 - (startPad - i));
    days.push({
      date: toYMD(d),
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }
  for (let i = 1; i <= last.getDate(); i++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    days.push({ date, day: i, isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month, i);
    days.push({
      date: toYMD(d),
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }
  return days;
}

type DailyNutritionRow = { date: string; calories: number; protein: number; fat: number; carbs: number };

type DashboardClientProps = {
  userEmail: string;
  initialDate: string;
  initialSteps: DailySteps | null;
  initialDiet: DietEntry[];
  initialGym: GymLogEntry[];
  initialActiveDays: string[];
  initialStepsHistory: { date: string; steps: number }[];
  initialTemplates: DietTemplate[];
  initialDailyNutrition: DailyNutritionRow[];
};

export default function DashboardClient({
  userEmail,
  initialDate,
  initialSteps,
  initialDiet,
  initialGym,
  initialActiveDays,
  initialStepsHistory,
  initialTemplates,
  initialDailyNutrition,
}: DashboardClientProps) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [y, m] = initialDate.split("-").map(Number);
    return { year: y, month: m };
  });
  const [steps, setStepsState] = useState<DailySteps | null>(initialSteps);
  const [diet, setDiet] = useState<DietEntry[]>(initialDiet);
  const [gym, setGym] = useState<GymLogEntry[]>(initialGym);
  const [activeDays, setActiveDays] = useState<string[]>(initialActiveDays);
  const [stepsHistory, setStepsHistory] = useState(initialStepsHistory);
  const [templates, setTemplates] = useState<DietTemplate[]>(initialTemplates);
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutritionRow[]>(initialDailyNutrition);
  const [stepsInput, setStepsInput] = useState(String(initialSteps?.steps ?? 0));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // My Foods modal
  const [showMyFoods, setShowMyFoods] = useState(false);
  const [newFoodName, setNewFoodName] = useState("");
  const [newFoodCal, setNewFoodCal] = useState("");
  const [newFoodP, setNewFoodP] = useState("");
  const [newFoodF, setNewFoodF] = useState("");
  const [newFoodC, setNewFoodC] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCal, setEditCal] = useState("");
  const [editP, setEditP] = useState("");
  const [editF, setEditF] = useState("");
  const [editC, setEditC] = useState("");

  // Add custom diet only
  const [addDietMode, setAddDietMode] = useState<"custom" | null>(null);
  const [customName, setCustomName] = useState("");
  const [customCal, setCustomCal] = useState("");
  const [customP, setCustomP] = useState("");
  const [customF, setCustomF] = useState("");
  const [customC, setCustomC] = useState("");
  const [refFoodIndex, setRefFoodIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedDate === initialDate) {
      setStepsState(initialSteps);
      setDiet(initialDiet);
      setGym(initialGym);
      setStepsInput(String(initialSteps?.steps ?? 0));
    } else {
      startTransition(async () => {
        const [s, d, g] = await Promise.all([
          getStepsForDate(selectedDate),
          getDietEntriesForDate(selectedDate),
          getGymLogForDate(selectedDate),
        ]);
        setStepsState(s);
        setDiet(d);
        setGym(g);
        setStepsInput(String(s?.steps ?? 0));
      });
    }
  }, [selectedDate, initialDate, initialSteps, initialDiet, initialGym]);

  useEffect(() => {
    if (
      calendarMonth.year === new Date().getFullYear() &&
      calendarMonth.month === new Date().getMonth() + 1
    ) {
      setActiveDays(initialActiveDays);
    } else {
      getActiveDaysInMonth(calendarMonth.year, calendarMonth.month).then(setActiveDays);
    }
  }, [calendarMonth, initialActiveDays]);

  const calendarDays = getDaysInMonth(calendarMonth.year, calendarMonth.month);
  const todayYMD = toYMD(new Date());

  const goPrevMonth = () => {
    if (calendarMonth.month === 1)
      setCalendarMonth({ year: calendarMonth.year - 1, month: 12 });
    else setCalendarMonth({ year: calendarMonth.year, month: calendarMonth.month - 1 });
  };
  const goNextMonth = () => {
    if (calendarMonth.month === 12)
      setCalendarMonth({ year: calendarMonth.year + 1, month: 1 });
    else setCalendarMonth({ year: calendarMonth.year, month: calendarMonth.month + 1 });
  };

  const handleSaveSteps = () => {
    const num = parseInt(stepsInput, 10) || 0;
    setError(null);
    startTransition(async () => {
      const res = await setSteps(selectedDate, num);
      if (res?.error) setError(res.error);
      else {
        setStepsState((prev) =>
          prev ? { ...prev, steps: num } : { id: "", user_id: "", date: selectedDate, steps: num }
        );
        getStepsHistory(14).then(setStepsHistory);
        getActiveDaysInMonth(calendarMonth.year, calendarMonth.month).then(setActiveDays);
      }
    });
  };

  const entryForTemplate = (templateId: string) => diet.find((e) => e.template_id === templateId);

  const handleToggleTemplateForDay = (t: DietTemplate, checked: boolean) => {
    setError(null);
    if (checked) {
      startTransition(async () => {
        const res = await addDietEntry(
          selectedDate,
          t.name,
          {
            calories: t.calories,
            protein_grams: t.protein_grams,
            fat_grams: t.fat_grams,
            carbs_grams: t.carbs_grams,
          },
          t.id,
          1
        );
        if (res?.error) setError(res.error);
        else if (res?.entry) {
          setDiet((prev) => [...prev, res.entry!]);
          getDailyNutritionHistory(14).then(setDailyNutrition);
        }
      });
    } else {
      const entry = diet.find((e) => e.template_id === t.id);
      if (!entry) return;
      startTransition(async () => {
        await deleteDietEntry(entry.id);
        setDiet((prev) => prev.filter((e) => e.id !== entry.id));
        getDailyNutritionHistory(14).then(setDailyNutrition);
      });
    }
  };

  const handleRemoveDietEntry = (id: string) => {
    startTransition(async () => {
      await deleteDietEntry(id);
      setDiet((prev) => prev.filter((e) => e.id !== id));
      getDailyNutritionHistory(14).then(setDailyNutrition);
    });
  };

  const handleAddDietCustom = () => {
    const name = customName.trim();
    if (!name) return;
    const cal = parseInt(customCal, 10) || 0;
    const p = parseFloat(customP) || 0;
    const f = parseFloat(customF) || 0;
    const c = parseFloat(customC) || 0;
    setError(null);
    startTransition(async () => {
      const res = await addDietEntry(
        selectedDate,
        name,
        { calories: cal, protein_grams: p, fat_grams: f, carbs_grams: c },
        null,
        1
      );
      if (res?.error) setError(res.error);
      else if (res?.entry) {
        setDiet((prev) => [...prev, res.entry!]);
        setAddDietMode(null);
        setCustomName("");
        setCustomCal("");
        setCustomP("");
        setCustomF("");
        setCustomC("");
        setRefFoodIndex(null);
        getDailyNutritionHistory(14).then(setDailyNutrition);
      }
    });
  };

  const handleAddTemplate = () => {
    const name = newFoodName.trim();
    if (!name) return;
    const cal = parseInt(newFoodCal, 10) || 0;
    const p = parseFloat(newFoodP) || 0;
    const f = parseFloat(newFoodF) || 0;
    const c = parseFloat(newFoodC) || 0;
    setError(null);
    startTransition(async () => {
      const res = await addDietTemplate(name, {
        calories: cal,
        protein_grams: p,
        fat_grams: f,
        carbs_grams: c,
      });
      if (res?.error) setError(res.error);
      else {
        const list = await getDietTemplates();
        setTemplates(list);
        setNewFoodName("");
        setNewFoodCal("");
        setNewFoodP("");
        setNewFoodF("");
        setNewFoodC("");
      }
    });
  };

  const handleDeleteTemplate = (id: string) => {
    startTransition(async () => {
      await deleteDietTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setEditingTemplateId(null);
    });
  };

  const startEditTemplate = (t: DietTemplate) => {
    setEditingTemplateId(t.id);
    setEditName(t.name);
    setEditCal(String(t.calories));
    setEditP(String(t.protein_grams));
    setEditF(String(t.fat_grams));
    setEditC(String(t.carbs_grams));
  };

  const handleSaveEditTemplate = () => {
    if (!editingTemplateId) return;
    const name = editName.trim();
    if (!name) return;
    const calories = parseInt(editCal, 10) || 0;
    const protein = parseFloat(editP) || 0;
    const fat = parseFloat(editF) || 0;
    const carbs = parseFloat(editC) || 0;
    setError(null);
    startTransition(async () => {
      const res = await updateDietTemplate(editingTemplateId, name, {
        calories: calories,
        protein_grams: protein,
        fat_grams: fat,
        carbs_grams: carbs,
      });
      if (res?.error) setError(res.error);
      else {
        setTemplates((prev) =>
          prev.map((x) =>
            x.id === editingTemplateId
              ? { ...x, name, calories: calories, protein_grams: protein, fat_grams: fat, carbs_grams: carbs }
              : x
          )
        );
        setEditingTemplateId(null);
      }
    });
  };

  const handleToggleDiet = (id: string, completed: boolean) => {
    startTransition(async () => {
      const { toggleDietCompleted } = await import("@/app/actions/progress");
      await toggleDietCompleted(id, completed);
      setDiet((prev) => prev.map((e) => (e.id === id ? { ...e, completed } : e)));
    });
  };

  const customEntries = diet.filter(
    (e) => !e.template_id || !templates.some((t) => t.id === e.template_id)
  );

  const handleAddGym = (bodyPart: string) => {
    setError(null);
    startTransition(async () => {
      const res = await addGymLog(selectedDate, bodyPart);
      if (res?.error) setError(res.error);
      else {
        const entries = await getGymLogForDate(selectedDate);
        setGym(entries);
        getActiveDaysInMonth(calendarMonth.year, calendarMonth.month).then(setActiveDays);
      }
    });
  };

  const handleRemoveGym = (id: string) => {
    startTransition(async () => {
      await removeGymLog(id);
      setGym((prev) => prev.filter((e) => e.id !== id));
      getActiveDaysInMonth(calendarMonth.year, calendarMonth.month).then(setActiveDays);
    });
  };

  const stepsValue = steps?.steps ?? 0;
  const dietTotal = diet.length;
  const dietDone = diet.filter((e) => e.completed).length;
  const dietPct = dietTotal ? Math.round((dietDone / dietTotal) * 100) : 0;
  const stepsPct = Math.min(100, Math.round((stepsValue / STEPS_GOAL) * 100));

  const showQuantityFor = (name: string) => name.toLowerCase().includes("egg");
  const quantityMin = (e: DietEntry) => (showQuantityFor(e.name) ? 1 : 0.25);
  const quantityStep = (e: DietEntry) => (showQuantityFor(e.name) ? 1 : 0.25);
  const qty = (e: DietEntry) => Math.max(quantityMin(e), e.quantity ?? 1);
  const dailyTotals = diet.reduce(
    (acc, e) => {
      const mult = qty(e);
      return {
        calories: acc.calories + (e.calories ?? 0) * mult,
        protein: acc.protein + (e.protein_grams ?? 0) * mult,
        fat: acc.fat + (e.fat_grams ?? 0) * mult,
        carbs: acc.carbs + (e.carbs_grams ?? 0) * mult,
      };
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const handleQuantityChange = (entry: DietEntry, delta: number) => {
    const step = quantityStep(entry);
    const min = quantityMin(entry);
    const next = Math.max(min, Math.min(99, (entry.quantity ?? 1) + delta));
    const rounded = step >= 1 ? Math.round(next) : next;
    if (rounded === (entry.quantity ?? 1)) return;
    startTransition(async () => {
      await updateDietQuantity(entry.id, rounded);
      setDiet((prev) =>
        prev.map((x) => (x.id === entry.id ? { ...x, quantity: rounded } : x))
      );
      getDailyNutritionHistory(14).then(setDailyNutrition);
    });
  };

  const ringData = [
    { name: "Steps", value: stepsPct, color: "#30d158" },
    { name: "Diet", value: dietPct, color: "#40c8e0" },
    { name: "Gym", value: gym.length > 0 ? 100 : 0, color: "#bf5af2" },
  ].filter((d) => d.value > 0);

  const barData = stepsHistory.map(({ date, steps: s }) => ({
    date: date.slice(5),
    steps: s,
  }));

  const applyRefFood = (idx: number) => {
    const r = REFERENCE_FOODS[idx];
    setRefFoodIndex(idx);
    setCustomName(r.name);
    setCustomCal(String(r.calories));
    setCustomP(String(r.protein_grams));
    setCustomF(String(r.fat_grams));
    setCustomC(String(r.carbs_grams));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header - Apple style */}
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl safe-area-inset-top">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 hover:opacity-80">
            Activity
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/dashboard/history"
              className="p-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm font-medium"
              title="View all data"
            >
              All data
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
              )}
            </button>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 pt-4 space-y-5">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {userEmail}
        </p>

        {error && (
          <div className="rounded-2xl bg-red-500/10 dark:bg-red-500/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Calendar - mobile first, Apple Fitness style */}
        <section className="rounded-3xl bg-[var(--card)] dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 overflow-hidden shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-3 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {new Date(calendarMonth.year, calendarMonth.month - 1).toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-3 -mr-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Next month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] sm:text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map(({ date, day, isCurrentMonth }) => {
                const isActive = activeDays.includes(date);
                const isSelected = date === selectedDate;
                const isToday = date === todayYMD;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`
                      min-h-[44px] sm:min-h-[48px] aspect-square max-w-[52px] sm:max-w-none mx-auto w-full rounded-2xl text-sm font-medium transition-all flex items-center justify-center
                      ${!isCurrentMonth ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-800 dark:text-zinc-200"}
                      ${isSelected ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md" : ""}
                      ${isToday && !isSelected ? "ring-2 ring-zinc-400 dark:ring-zinc-500 ring-offset-2 dark:ring-offset-zinc-900 ring-offset-[var(--card)]" : ""}
                      ${isCurrentMonth && !isSelected && isActive && !isToday ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300" : ""}
                      ${isCurrentMonth && !isSelected && !isActive && !isToday ? "hover:bg-zinc-100 dark:hover:bg-zinc-800" : ""}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="px-4 pb-4 text-xs text-zinc-500 dark:text-zinc-400 text-center">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("default", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </section>

        {/* Steps card */}
        <section className="rounded-3xl bg-[var(--card)] dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm dark:shadow-none">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Steps</h3>
          <div className="flex gap-3 flex-wrap items-center">
            <input
              type="number"
              min={0}
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
              onBlur={handleSaveSteps}
              className="w-28 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-zinc-100 text-lg font-medium"
            />
            <button
              type="button"
              onClick={handleSaveSteps}
              disabled={pending}
              className="rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Update
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Goal: {STEPS_GOAL.toLocaleString()} steps
            {stepsHistory.length > 0 && (() => {
              const last7 = stepsHistory.slice(-7);
              const avg = Math.round(last7.reduce((s, d) => s + d.steps, 0) / last7.length);
              return <span className="ml-2"> · 7-day avg: {avg.toLocaleString()}</span>;
            })()}
          </p>
        </section>

        {/* Diet card - My Foods + Add to day + totals */}
        <section className="rounded-3xl bg-[var(--card)] dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Diet</h3>
            <button
              type="button"
              onClick={() => setShowMyFoods(true)}
              className="text-sm font-medium text-[var(--ring-teal)] dark:text-teal-400"
            >
              My Foods
            </button>
          </div>

          {/* Daily nutrition totals */}
          {(dailyTotals.calories > 0 || dailyTotals.protein > 0 || dailyTotals.fat > 0 || dailyTotals.carbs > 0) && (
            <div className="grid grid-cols-4 gap-2 mb-4 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
              <div className="text-center">
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{dailyTotals.calories}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Cal</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{Math.round(dailyTotals.protein)}g</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Protein</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{Math.round(dailyTotals.fat)}g</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Fat</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{Math.round(dailyTotals.carbs)}g</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Carbs</p>
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            Tick what you had on this day (from My Foods). Edit list in My Foods.
          </p>

          {templates.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">No foods in My Foods yet. Add your regular items there.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {templates.map((t) => {
                const entry = entryForTemplate(t.id);
                const isOn = !!entry;
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={(e) => handleToggleTemplateForDay(t, e.target.checked)}
                      disabled={pending}
                      className="h-5 w-5 shrink-0 rounded-md border-zinc-300 dark:border-zinc-600 text-[var(--ring-green)]"
                    />
                    {!isOn ? (
                      <span className="text-zinc-700 dark:text-zinc-300">{t.name}</span>
                    ) : (
                      <>
                        {showQuantityFor(t.name) && entry && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button type="button" onClick={() => handleQuantityChange(entry, -quantityStep(entry))} disabled={pending || qty(entry) <= quantityMin(entry)} className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-lg font-medium disabled:opacity-40">−</button>
                            <span className="min-w-[2rem] text-center text-sm font-medium text-zinc-800 dark:text-zinc-200">{qty(entry) === Math.floor(qty(entry)) ? String(Math.round(qty(entry))) : qty(entry)}</span>
                            <button type="button" onClick={() => handleQuantityChange(entry, quantityStep(entry))} disabled={pending} className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-lg font-medium disabled:opacity-40">+</button>
                          </div>
                        )}
                        <input
                          type="checkbox"
                          checked={entry?.completed ?? false}
                          onChange={(e) => entry && handleToggleDiet(entry.id, e.target.checked)}
                          className="h-5 w-5 shrink-0 rounded-md border-zinc-300 dark:border-zinc-600 text-[var(--ring-green)]"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={entry?.completed ? "text-zinc-500 dark:text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"}>
                            {entry && showQuantityFor(entry.name) && qty(entry) !== 1 ? `${qty(entry)} × ${t.name}` : t.name}
                          </span>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {entry ? Math.round((entry.calories ?? 0) * qty(entry)) : t.calories} cal
                          </p>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {customEntries.length > 0 && (
            <>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Other items (custom)</p>
              <ul className="space-y-2 mb-4">
                {customEntries.map((entry) => {
                  const q = qty(entry);
                  const showQty = showQuantityFor(entry.name);
                  return (
                    <li key={entry.id} className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3">
                      {showQty && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button type="button" onClick={() => handleQuantityChange(entry, -quantityStep(entry))} disabled={pending || q <= quantityMin(entry)} className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-lg font-medium disabled:opacity-40">−</button>
                          <span className="min-w-[2rem] text-center text-sm font-medium text-zinc-800 dark:text-zinc-200">{q === Math.floor(q) ? String(Math.round(q)) : q}</span>
                          <button type="button" onClick={() => handleQuantityChange(entry, quantityStep(entry))} disabled={pending} className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-lg font-medium disabled:opacity-40">+</button>
                        </div>
                      )}
                      <input type="checkbox" checked={entry.completed} onChange={(e) => handleToggleDiet(entry.id, e.target.checked)} className="h-5 w-5 shrink-0 rounded-md border-zinc-300 dark:border-zinc-600 text-[var(--ring-green)]" />
                      <div className="flex-1 min-w-0">
                        <span className={entry.completed ? "text-zinc-500 dark:text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"}>
                          {showQty && q !== 1 ? `${q} × ${entry.name}` : entry.name}
                        </span>
                        {(entry.calories != null && entry.calories > 0) && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{Math.round((entry.calories ?? 0) * q)} cal</p>
                        )}
                      </div>
                      <button type="button" onClick={() => handleRemoveDietEntry(entry.id)} disabled={pending} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10" aria-label="Remove">×</button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {addDietMode === null ? (
            <button type="button" onClick={() => setAddDietMode("custom")} className="rounded-xl border border-zinc-200 dark:border-zinc-700 py-2.5 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              + Add custom item
            </button>
          ) : (
            <div className="mb-4 space-y-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-4">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Add one-off item</p>
              <select
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                value={refFoodIndex ?? ""}
                onChange={(e) => { const v = e.target.value; if (v === "") setRefFoodIndex(null); else applyRefFood(Number(v)); }}
              >
                <option value="">Reference (optional)</option>
                {REFERENCE_FOODS.map((r, i) => (
                  <option key={i} value={i}>{r.name} — {r.calories} cal</option>
                ))}
              </select>
              <input type="text" placeholder="Name" value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400" />
              <div className="grid grid-cols-4 gap-2">
                <input type="number" placeholder="Cal" value={customCal} onChange={(e) => setCustomCal(e.target.value)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
                <input type="number" placeholder="P" value={customP} onChange={(e) => setCustomP(e.target.value)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
                <input type="number" placeholder="F" value={customF} onChange={(e) => setCustomF(e.target.value)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
                <input type="number" placeholder="C" value={customC} onChange={(e) => setCustomC(e.target.value)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleAddDietCustom} disabled={pending || !customName.trim()} className="rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 text-sm font-semibold disabled:opacity-50">Add</button>
                <button type="button" onClick={() => { setAddDietMode(null); setCustomName(""); setCustomCal(""); setCustomP(""); setCustomF(""); setCustomC(""); setRefFoodIndex(null); }} className="text-sm text-zinc-500">Cancel</button>
              </div>
            </div>
          )}

        </section>

        {/* Gym */}
        <section className="rounded-3xl bg-[var(--card)] dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm dark:shadow-none">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Workout</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {GYM_BODY_PARTS.map((part) => (
              <button
                key={part}
                type="button"
                onClick={() => handleAddGym(part)}
                disabled={pending}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                + {part}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {gym.map((entry) => (
              <li
                key={entry.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#bf5af2]/20 dark:bg-[#bf5af2]/30 text-[#bf5af2] px-3 py-1.5 text-sm font-medium list-none"
              >
                {entry.body_part}
                <button type="button" onClick={() => handleRemoveGym(entry.id)} className="hover:opacity-80" aria-label={`Remove ${entry.body_part}`}>×</button>
              </li>
            ))}
            {gym.length === 0 && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">No workout logged.</span>
            )}
          </div>
        </section>

        {/* Progress rings + bar + daily nutrients */}
        <section className="rounded-3xl bg-[var(--card)] dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm dark:shadow-none">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Summary</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Activity rings</p>
              {ringData.length > 0 ? (
                <div>
                  <RingChart data={ringData} size={180} dark={dark} />
                  <ul className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {ringData.map((d, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}: {d.value}%
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">Log steps, diet, or workout to see rings.</p>
              )}
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Steps (14 days)</p>
              {barData.length > 0 ? (
                <BarChartSimple
                  data={barData}
                  maxSteps={Math.max(...barData.map((d) => d.steps), STEPS_GOAL)}
                  height={200}
                />
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">No steps yet.</p>
              )}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Daily nutrients (last 14 days)</p>
            {dailyNutrition.length > 0 ? (
              <div className="flex items-end gap-0.5 h-[140px]">
                {dailyNutrition.slice(-14).map((d, i) => {
                  const maxCal = Math.max(...dailyNutrition.map((x) => x.calories), 1);
                  const barColors = ["#0d9488", "#059669", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#4f46e5", "#c026d3", "#dc2626", "#65a30d", "#0e7490"];
                  const barColor = barColors[i % barColors.length];
                  return (
                    <div key={d.date} className="flex-1 min-w-0 flex flex-col items-center gap-0.5" title={`${d.date}: ${d.calories} cal, P${Math.round(d.protein)}g F${Math.round(d.fat)}g C${Math.round(d.carbs)}g`}>
                      <div className="w-full rounded-t min-h-[2px] transition-all" style={{ height: `${Math.max(4, (d.calories / maxCal) * 120)}px`, backgroundColor: barColor }} />
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate w-full text-center">{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">Log diet to see daily calories.</p>
            )}
          </div>
        </section>
      </main>

      {/* My Foods sheet (modal on mobile) */}
      {showMyFoods && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={() => { setShowMyFoods(false); setEditingTemplateId(null); }} aria-hidden />
          <div className="relative w-full max-h-[85vh] sm:max-h-[80vh] sm:max-w-md bg-[var(--card)] dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">My Foods</h3>
              <button type="button" onClick={() => { setShowMyFoods(false); setEditingTemplateId(null); }} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">×</button>
            </div>
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 space-y-2">
              <input type="text" placeholder="Food name" value={newFoodName} onChange={(e) => setNewFoodName(e.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" />
              <div className="grid grid-cols-4 gap-2">
                <input type="number" placeholder="Cal" value={newFoodCal} onChange={(e) => setNewFoodCal(e.target.value)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
                <input type="number" placeholder="P" value={newFoodP} onChange={(e) => setNewFoodP(e.target.value)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
                <input type="number" placeholder="F" value={newFoodF} onChange={(e) => setNewFoodF(e.target.value)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
                <input type="number" placeholder="C" value={newFoodC} onChange={(e) => setNewFoodC(e.target.value)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
              </div>
              <button type="button" onClick={handleAddTemplate} disabled={pending || !newFoodName.trim()} className="w-full rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-2.5 text-sm font-semibold disabled:opacity-50">Add to My Foods</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3">
                  {editingTemplateId === t.id ? (
                    <div className="space-y-2">
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" />
                      <div className="grid grid-cols-4 gap-2">
                        <input type="number" value={editCal} onChange={(e) => setEditCal(e.target.value)} placeholder="Cal" className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
                        <input type="number" value={editP} onChange={(e) => setEditP(e.target.value)} placeholder="P" className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
                        <input type="number" value={editF} onChange={(e) => setEditF(e.target.value)} placeholder="F" className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
                        <input type="number" value={editC} onChange={(e) => setEditC(e.target.value)} placeholder="C" className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={handleSaveEditTemplate} disabled={pending} className="rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium">Save</button>
                        <button type="button" onClick={() => setEditingTemplateId(null)} className="text-sm text-zinc-500">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{t.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.calories} cal · P{t.protein_grams}g F{t.fat_grams}g C{t.carbs_grams}g</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => startEditTemplate(t)} className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700" aria-label="Edit">Edit</button>
                        <button type="button" onClick={() => handleDeleteTemplate(t.id)} disabled={pending} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10" aria-label="Remove from list" title="Remove from My Foods">×</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {templates.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">Add your regular foods here. You can tick them each day instead of re-adding.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
