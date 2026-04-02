import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rbrxsovdfaqbpsxlhocu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9DeDFs6FOwXKOMKWRUpcxA_7grtUmoC';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Exercise {
  id: number;
  exercise_name: string;
  type: string;
  multiplier: number;
  info_notes: string | null;
  type2: string | null;
}

export interface Workout {
  id: number;
  week: number | null;
  day: string | null;
  type: string;
  date: string;
  exercise_id: number | null;
  km: number | null;
  calories: number | null;
  food_rating: string | null;
  w1: number | null; r1: number | null;
  w2: number | null; r2: number | null;
  w3: number | null; r3: number | null;
  w4: number | null; r4: number | null;
  w5: number | null; r5: number | null;
  w6: number | null; r6: number | null;
  total_weight: number | null;
  total_cardio: number | null;
  sets: number | null;
  multiplier: number | null;
  bodyweight: number | null;
  body_fat_percent: number | null;
  muscle_mass: number | null;
  time: string | null;
  new_entry: string | null;
  total_score_k: number | null;
  total_score: number | null;
  tracker_daily: number | null;
}

/** Today as YYYY-MM-DD */
export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** Date N days offset from today as YYYY-MM-DD */
export function dateOffsetStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

/**
 * Custom sequential week number based on app start date (2025-01-06).
 * Week 1 = 2025-01-06, Week 2 = 2025-01-13, etc.
 */
export function getISOWeek(): number {
  const APP_START = new Date('2025-01-06T00:00:00Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - APP_START.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

/** Day abbreviation matching DB format e.g. "MON", "TUE", "WED" */
export function getDayName(): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[new Date().getDay()];
}

/**
 * Exercise IDs that count toward the daily movement total (Tracker + Row + Cycle).
 */
const TRACKER_IDS = [82, 83, 87];
const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];

/**
 * After any insert, call this to recompute daily aggregates for every row on that date:
 *   tracker_daily  = sum of total_cardio for exercise_ids 82, 83, 87
 *   total_score    = ROUND((WeightsDaily/20000 + TrackerDaily/20 + CaloriesDaily/1500) / 3 * 100, 0)
 * All rows for the date are updated with the same values (daily totals).
 */
export async function recalculateDailyTotals(date: string): Promise<void> {
  const { data } = await supabase
    .from('workouts')
    .select('id, type, exercise_id, total_weight, total_cardio, calories')
    .eq('date', date);

  if (!data || data.length === 0) return;

  const rows = data as any[];

  const weightsDailyUnits = rows
    .filter(r => WEIGHT_TYPES.includes(r.type))
    .reduce((s, r) => s + Number(r.total_weight || 0), 0);

  const trackerDailyUnits = rows
    .filter(r => TRACKER_IDS.includes(Number(r.exercise_id)))
    .reduce((s, r) => s + Number(r.total_cardio || 0), 0);

  const caloriesDailyUnits = rows
    .filter(r => r.type === 'MEASUREMENT')
    .reduce((s, r) => s + Number(r.calories || 0), 0);

  const totalScore = Math.round(
    ((weightsDailyUnits / 20000) + (trackerDailyUnits / 20) + (caloriesDailyUnits / 1500)) / 3 * 100
  );

  await supabase
    .from('workouts')
    .update({
      total_score: totalScore,
      tracker_daily: trackerDailyUnits,
    })
    .eq('date', date);
}

/**
 * Maps an array of {date, value} into a [numWeeks][7] 2D array.
 * Index [0] = current week, [1] = last week, ...
 * Day index 0 = Monday, 6 = Sunday
 */
export function mapToWeeklyChart(
  workouts: Array<{ date: string; value: number }>,
  numWeeks = 7
): number[][] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);

  const weeks: number[][] = Array.from({ length: numWeeks }, () => Array(7).fill(0));

  for (const w of workouts) {
    const d = new Date(w.date + 'T12:00:00');
    const diffMs = monday.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays >= numWeeks * 7) continue;
    const weekIdx = Math.floor(diffDays / 7);
    const dowIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    weeks[weekIdx][dowIdx] = +(weeks[weekIdx][dowIdx] + w.value).toFixed(2);
  }

  return weeks;
}

/** Monday of the current ISO week as YYYY-MM-DD */
export function currentWeekMonday(): string {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return monday.toISOString().split('T')[0];
}

/** Monday of N weeks ago as YYYY-MM-DD */
export function weeksAgoMonday(n: number): string {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) - n * 7);
  return monday.toISOString().split('T')[0];
}
