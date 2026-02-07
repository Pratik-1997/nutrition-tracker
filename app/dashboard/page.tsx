import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getStepsForDate,
  getDietEntriesForDate,
  getGymLogForDate,
  getActiveDaysInMonth,
  getStepsHistory,
} from "@/app/actions/progress";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date().toISOString().slice(0, 10);
  const [initialSteps, initialDiet, initialGym, initialActiveDays, initialStepsHistory] =
    await Promise.all([
      getStepsForDate(today),
      getDietEntriesForDate(today),
      getGymLogForDate(today),
      getActiveDaysInMonth(
        new Date().getFullYear(),
        new Date().getMonth() + 1
      ),
      getStepsHistory(14),
    ]);

  return (
    <DashboardClient
      userEmail={user.email ?? ""}
      initialDate={today}
      initialSteps={initialSteps}
      initialDiet={initialDiet}
      initialGym={initialGym}
      initialActiveDays={initialActiveDays}
      initialStepsHistory={initialStepsHistory}
    />
  );
}
