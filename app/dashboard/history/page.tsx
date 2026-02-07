import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getFullHistory } from "@/app/actions/progress";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const history = await getFullHistory(90);
  const hasData = history.some((r) => r.steps > 0 || r.calories > 0 || r.gym.length > 0);

  return (
    <div className="min-h-screen bg-[var(--background)] dark:bg-zinc-950 text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold"
          >
            <span className="text-xl">Activity</span>
          </Link>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">All data</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Past 90 days
        </h1>
        {!hasData ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
            No data yet. Log steps, diet, or workout on the Activity page.
          </p>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <tr className="text-left text-zinc-500 dark:text-zinc-400">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Steps</th>
                    <th className="px-3 py-2 font-medium">Cal</th>
                    <th className="px-3 py-2 font-medium">P</th>
                    <th className="px-3 py-2 font-medium">F</th>
                    <th className="px-3 py-2 font-medium">C</th>
                    <th className="px-3 py-2 font-medium">Gym</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const active = row.steps > 0 || row.calories > 0 || row.gym.length > 0;
                    if (!active) return null;
                    return (
                      <tr
                        key={row.date}
                        className="border-b border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                          {new Date(row.date + "T12:00:00").toLocaleDateString("default", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          {row.steps > 0 ? row.steps.toLocaleString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          {row.calories > 0 ? Math.round(row.calories) : "—"}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          {row.protein > 0 ? `${Math.round(row.protein)}g` : "—"}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          {row.fat > 0 ? `${Math.round(row.fat)}g` : "—"}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          {row.carbs > 0 ? `${Math.round(row.carbs)}g` : "—"}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300 text-xs">
                          {row.gym.length > 0 ? row.gym.join(", ") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 text-center">
          <Link href="/dashboard" className="underline">Back to Activity</Link>
        </p>
      </main>
    </div>
  );
}
