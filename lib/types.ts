export type DailySteps = {
  id: string;
  user_id: string;
  date: string;
  steps: number;
  created_at?: string;
  updated_at?: string;
};

export type DietEntry = {
  id: string;
  user_id: string;
  date: string;
  name: string;
  completed: boolean;
  created_at?: string;
  updated_at?: string;
};

export type GymLogEntry = {
  id: string;
  user_id: string;
  date: string;
  body_part: string;
  created_at?: string;
}

export const GYM_BODY_PARTS = [
  "Chest",
  "Shoulders",
  "Triceps",
  "Back",
  "Biceps",
  "Legs",
  "Core",
  "Cardio",
  "Forearms",
] as const;
export type GymBodyPart = (typeof GYM_BODY_PARTS)[number];
