import { useState, useEffect } from 'react';
import { supabase, weeksAgoMonday, malaysiaDateStr } from '../../lib/supabase';
import { groupByWeek, groupWeightExerciseCounts } from '../../lib/dashboardUtils';
import type { WeekData } from '../components/WeeklyChart';

const TOTAL_CARDIO_IDS = [82, 83, 87];
const NO_TRACKER_CARDIO_IDS = [83, 84, 85, 86, 87];

interface DayActivity {
  exercise_id: number;
  exercise_name: string;
  km: number;
  total_cardio: number;
}

interface DayWeight {
  name: string;
  weight: number;
}

export function useDashboardData(selectedDate: string, refreshKey: number) {
  const [todayActivities, setTodayActivities] = useState<DayActivity[]>([]);
  const [totalMovement, setTotalMovement] = useState<number>(0);
  const [yesterdayMovement, setYesterdayMovement] = useState<number>(0);
  const [dailyScore, setDailyScore] = useState<number>(0);

  const [dayWeights, setDayWeights] = useState<DayWeight[]>([]);
  const [dayWeightsTotal, setDayWeightsTotal] = useState<number>(0);

  const [todayCalories, setTodayCalories] = useState<number>(0);
  const [weightTrainingCalories, setWeightTrainingCalories] = useState<number>(0);
  const [foodRating, setFoodRating] = useState<string | null>(null);

  const [cardioWeeks, setCardioWeeks] = useState<WeekData[]>([]);
  const [weightsWeeks, setWeightsWeeks] = useState<WeekData[]>([]);
  const [weightsExerciseCounts, setWeightsExerciseCounts] = useState<Record<number, number[]>>({});
  const [calorieWeeks, setCalorieWeeks] = useState<WeekData[]>([]);
  const [scoreWeeks, setScoreWeeks] = useState<WeekData[]>([]);

  const [activityWeeklyData, setActivityWeeklyData] = useState<Record<string, number[]>>({});

  const [weeklyCalories, setWeeklyCalories] = useState<number[]>(Array(7).fill(0));
  const [monthlyMinOffset, setMonthlyMinOffset] = useState(-12);
  const [monthlyMaxOffset, setMonthlyMaxOffset] = useState(0);

  useEffect(() => {
    const loadCardio = async () => {
      const yesterday = new Date(selectedDate + 'T00:00:00Z');
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDateStr = malaysiaDateStr(yesterday);

      const { data } = await supabase
        .from('workouts')
        .select('date, km, total_cardio, exercise_id, exercises:exercise_id(exercise_name)')
        .eq('type', 'CARDIO')
        .gte('date', yesterdayDateStr)
        .lte('date', selectedDate);

      if (!data) return;

      const todayRows = data.filter((r: any) => r.date === selectedDate);
      const yesterdayRows = data.filter((r: any) => r.date === yesterdayDateStr);

      const activities: DayActivity[] = todayRows
        .filter((r: any) => r.km && r.km > 0)
        .map((r: any) => ({
          exercise_id: r.exercise_id,
          exercise_name: r.exercises?.exercise_name || 'Unknown',
          km: Number(r.km),
          total_cardio: Number(r.total_cardio || 0),
        }));

      setTodayActivities(activities);

      const hasTrackerToday = activities.some(a => a.exercise_name?.toUpperCase() === 'TRACKER');
      const todayIds = hasTrackerToday ? TOTAL_CARDIO_IDS : NO_TRACKER_CARDIO_IDS;
      const totalCardio = activities
        .filter(a => todayIds.includes(a.exercise_id))
        .reduce((s, a) => s + a.total_cardio, 0);
      setTotalMovement(+totalCardio.toFixed(1));

      const hasTrackerYesterday = yesterdayRows.some(
        (r: any) => (r.exercises?.exercise_name || '').toUpperCase() === 'TRACKER'
      );
      const yestIds = hasTrackerYesterday ? TOTAL_CARDIO_IDS : NO_TRACKER_CARDIO_IDS;
      const yestTotal = yesterdayRows
        .filter((r: any) => yestIds.includes(r.exercise_id))
        .reduce((s: number, r: any) => s + Number(r.total_cardio || 0), 0);
      setYesterdayMovement(+yestTotal.toFixed(1));
    };

    const loadTodayScore = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('total_score')
        .eq('date', selectedDate)
        .not('total_score', 'is', null)
        .limit(1);
      setDailyScore(data && data.length > 0 ? Number(data[0].total_score) : 0);
    };

    const loadTodayCalories = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('calories')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', 90)
        .eq('date', selectedDate)
        .not('calories', 'is', null)
        .limit(1);
      setTodayCalories(data && data.length > 0 ? Number(data[0].calories) : 0);
    };

    const loadWeightTrainingCalories = async () => {
      const { data } = await supabase
        .from('strava')
        .select('workout_calories')
        .eq('type', 'WeightTraining')
        .eq('date', selectedDate);
      
      if (!data) {
        setWeightTrainingCalories(0);
        return;
      }
      
      const totalCalories = data.reduce((sum: number, row: any) => {
        return sum + (Number(row.workout_calories) || 0);
      }, 0);
      setWeightTrainingCalories(Math.round(totalCalories));
    };

    const loadFoodRating = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('food_rating')
        .eq('exercise_id', 89)
        .eq('date', selectedDate)
        .not('food_rating', 'is', null)
        .limit(1);
      const rating = data && data.length > 0 ? String(data[0].food_rating) : null;
      setFoodRating(rating);
    };

    const loadWeights = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('total_weight, exercises:exercise_id(exercise_name)')
        .in('type', ['CHEST', 'BACK', 'LEGS'])
        .eq('date', selectedDate);

      if (!data) return;
      const exercises = (data as any[])
        .map(r => ({ name: r.exercises?.exercise_name || 'Unknown', weight: Number(r.total_weight || 0) }))
        .filter(e => e.weight > 0);
      setDayWeights(exercises);
      setDayWeightsTotal(exercises.reduce((s, e) => s + e.weight, 0));
    };

    loadCardio();
    loadTodayScore();
    loadTodayCalories();
    loadWeightTrainingCalories();
    loadFoodRating();
    loadWeights();
    loadWeeklyCalories();
  }, [selectedDate, refreshKey]);

  useEffect(() => {
    const loadActivityWeekly = async () => {
      const monday = weeksAgoMonday(0);
      const { data } = await supabase
        .from('workouts')
        .select('date, km, exercises:exercise_id(exercise_name)')
        .eq('type', 'CARDIO')
        .gte('date', monday);

      if (!data) return;

      const result: Record<string, number[]> = {};
      for (const row of data as any[]) {
        const name: string = row.exercises?.exercise_name || 'Unknown';
        if (!result[name]) result[name] = Array(7).fill(0);
        const d = new Date(row.date + 'T12:00:00Z');
        const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
        result[name][dow] = +(result[name][dow] + Number(row.km || 0)).toFixed(2);
      }
      setActivityWeeklyData(result);
    };
    loadActivityWeekly();
  }, []);

  const loadWeeklyCalories = async () => {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    const mondayStr = malaysiaDateStr(monday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayStr = malaysiaDateStr(sunday);

    const { data } = await supabase.from('workouts')
      .select('date, calories')
      .eq('type', 'MEASUREMENT')
      .eq('exercise_id', 90)
      .gte('date', mondayStr)
      .lte('date', sundayStr)
      .not('calories', 'is', null)
      .order('date', { ascending: true });

    const weekly = Array(7).fill(0);
    if (data) {
      for (const row of data as any[]) {
        const d = new Date(row.date + 'T12:00:00');
        const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        weekly[dayIdx] += Number(row.calories);
      }
    }
    setWeeklyCalories(weekly);
  };

  useEffect(() => {
    const loadWeeklyCharts = async () => {
      const { data: cardioData } = await supabase
        .from('workouts')
        .select('week, day, date, total_cardio, exercise_id')
        .eq('type', 'CARDIO')
        .in('exercise_id', TOTAL_CARDIO_IDS)
        .not('week', 'is', null)
        .not('day', 'is', null)
        .order('week', { ascending: false })
        .limit(1000);

      if (cardioData) {
        setCardioWeeks(
          groupByWeek((cardioData as any[]).map(r => ({ week: Number(r.week), day: r.day, value: Number(r.total_cardio || 0) })))
        );
      }

      const { data: weightsData } = await supabase
        .from('workouts')
        .select('week, day, date, total_weight, exercise_id')
        .in('type', ['CHEST', 'BACK', 'LEGS'])
        .not('week', 'is', null)
        .not('day', 'is', null)
        .order('week', { ascending: false })
        .limit(1000);

      if (weightsData) {
        setWeightsWeeks(
          groupByWeek((weightsData as any[]).map(r => ({ week: Number(r.week), day: r.day, value: Number(r.total_weight || 0) })))
        );
        setWeightsExerciseCounts(
          groupWeightExerciseCounts((weightsData as any[]).map(r => ({ week: Number(r.week), day: r.day, exercise_id: Number(r.exercise_id) })))
        );
      }

      const { data: calData } = await supabase
        .from('workouts')
        .select('week, day, date, calories')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', 90)
        .not('calories', 'is', null)
        .not('week', 'is', null)
        .not('day', 'is', null)
        .order('week', { ascending: false })
        .limit(1000);

      if (calData) {
        setCalorieWeeks(
          groupByWeek((calData as any[]).map(r => ({ week: Number(r.week), day: r.day, value: Number(r.calories || 0) })))
        );
      }

      const { data: scoreData } = await supabase
        .from('workouts')
        .select('week, day, date, total_score')
        .not('total_score', 'is', null)
        .not('week', 'is', null)
        .not('day', 'is', null)
        .order('week', { ascending: false })
        .limit(1000);

      if (scoreData) {
        const seen = new Set<string>();
        const deduped = (scoreData as any[]).filter(r => {
          const key = `${r.week}_${r.day}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setScoreWeeks(
          groupByWeek(deduped.map(r => ({ week: Number(r.week), day: r.day, value: Number(r.total_score || 0) })))
        );
      }
    };
    loadWeeklyCharts();
  }, [refreshKey]);

  useEffect(() => {
    const loadMonthlyLimits = async () => {
      const { data: minData } = await supabase.from('workouts').select('date').order('date', { ascending: true }).limit(1);
      const { data: maxData } = await supabase.from('workouts').select('date').order('date', { ascending: false }).limit(1);
      const current = new Date();

      if (minData && minData[0]) {
        const minD = new Date(minData[0].date + 'T12:00:00');
        setMonthlyMinOffset((minD.getFullYear() - current.getFullYear()) * 12 + (minD.getMonth() - current.getMonth()));
      }
      if (maxData && maxData[0]) {
        const maxD = new Date(maxData[0].date + 'T12:00:00');
        setMonthlyMaxOffset((maxD.getFullYear() - current.getFullYear()) * 12 + (maxD.getMonth() - current.getMonth()));
      }
    };
    loadMonthlyLimits();
  }, []);

  return {
    todayActivities,
    totalMovement,
    yesterdayMovement,
    dailyScore,
    dayWeights,
    dayWeightsTotal,
    todayCalories,
    weightTrainingCalories,
    foodRating,
    cardioWeeks,
    weightsWeeks,
    weightsExerciseCounts,
    calorieWeeks,
    scoreWeeks,
    activityWeeklyData,
    monthlyMinOffset,
    monthlyMaxOffset,
    weeklyCalories,
  };
}
