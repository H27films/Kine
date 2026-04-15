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

/**
 * Convert a Date to YYYY-MM-DD in Malaysia local time (UTC+8).
 * This ensures the date string matches the actual Malaysia calendar date,
 * not the UTC date that JavaScript would give by default.
 */
function malaysiaDateStr(d: Date): string {
  // Create a date formatter for Malaysia timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kuala_Lumpur',
  });
  return formatter.format(d); // Returns YYYY-MM-DD
}

/**
 * Today's date as YYYY-MM-DD in Malaysia local time.
 * Critical: Use this for all logging to ensure correct date in Supabase.
 */
export function todayStr(): string {
  return malaysiaDateStr(new Date());
}

/**
 * Date N days offset from today as YYYY-MM-DD in Malaysia local time.
 */
export function dateOffsetStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return malaysiaDateStr(d);
}

/**
 * Custom sequential week number based on app start date (2025-01-06 Malaysia time).
 * Week 1 = Jan 6–12, 2025 (Malaysia timezone)
 * Week 66 = April 1–7, 2026 (Malaysia timezone)
 */
export function getISOWeek(): number {
  const APP_START = new Date('2025-01-06T00:00:00Z');
  const today = new Date();
  
  // Get today's date in Malaysia timezone
  const todayMalaysia = malaysiaDateStr(today);
  const todayDate = new Date(todayMalaysia + 'T00:00:00Z');
  
  // Calculate days since start
  const diffDays = Math.floor((todayDate.getTime() - APP_START.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

/**
 * Day abbreviation in Malaysia timezone: "MON", "TUE", "WED", etc.
 * Critical: Must match the day in Malaysia local time, not UTC.
 */
export function getDayName(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'Asia/Kuala_Lumpur',
  });
  const dayName = formatter.format(new Date()).toUpperCase();
  
  // Map to 3-letter format
  const dayMap: Record<string, string> = {
    'MON': 'MON', 'TUE': 'TUE', 'WED': 'WED', 'THU': 'THU',
    'FRI': 'FRI', 'SAT': 'SAT', 'SUN': 'SUN',
  };
  return dayMap[dayName] || dayName;
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
 * Uses Malaysia timezone for all date calculations.
 */
export function mapToWeeklyChart(
  workouts: Array<{ date: string; value: number }>,
  numWeeks = 7
): number[][] {
  // Get Monday of current week in Malaysia timezone
  const today = new Date();
  const todayMalaysia = malaysiaDateStr(today);
  const todayDate = new Date(todayMalaysia + 'T00:00:00Z');
  const dow = todayDate.getDay();
  
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - (dow === 0 ? 6 : dow - 1));

  const weeks: number[][] = Array.from({ length: numWeeks }, () => Array(7).fill(0));

  for (const w of workouts) {
    const d = new Date(w.date + 'T12:00:00Z');
    const diffMs = monday.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays >= numWeeks * 7) continue;
    const weekIdx = Math.floor(diffDays / 7);
    const dowIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    weeks[weekIdx][dowIdx] = +(weeks[weekIdx][dowIdx] + w.value).toFixed(2);
  }

  return weeks;
}

/**
 * Monday of the current week as YYYY-MM-DD in Malaysia timezone.
 */
export function currentWeekMonday(): string {
  const today = new Date();
  const todayMalaysia = malaysiaDateStr(today);
  const todayDate = new Date(todayMalaysia + 'T00:00:00Z');
  const dow = todayDate.getDay();
  
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - (dow === 0 ? 6 : dow - 1));
  
  return malaysiaDateStr(monday);
}

/**
 * Monday of N weeks ago as YYYY-MM-DD in Malaysia timezone.
 */
export function weeksAgoMonday(n: number): string {
  const today = new Date();
  const todayMalaysia = malaysiaDateStr(today);
  const todayDate = new Date(todayMalaysia + 'T00:00:00Z');
  const dow = todayDate.getDay();

  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - (dow === 0 ? 6 : dow - 1) - n * 7);

  return malaysiaDateStr(monday);
}

/**
 * Returns 'Edit' if date is <= last export date, otherwise 'New'.
 * Used to determine new_entry status when updating existing entries.
 */
export function getNewEntryStatus(dateStr: string): string {
  const lastExport = localStorage.getItem('kine_last_export_date');
  if (!lastExport) return 'New';
  return dateStr <= lastExport ? 'Edit' : 'New';
}
