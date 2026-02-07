export type DailySteps = {
  id: string;
  user_id: string;
  date: string;
  steps: number;
  created_at?: string;
  updated_at?: string;
};

export type Nutrition = {
  calories: number;
  protein_grams: number;
  fat_grams: number;
  carbs_grams: number;
};

export type DietEntry = {
  id: string;
  user_id: string;
  date: string;
  name: string;
  completed: boolean;
  quantity?: number;
  calories?: number;
  protein_grams?: number;
  fat_grams?: number;
  carbs_grams?: number;
  template_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DietTemplate = {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein_grams: number;
  fat_grams: number;
  carbs_grams: number;
  created_at?: string;
};

export type GymLogEntry = {
  id: string;
  user_id: string;
  date: string;
  body_part: string;
  created_at?: string;
};

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

/** Reference nutrition for common foods (per typical serving). Used for suggestions / quick add. */
export const REFERENCE_FOODS: { name: string; calories: number; protein_grams: number; fat_grams: number; carbs_grams: number }[] = [
  { name: "Eggs (whole)", calories: 70, protein_grams: 6, fat_grams: 5, carbs_grams: 1 },
  { name: "Egg white", calories: 17, protein_grams: 3.6, fat_grams: 0, carbs_grams: 0.2 },
  { name: "Chicken breast (100g)", calories: 165, protein_grams: 31, fat_grams: 3.6, carbs_grams: 0 },
  { name: "Protein drink ", calories: 120, protein_grams: 24, fat_grams: 1.5, carbs_grams: 3 },
  { name: "Diet shake", calories: 130, protein_grams: 26, fat_grams: 2, carbs_grams: 4 },
  { name: "Vitamin C tablet", calories: 2, protein_grams: 0, fat_grams: 0, carbs_grams: 0 },
  { name: 'Green tea', calories: 0, protein_grams: 0, fat_grams: 0, carbs_grams: 0 },
];
