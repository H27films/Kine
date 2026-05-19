import React, { useState, useEffect } from 'react';
import { Dumbbell, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Page } from '../../types';

import { DailyActivityCards } from '../components/DailyActivityCards';
import { WeeklySummaryBar } from '../components/WeeklySummaryBar';
import WeeklyVolumeCompact from '../components/WeeklyVolumeCompact';
import CardioChartSection, { CARDIO_DISPLAY } from '../components/CardioChartSection';
import MonthlyCalendarChart from '../components/MonthlyCalendarChart';
import { supabase, weeksAgoMonday, malaysiaDateStr } from '../../lib/supabase';
import { WeeklyChart } from '../components/WeeklyChart';
import type { WeekData } from '../components/WeeklyChart';

type ChartTab = 'Cardio' | 'Weights' | 'Calories' | 'Score';

const TOTAL_CARDIO_IDS = [82, 83, 87];
const NO_TRACKER_CARDIO_IDS = [83, 84, 85, 86, 87];
const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const toTitleCase = (str: string) =>
  str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const CARDIO_ALWAYS = ['TRACKER', 'RUNNING', 'ROW', 'CROSS TRAINER', 'WALKING', 'CYCLE'];
const CARDIO_CONDITIONAL: string[] = [];

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

function groupWeightExerciseCounts(rows: { week: number; day: string; exercise_id: number }[]): Record<number, number[]> {
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

function groupByWeek(rows: { week: number; day: string; value: number }[]): WeekData[] {
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

export const Dashboard: React.FC<{ showWeeklySummary?: boolean; onNavigate?: (page: Page, data?: any) => void }> = ({ showWeeklySummary = false, onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState(() => malaysiaDateStr(new Date()));
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);
  const [weightsExpanded, setWeightsExpanded] = useState(false);
  const [monthlyOffset, setMonthlyOffset] = useState(0);
  const [monthlyMinOffset, setMonthlyMinOffset] = useState(-12);
  const [monthlyMaxOffset, setMonthlyMaxOffset] = useState(0);

  const [todayActivities, setTodayActivities] = useState<DayActivity[]>([]);
  const [totalMovement, setTotalMovement] = useState<number>(0);
  const [yesterdayMovement, setYesterdayMovement] = useState<number>(0);
  const [dailyScore, setDailyScore] = useState<number>(0);

  const [dayWeights, setDayWeights] = useState<DayWeight[]>([]);
  const [dayWeightsTotal, setDayWeightsTotal] = useState<number>(0);

  const [todayCalories, setTodayCalories] = useState<number>(0);
  const [foodRating, setFoodRating] = useState<string>('BAD');
  const [showFoodRatingLabel, setShowFoodRatingLabel] = useState(true);
  const [cardioWeeks, setCardioWeeks] = useState<WeekData[]>([]);
  const [weightsWeeks, setWeightsWeeks] = useState<WeekData[]>([]);
  const [weightsExerciseCounts, setWeightsExerciseCounts] = useState<Record<number, number[]>>({});
  const [calorieWeeks, setCalorieWeeks] = useState<WeekData[]>([]);
  const [scoreWeeks, setScoreWeeks] = useState<WeekData[]>([]);

  const [activityWeeklyData, setActivityWeeklyData] = useState<Record<string, number[]>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('kine:data-updated', handler);
    return () => window.removeEventListener('kine:data-updated', handler);
  }, []);

  useEffect(() => {
    const loadCardio = async () => {
      const activeDateStr = selectedDate;
      const yesterday = new Date(selectedDate + 'T00:00:00Z');
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDateStr = malaysiaDateStr(yesterday);

      const { data } = await supabase
        .from('workouts')
        .select('date, km, total_cardio, exercise_id, exercises:exercise_id(exercise_name)')
        .eq('type', 'CARDIO')
        .gte('date', yesterdayDateStr)
        .lte('date', activeDateStr);

      if (!data) return;

      const todayRows = data.filter((r: any) => r.date === activeDateStr);
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

      const hasTrackerYesterday = yesterdayRows.some((r: any) => (r.exercises?.exercise_name || '').toUpperCase() === 'TRACKER');
      const yestIds = hasTrackerYesterday ? TOTAL_CARDIO_IDS : NO_TRACKER_CARDIO_IDS;
      const yestTotal = yesterdayRows
        .filter((r: any) => yestIds.includes(r.exercise_id))
        .reduce((s: number, r: any) => s + Number(r.total_cardio || 0), 0);
      setYesterdayMovement(+yestTotal.toFixed(1));
    };
    loadCardio();

    const loadTodayScore = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('total_score')
        .eq('date', selectedDate)
        .not('total_score', 'is', null)
        .limit(1);
      setDailyScore(data && data.length > 0 ? Number(data[0].total_score) : 0);
    };
    loadTodayScore();

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
    loadTodayCalories();

    const loadFoodRating = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('food_rating')
        .eq('exercise_id', 89)
        .eq('date', selectedDate)
        .not('food_rating', 'is', null)
        .limit(1);
      setFoodRating(data && data.length > 0 ? String(data[0].food_rating) : 'BAD');
    };
    loadFoodRating();
  }, [selectedDate]);

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

  useEffect(() => {
    const loadWeights = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('total_weight, exercises:exercise_id(exercise_name)')
        .in('type', ['CHEST', 'BACK', 'LEGS'])
        .eq('date', selectedDate);

      if (!data) return;
      const exercises = (data as any[]).map(r => ({
        name: r.exercises?.exercise_name || 'Unknown',
        weight: Number(r.total_weight || 0),
      })).filter(e => e.weight > 0);
      setDayWeights(exercises);
      setDayWeightsTotal(exercises.reduce((s, e) => s + e.weight, 0));
    };
    loadWeights();
  }, [selectedDate]);

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
        setCardioWeeks(groupByWeek(
          (cardioData as any[]).map(r => ({ week: Number(r.week), day: r.day, value: Number(r.total_cardio || 0) }))
        ));
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
        setWeightsWeeks(groupByWeek(
          (weightsData as any[]).map(r => ({ week: Number(r.week), day: r.day, value: Number(r.total_weight || 0) }))
        ));
        setWeightsExerciseCounts(groupWeightExerciseCounts(
          (weightsData as any[]).map(r => ({ week: Number(r.week), day: r.day, exercise_id: Number(r.exercise_id) }))
        ));
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
        setCalorieWeeks(groupByWeek(
          (calData as any[]).map(r => ({ week: Number(r.week), day: r.day, value: Number(r.calories || 0) }))
        ));
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
        setScoreWeeks(groupByWeek(
          deduped.map(r => ({ week: Number(r.week), day: r.day, value: Number(r.total_score || 0) }))
        ));
      }
    };
    loadWeeklyCharts();
  }, [refreshKey]);

  useEffect(() => {
    const loadMonthlyLimits = async () => {
      const { data: minData } = await supabase
        .from('workouts')
        .select('date')
        .order('date', { ascending: true })
        .limit(1);
      const { data: maxData } = await supabase
        .from('workouts')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

      const current = new Date();
      if (minData && minData[0]) {
        const minD = new Date(minData[0].date + 'T12:00:00');
        const minOffset = (minD.getFullYear() - current.getFullYear()) * 12 + (minD.getMonth() - current.getMonth());
        setMonthlyMinOffset(minOffset);
      }
      if (maxData && maxData[0]) {
        const maxD = new Date(maxData[0].date + 'T12:00:00');
        const maxOffset = (maxD.getFullYear() - current.getFullYear()) * 12 + (maxD.getMonth() - current.getMonth());
        setMonthlyMaxOffset(maxOffset);
      }
    };
    loadMonthlyLimits();
  }, []);

  const visibleCardioKeys = [
    ...CARDIO_ALWAYS,
    ...CARDIO_CONDITIONAL.filter(key =>
      todayActivities.some(a => a.exercise_name === key && a.km > 0)
    ),
  ].sort((a, b) => {
    if (a === 'TRACKER') return -1;
    if (b === 'TRACKER') return 1;
    const aHasData = todayActivities.some(act => act.exercise_name === a && act.km > 0);
    const bHasData = todayActivities.some(act => act.exercise_name === b && act.km > 0);
    return (bHasData ? 1 : 0) - (aHasData ? 1 : 0);
  });

  const allWeekNumbers = Array.from(
    new Set([
      ...cardioWeeks.map(w => w.weekNumber),
      ...weightsWeeks.map(w => w.weekNumber),
      ...calorieWeeks.map(w => w.weekNumber),
      ...scoreWeeks.map(w => w.weekNumber),
    ])
  ).sort((a, b) => b - a);

  const weeklyActivityTotal = selectedActivity && activityWeeklyData[selectedActivity]
    ? +activityWeeklyData[selectedActivity].reduce((s, v) => s + v, 0).toFixed(1)
    : null;
  const displayMovement = weeklyActivityTotal !== null ? weeklyActivityTotal : totalMovement;

  const getCalendarDates = () => {
    const today = new Date();
    const todayMalaysia = malaysiaDateStr(today);
    const todayDate = new Date(todayMalaysia + 'T00:00:00Z');
    const todayDay = todayDate.getDay();
    const mondayDate = new Date(todayDate);
    mondayDate.setDate(todayDate.getDate() - (todayDay === 0 ? 6 : todayDay - 1));

    const dates: { dateStr: string; dayOfWeek: number; isSelected: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(mondayDate);
      date.setDate(mondayDate.getDate() + i);
      const dateStr = malaysiaDateStr(date);
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === todayMalaysia;
      dates.push({ dateStr, dayOfWeek: date.getDate(), isSelected, isToday });
    }
    return dates;
  };

  const calendarDates = getCalendarDates();

  return (
    <div className="-mt-2">
      {showWeeklySummary && (
        <div className="mb-3" style={{ marginBottom: '10px' }}>
          <WeeklySummaryBar />
        </div>
      )}

      {!showWeeklySummary && (
        <div className="flex justify-between items-center py-1 mb-1">
          {calendarDates.map((day, i) => (
            <div
              key={i}
              onClick={() => setSelectedDate(day.dateStr)}
              className="flex flex-col items-center cursor-pointer"
            >
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  marginBottom: '8px',
                  color: showWeeklySummary ? 'rgba(26,26,26,0.5)' : 'rgba(26,26,26,0.8)',
                }}
              >
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i]}
              </span>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  day.isSelected
                    ? 'bg-[#1a1a1a] text-white'
                    : day.isToday
                    ? 'border-2 border-black/20 text-[#1a1a1a]'
                    : 'text-[rgba(26,26,26,0.85)]'
                }`}
                style={{ fontFamily: "'Archivo', sans-serif" }}
              >
                {day.dayOfWeek}
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="pt-1 mb-4">
        <div className="flex items-start">
          <div className="text-[4rem] font-black leading-none tracking-tighter flex-shrink-0" style={{ color: '#1a1a1a' }}>
            {displayMovement > 0 ? displayMovement.toFixed(1) : '0.0'}
          </div>
          <div className="flex flex-col justify-center ml-4 pt-3 flex-1 min-w-0">
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '2.5px',
                color: '#1a1a1a',
                fontFamily: "'Archivo', sans-serif",
              }}
            >
              {selectedActivity
                ? `${CARDIO_DISPLAY[selectedActivity]?.label || selectedActivity} (KM)`
                : 'MOVEMENT (KM)'}
            </div>
            {selectedActivity && (
              <div className="text-[11px] font-medium" style={{ color: 'rgba(26,26,26,0.45)', fontFamily: "'Archivo', sans-serif" }}>This week</div>
            )}
            {!selectedActivity && yesterdayMovement > 0 && (
              <div className="text-[11px] font-medium" style={{ color: 'rgba(26,26,26,0.45)', fontFamily: "'Archivo', sans-serif" }}>Yesterday {yesterdayMovement.toFixed(1)} km</div>
            )}
          </div>

          {!selectedActivity && (
            <div
              className="flex items-center justify-center ml-4"
              style={{ marginTop: '10px', gap: showFoodRatingLabel ? '10px' : '5px', cursor: 'pointer' }}
              onClick={() => setShowFoodRatingLabel(v => !v)}
            >
              {showFoodRatingLabel && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  color: 'rgba(26,26,26,0.9)',
                  textTransform: 'uppercase',
                  fontFamily: "'Archivo', sans-serif",
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  lineHeight: 1.25,
                }}>
                  FOOD<br />RATING
                </span>
              )}
              <div className="flex flex-col items-center justify-center" style={{ gap: '5px' }}>
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#1a1a1a' }}></div>
                {(foodRating === 'OK' || foodRating === 'GOOD') && (
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: 'rgba(26,26,26,0.55)' }}></div>
                )}
                {foodRating === 'GOOD' && (
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: 'rgba(26,26,26,0.25)' }}></div>
                )}
              </div>
            </div>
          )}

          {selectedActivity && (
            <div
              onClick={() => {
                if (onNavigate) {
                  onNavigate('cardio', { selectedActivity });
                } else {
                  const btn = document.querySelector('[data-page="cardio"]') as HTMLButtonElement;
                  btn?.click();
                }
              }}
              style={{ cursor: 'pointer', marginLeft: '16px', marginTop: '12px' }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Plus size={16} color="#ffffff" />
              </div>
            </div>
          )}
        </div>

        <CardioChartSection
          selectedActivity={selectedActivity}
          setSelectedActivity={setSelectedActivity}
          activityWeeklyData={activityWeeklyData}
          visibleCardioKeys={visibleCardioKeys}
          todayActivities={todayActivities}
          todayCalories={todayCalories}
        />
      </section>

      <section className="mb-6">
        <div className={`rounded-lg ${dayWeights.length > 0 ? 'p-5' : 'p-3'} cursor-pointer`} style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderLeft: '2px solid rgba(0,0,0,0.9)', boxShadow: '0 5px 12px rgba(0,0,0,0.08)' }} onClick={() => setWeightsExpanded(!weightsExpanded)}>
          <div className={`flex items-center justify-between ${dayWeights.length > 0 ? 'mb-4' : 'mb-0'}`}>
            <div className="flex items-center gap-2">
              <Dumbbell size={16} color="#1a1a1a" />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 650,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: 'rgba(26,26,26,0.8)',
                  fontFamily: "'Archivo', sans-serif",
                }}
              >
                Weights
              </span>
            </div>
            {dayWeights.length > 0 && (
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                backgroundColor: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#ffffff', lineHeight: 1, fontFamily: "'Archivo', sans-serif" }}>
                  {dayWeights.length}
                </span>
              </div>
            )}
          </div>
          {dayWeights.length > 0 ? (
            <>
              <div className="text-4xl font-black tracking-tight" style={{ color: '#1a1a1a' }}>
                {Math.round(dayWeightsTotal).toLocaleString()} <span style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '0.08em', color: 'rgba(26,26,26,0.7)' }}>KG</span>
              </div>
              <div className="mt-4 space-y-2">
                {dayWeights.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] font-medium" style={{ color: 'rgba(26,26,26,0.9)', fontFamily: "'Archivo', sans-serif" }}>{toTitleCase(ex.name)}</span>
                    <span className="text-[12px] font-bold" style={{ color: '#1a1a1a' }}>{Math.round(ex.weight).toLocaleString()} kg</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[13px] font-medium py-1" style={{ color: 'rgba(26,26,26,0.3)', fontFamily: "'Archivo', sans-serif" }}>No weights logged</div>
          )}
        </div>
      </section>

      {weightsExpanded && (
        <section className="mb-4 mt-1.5">
          <WeeklyVolumeCompact selectedWeekNumber={selectedWeekNumber} allWeekNumbers={allWeekNumbers} />
        </section>
      )}

      <section className="mt-8">
        <WeeklyChart
          cardioWeeks={cardioWeeks}
          weightsWeeks={weightsWeeks}
          calorieWeeks={calorieWeeks}
          scoreWeeks={scoreWeeks}
          weightsExerciseCounts={weightsExerciseCounts}
          selectedWeekNumber={selectedWeekNumber}
          onWeekChange={setSelectedWeekNumber}
        />
      </section>

      <section className="mt-8">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#1a1a1a',
              fontFamily: "'Archivo', sans-serif",
            }}>
              Monthly
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button
                onClick={() => setMonthlyOffset(o => Math.max(o - 1, monthlyMinOffset))}
                disabled={monthlyOffset <= monthlyMinOffset}
                style={{ opacity: monthlyOffset <= monthlyMinOffset ? 0.2 : 0.9, background: 'none', border: 'none', cursor: monthlyOffset <= monthlyMinOffset ? 'default' : 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={18} color="#1a1a1a" />
              </button>
              <button
                onClick={() => setMonthlyOffset(o => Math.min(o + 1, monthlyMaxOffset))}
                disabled={monthlyOffset >= monthlyMaxOffset}
                style={{ opacity: monthlyOffset >= monthlyMaxOffset ? 0.2 : 0.9, background: 'none', border: 'none', cursor: monthlyOffset >= monthlyMaxOffset ? 'default' : 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <ChevronRight size={18} color="#1a1a1a" />
              </button>
            </div>
          </div>
          <span style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: '#1a1a1a',
            fontFamily: "'Archivo', sans-serif",
          }}>
            {(() => {
              const d = new Date();
              d.setMonth(d.getMonth() + monthlyOffset);
              return d.toLocaleString('default', { month: 'long' }).toUpperCase();
            })()}
          </span>
        </div>
        <MonthlyCalendarChart monthOffset={monthlyOffset} containerStyle={{ backgroundColor: 'rgba(0,0,0,0.05)', borderLeft: '2px solid rgba(0,0,0,0.9)', boxShadow: '0 5px 12px rgba(0,0,0,0.08)', padding: '32px 24px' }} />
      </section>

      <section className="mt-8">
        <DailyActivityCards />
      </section>
    </div>
  );
};