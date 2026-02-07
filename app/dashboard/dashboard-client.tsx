"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getStepsForDate,
  setSteps,
  getDietEntriesForDate,
  addDietEntry,
  toggleDietCompleted,
  deleteDietEntry,
  getGymLogForDate,
  addGymLog,
  removeGymLog,
  getActiveDaysInMonth,
  getStepsHistory,
} from "@/app/actions/progress";
import type { DailySteps, DietEntry, GymLogEntry } from "@/lib/types";
import { GYM_BODY_PARTS } from "@/lib/types";
import { signOut } from "@/app/actions/auth";

const STEPS_GOAL = 10000;

// ----- Simple SVG charts (no recharts dependency) -----
function RingChart({
  data,
  size = 160,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number;
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
        fill="white"
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
    <div className="flex items-end gap-1 h-[200px]" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 min-w-0 flex flex-col items-center gap-1"
          title={`${d.date}: ${d.steps.toLocaleString()} steps`}
        >
          <div
            className="w-full bg-emerald-500 rounded-t min-h-[4px] transition-all"
            style={{ height: `${Math.max(4, (d.steps / max) * (height - 24))}px` }}
          />
          <span className="text-[10px] text-zinc-500 truncate w-full text-center">
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

type DashboardClientProps = {
  userEmail: string;
  initialDate: string;
  initialSteps: DailySteps | null;
  initialDiet: DietEntry[];
  initialGym: GymLogEntry[];
  initialActiveDays: string[];
  initialStepsHistory: { date: string; steps: number }[];
};

export default function DashboardClient({
  userEmail,
  initialDate,
  initialSteps,
  initialDiet,
  initialGym,
  initialActiveDays,
  initialStepsHistory,
}: DashboardClientProps) {
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
  const [stepsInput, setStepsInput] = useState(
    String(initialSteps?.steps ?? 0)
  );
  const [dietInput, setDietInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isInitialDate = selectedDate === initialDate;

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
      getActiveDaysInMonth(calendarMonth.year, calendarMonth.month).then(
        setActiveDays
      );
    }
  }, [calendarMonth, initialActiveDays]);

  const calendarDays = getDaysInMonth(
    calendarMonth.year,
    calendarMonth.month
  );

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
        getActiveDaysInMonth(calendarMonth.year, calendarMonth.month).then(
          setActiveDays
        );
      }
    });
  };

  const handleAddDiet = () => {
    const name = dietInput.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const res = await addDietEntry(selectedDate, name);
      if (res?.error) setError(res.error);
      else {
        const entries = await getDietEntriesForDate(selectedDate);
        setDiet(entries);
        setDietInput("");
      }
    });
  };

  const handleToggleDiet = (id: string, completed: boolean) => {
    startTransition(async () => {
      await toggleDietCompleted(id, completed);
      setDiet((prev) =>
        prev.map((e) => (e.id === id ? { ...e, completed } : e))
      );
    });
  };

  const handleAddGym = (bodyPart: string) => {
    setError(null);
    startTransition(async () => {
      const res = await addGymLog(selectedDate, bodyPart);
      if (res?.error) setError(res.error);
      else {
        const entries = await getGymLogForDate(selectedDate);
        setGym(entries);
        getActiveDaysInMonth(calendarMonth.year, calendarMonth.month).then(
          setActiveDays
        );
      }
    });
  };

  const handleRemoveGym = (id: string) => {
    startTransition(async () => {
      await removeGymLog(id);
      setGym((prev) => prev.filter((e) => e.id !== id));
      getActiveDaysInMonth(calendarMonth.year, calendarMonth.month).then(
        setActiveDays
      );
    });
  };

  const stepsValue = steps?.steps ?? 0;
  const dietTotal = diet.length;
  const dietDone = diet.filter((e) => e.completed).length;
  const dietPct = dietTotal ? Math.round((dietDone / dietTotal) * 100) : 0;
  const stepsPct = Math.min(
    100,
    Math.round((stepsValue / STEPS_GOAL) * 100)
  );

  const ringData = [
    { name: "Steps", value: stepsPct, color: "#059669" },
    { name: "Diet done", value: dietPct, color: "#0d9488" },
    {
      name: "Gym",
      value: gym.length > 0 ? 100 : 0,
      color: "#6366f1",
    },
  ].filter((d) => d.value > 0);

  const barData = stepsHistory.map(({ date, steps: s }) => ({
    date: date.slice(5),
    steps: s,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <header className="border-b border-emerald-100/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-semibold text-emerald-800">
            🥗 Nutrition Tracker
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <p className="text-zinc-600 text-sm">
          Signed in as <strong className="text-zinc-800">{userEmail}</strong>
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Calendar */}
        <section className="rounded-xl border border-emerald-100 bg-white/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-100/60">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-2 rounded-lg hover:bg-emerald-50 text-zinc-600"
              aria-label="Previous month"
            >
              ←
            </button>
            <h2 className="font-semibold text-zinc-800">
              {new Date(calendarMonth.year, calendarMonth.month - 1).toLocaleString(
                "default",
                { month: "long", year: "numeric" }
              )}
            </h2>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-2 rounded-lg hover:bg-emerald-50 text-zinc-600"
              aria-label="Next month"
            >
              →
            </button>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, day, isCurrentMonth }) => {
                const isActive = activeDays.includes(date);
                const isSelected = date === selectedDate;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`
                      aspect-square rounded-lg text-sm font-medium transition-colors
                      ${!isCurrentMonth ? "text-zinc-300" : "text-zinc-700"}
                      ${isSelected ? "bg-emerald-600 text-white ring-2 ring-emerald-400" : ""}
                      ${isCurrentMonth && !isSelected && isActive ? "bg-emerald-100 text-emerald-800" : ""}
                      ${isCurrentMonth && !isSelected && !isActive ? "hover:bg-zinc-100" : ""}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="px-4 pb-3 text-xs text-zinc-500">
            Selected: {new Date(selectedDate + "T12:00:00").toLocaleDateString("default", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        </section>

        {/* Steps */}
        <section className="rounded-xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
          <h3 className="font-semibold text-zinc-800 mb-3">Daily steps</h3>
          <div className="flex gap-2 flex-wrap">
            <input
              type="number"
              min={0}
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
              onBlur={handleSaveSteps}
              className="w-32 rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900"
            />
            <button
              type="button"
              onClick={handleSaveSteps}
              disabled={pending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Goal: {STEPS_GOAL.toLocaleString()} steps
          </p>
        </section>

        {/* Diet */}
        <section className="rounded-xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
          <h3 className="font-semibold text-zinc-800 mb-3">Diet</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="e.g. Eggs, Protein drink"
              value={dietInput}
              onChange={(e) => setDietInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDiet())}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 placeholder-zinc-400"
            />
            <button
              type="button"
              onClick={handleAddDiet}
              disabled={pending || !dietInput.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <ul className="space-y-2">
            {diet.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={entry.completed}
                  onChange={(e) =>
                    handleToggleDiet(entry.id, e.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600"
                />
                <span
                  className={
                    entry.completed
                      ? "text-zinc-500 line-through"
                      : "text-zinc-800"
                  }
                >
                  {entry.name}
                </span>
              </li>
            ))}
            {diet.length === 0 && (
              <li className="text-sm text-zinc-500">No diet items for this day.</li>
            )}
          </ul>
        </section>

        {/* Gym */}
        <section className="rounded-xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
          <h3 className="font-semibold text-zinc-800 mb-3">Gym – body part hit</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {GYM_BODY_PARTS.map((part) => (
              <button
                key={part}
                type="button"
                onClick={() => handleAddGym(part)}
                disabled={pending}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                + {part}
              </button>
            ))}
          </div>
          <ul className="flex flex-wrap gap-2">
            {gym.map((entry) => (
              <li
                key={entry.id}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800"
              >
                {entry.body_part}
                <button
                  type="button"
                  onClick={() => handleRemoveGym(entry.id)}
                  className="ml-1 text-indigo-600 hover:text-indigo-800"
                  aria-label={`Remove ${entry.body_part}`}
                >
                  ×
                </button>
              </li>
            ))}
            {gym.length === 0 && (
              <li className="text-sm text-zinc-500">No gym logged for this day.</li>
            )}
          </ul>
        </section>

        {/* Progress: ring + bar (custom SVG, no recharts) */}
        <section className="rounded-xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
          <h3 className="font-semibold text-zinc-800 mb-4">Daily progress</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-zinc-500 mb-2">Today&apos;s ring (Steps / Diet / Gym)</p>
              {ringData.length > 0 ? (
                <div>
                  <RingChart data={ringData} size={180} />
                  <ul className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                    {ringData.map((d, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        {d.name}: {d.value}%
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 py-8 text-center">
                  Add steps, diet, or gym to see progress.
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-2">Steps (last 14 days)</p>
              {barData.length > 0 ? (
                <BarChartSimple
                  data={barData}
                  maxSteps={Math.max(...barData.map((d) => d.steps), STEPS_GOAL)}
                  height={200}
                />
              ) : (
                <p className="text-sm text-zinc-500 py-8 text-center">
                  No steps history yet.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
