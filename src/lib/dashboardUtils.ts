import type { WeekData } from '../app/components/WeeklyChart';

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function groupByWeek(rows: { week: number; day: string; value: number }[]): WeekData[] {
  const map: Record<number, number[]> = {};
  for (const r of rows) {
    if (!map[r.week]) map[r.week] = Array(7).fill(0);
    const idx = DAY_ORDER.indexOf(r.day);
    if (idx >= 0) map[r.week][idx] = +(map[r.week][idx] + r.value).toFixed(2);
  }
  return Object.entries(map)
    .map(([w, days]) => ({ weekNumber: Number(w), days }))
    .sort((a, b) => b.weekNumber - a.weekNumber);
}

export function groupWeightExerciseCounts(
  rows: { week: number; day: string; exercise_id: number }[]
): Record<number, number[]> {
  const map: Record<number, Set<number>[]> = {};
  for (const r of rows) {
    if (!map[r.week]) map[r.week] = Array.from({ length: 7 }, () => new Set<number>());
    const idx = DAY_ORDER.indexOf(r.day);
    if (idx >= 0) map[r.week][idx].add(r.exercise_id);
  }
  const result: Record<number, number[]> = {};
  for (const [w, sets] of Object.entries(map)) {
    result[Number(w)] = sets.map(s => s.size);
  }
  return result;
}
