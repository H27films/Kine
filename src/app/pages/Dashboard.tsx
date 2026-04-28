import React, { useState, useEffect } from 'react';
import { Dumbbell, ChevronLeft, ChevronRight } from 'lucide-react';
import { DailyActivityCards } from '../components/DailyActivityCards';
import { WeeklySummaryBar } from '../components/WeeklySummaryBar';
import WeeklyVolumeCompact from '../components/WeeklyVolumeCompact';
import CardioChartSection, { CARDIO_DISPLAY } from '../components/CardioChartSection';
import MonthlyCalendarChart from '../components/MonthlyCalendarChart';
import { supabase, weeksAgoMonday } from '../../lib/supabase';

type ChartTab = 'Cardio' | 'Weights' | 'Calories' | 'Score';

const TOTAL_CARDIO_IDS = [82, 83, 87];          // Tracker + Row + Cycle
const NO_TRACKER_CARDIO_IDS = [83, 84, 85, 86, 87]; // Row + Running + Walking + Cross Trainer + Cycle
const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const toTitleCase = (str: string) =>
  str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());



const CARDIO_ALWAYS = ['TRACKER', 'RUNNING', 'ROW', 'CROSS TRAINER'];
const CARDIO_CONDITIONAL = ['WALKING', 'CYCLE'];

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

interface WeekData {
  weekNumber: number;
  days: number[];
}

// Returns Record<weekNumber, number[7]> — count of unique exercise_ids per day
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

/**
 * Convert a Date to YYYY-MM-DD in Malaysia local time (UTC+8).
 * Used for calendar and date filtering.
 */
function malaysiaDateStr(d: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kuala_Lumpur',
  });
  return formatter.format(d);
}

const WeeklyChart: React.FC<{
  cardioWeeks: WeekData[];
  weightsWeeks: WeekData[];
  calorieWeeks: WeekData[];
  scoreWeeks: WeekData[];
  weightsExerciseCounts: Record<number, number[]>;
  selectedWeekNumber?: number | null;
  onWeekChange?: (week: number | null) => void;
}> = ({ cardioWeeks, weightsWeeks, calorieWeeks, scoreWeeks, weightsExerciseCounts, selectedWeekNumber: propWeek, onWeekChange }) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('Cardio');
  const [internalWeek, setInternalWeek] = useState<number | null>(null);
  const controlledWeek = propWeek !== undefined ? propWeek : internalWeek;
  const setWeek = onWeekChange || setInternalWeek;

  const chartConfig: Record<ChartTab, { weeks: WeekData[]; unit: string }> = {
    Cardio:   { weeks: cardioWeeks,  unit: 'km' },
    Weights:  { weeks: weightsWeeks, unit: 'kg' },
    Calories: { weeks: calorieWeeks, unit: '' },
    Score:    { weeks: scoreWeeks,   unit: '' },
  };

  const { weeks, unit } = chartConfig[activeTab];

  const allWeekNumbers = Array.from(
    new Set([
      ...cardioWeeks.map(w => w.weekNumber),
      ...weightsWeeks.map(w => w.weekNumber),
      ...calorieWeeks.map(w => w.weekNumber),
      ...scoreWeeks.map(w => w.weekNumber),
    ])
  ).sort((a, b) => b - a);

  const effectiveWeekNumber = controlledWeek ?? (allWeekNumbers[0] ?? null);
  const current = weeks.find(w => w.weekNumber === effectiveWeekNumber) ?? null;
  const data = current?.days || Array(7).fill(0);
  const rawMax = Math.max(...data, 1);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekLabel = effectiveWeekNumber !== null ? `${effectiveWeekNumber}` : '\u2014';

  const currentGlobalIdx = effectiveWeekNumber !== null ? allWeekNumbers.indexOf(effectiveWeekNumber) : 0;
  const canPrev = currentGlobalIdx < allWeekNumbers.length - 1;
  const canNext = currentGlobalIdx > 0;
  const onPrev = () => { if (canPrev) setWeek(allWeekNumbers[currentGlobalIdx + 1]); };
  const onNext = () => { if (canNext) setWeek(allWeekNumbers[currentGlobalIdx - 1]); };

  const yMin = activeTab === 'Cardio' ? 5 : activeTab === 'Calories' ? 500 : 0;
  const yMax = activeTab === 'Cardio' ? 20 : activeTab === 'Score' ? Math.max(rawMax, 100) : rawMax;

  const summaryParts = (() => {
    const nonZero = data.filter(v => v > 0);
    const total = data.reduce((s, v) => s + v, 0);
    if (activeTab === 'Cardio') {
      return { value: total > 0 ? total.toFixed(1) : '0.0', unit: 'KM' };
    } else if (activeTab === 'Weights') {
      const k = total / 1000;
      return { value: total > 0 ? (k >= 10 ? `${Math.round(k)}K` : `${k.toFixed(1)}K`) : '0K', unit: '' };
    } else if (activeTab === 'Calories') {
      if (nonZero.length === 0) return { value: '\u2014', unit: 'Kcal' };
      const avg = Math.round(total / nonZero.length);
      return { value: avg.toLocaleString(), unit: 'Kcal' };
    } else {
      if (nonZero.length === 0) return { value: '\u2014', unit: '' };
      const avg = Math.round(total / nonZero.length);
      return { value: avg.toLocaleString(), unit: 'pts' };
    }
  })();

  return (
    <div>
      {/* WEEKLY heading with chevrons + week number */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#ffffff',
          }}>Weekly</span>
          <button onClick={onPrev} disabled={!canPrev} style={{ opacity: !canPrev ? 0.2 : 0.55, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={18} color="white" />
          </button>
          <button onClick={onNext} disabled={!canNext} style={{ opacity: !canNext ? 0.2 : 0.55, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={18} color="white" />
          </button>
        </div>
        <span style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: '#ffffff',
          marginRight: '6px',
        }}>{weekLabel}</span>
      </div>

      <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>
        {/* Tabs only — chevrons moved above */}
        <div className="flex items-center mb-3">
          <div className="flex gap-4">
            {(['Cardio', 'Weights', 'Calories', 'Score'] as ChartTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  paddingBottom: '4px',
                  color: activeTab === tab ? '#ffffff' : 'rgba(255,255,255,0.3)',
                  borderBottom: activeTab === tab ? '2px solid #ffffff' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-baseline gap-1 mb-5">
          <span style={{
            fontSize: '1.6rem',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            lineHeight: 1,
          }}>
            {summaryParts.value}
          </span>
          {summaryParts.unit && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.12em',
            }}>
              {summaryParts.unit}
            </span>
          )}
          {activeTab === 'Weights' && effectiveWeekNumber !== null && (() => {
            const exerciseTotal = (weightsExerciseCounts[effectiveWeekNumber] || []).reduce((s, c) => s + c, 0);
            return (
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', marginLeft: '8px' }}>
                <span style={{ color: '#ffffff' }}> / {exerciseTotal}</span>
                <span style={{ color: 'rgba(255,255,255,0.35)' }}> EX</span>
              </span>
            );
          })()}
        </div>

        <div className="flex items-end justify-between h-44" style={{ gap: '12px' }}>
          {data.map((val, i) => {
            const clampedVal = Math.min(Math.max(val, yMin), yMax);
            const pct = val > 0 ? Math.max((clampedVal - yMin) / (yMax - yMin), 0.04) : 0;
            const rawPct = rawMax > 0 ? val / rawMax : 0;
            const brightness = Math.round(80 + rawPct * 175);
            const barColor = val > 0 ? `rgb(${brightness},${brightness},${brightness})` : 'rgba(255,255,255,0.05)';
            let barLabel = '';
            if (val > 0) {
              if (unit === 'kg') {
                barLabel = `${Math.round(val / 1000)}k`;
              } else if (unit === 'km') {
                barLabel = `${+val.toFixed(1)}`;
              } else {
                barLabel = `${Math.round(val)}`;
              }
            }
            const exerciseCount = activeTab === 'Weights' && effectiveWeekNumber !== null
              ? (weightsExerciseCounts[effectiveWeekNumber]?.[i] ?? 0)
              : 0;
            return (
              <div key={i} className="flex flex-col items-center h-full justify-end" style={{ flex: '1', maxWidth: '28px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>{barLabel}</div>
                <div className="w-full relative transition-all" style={{ height: `${pct * 100}%`, backgroundColor: barColor, borderRadius: '9999px 9999px 0 0', minHeight: val > 0 ? '4px' : 0 }}>
                  {activeTab === 'Weights' && exerciseCount > 0 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '5px',
                      left: 0,
                      right: 0,
                      display: 'flex',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#ffffff',
                        lineHeight: 1,
                      }}>
                        {exerciseCount}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ffffff', marginTop: '8px' }}>{days[i]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<{ showWeeklySummary?: boolean }> = ({ showWeeklySummary = false }) => {
  // ===== FIXED: Use Malaysia timezone for selected date =====
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
  const [cardioWeeks, setCardioWeeks] = useState<WeekData[]>([]);
  const [weightsWeeks, setWeightsWeeks] = useState<WeekData[]>([]);
  const [weightsExerciseCounts, setWeightsExerciseCounts] = useState<Record<number, number[]>>({});
  const [calorieWeeks, setCalorieWeeks] = useState<WeekData[]>([]);
  const [scoreWeeks, setScoreWeeks] = useState<WeekData[]>([]);

  const [activityWeeklyData, setActivityWeeklyData] = useState<Record<string, number[]>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for data updates from TrackerEditSheet etc.
  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('kine:data-updated', handler);
    return () => window.removeEventListener('kine:data-updated', handler);
  }, []);

  useEffect(() => {
    const loadCardio = async () => {
      // ===== FIXED: Use Malaysia timezone =====
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

    // Today's score
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

    // Today's calories for progress bar
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

  // Load min/max months for monthly navigation
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
    // Tracker always first
    if (a === 'TRACKER') return -1;
    if (b === 'TRACKER') return 1;
    // Then activities with today's data (km > 0)
    const aHasData = todayActivities.some(act => act.exercise_name === a && act.km > 0);
    const bHasData = todayActivities.some(act => act.exercise_name === b && act.km > 0);
    return (bHasData ? 1 : 0) - (aHasData ? 1 : 0); // Activities with data first
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

  // ===== FIXED: Calendar generation using Malaysia timezone =====
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
        <div className="mb-6">
          <WeeklySummaryBar />
        </div>
      )}

      {/* ===== FIXED: Calendar section with Malaysia timezone ===== */}
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
                  color: showWeeklySummary ? 'rgba(255,255,255,0.3)' : '#ffffff',
                }}
              >
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i]}
              </span>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  day.isSelected
                    ? 'bg-white text-black'
                    : day.isToday
                    ? 'border-2 border-white/40 text-white'
                    : 'text-white/40'
                }`}
              >
                {day.dayOfWeek}
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="pt-1 mb-4">
        <div className="flex items-start">
          <div className="text-[4rem] font-black leading-none tracking-tighter text-white flex-shrink-0">
            {displayMovement > 0 ? displayMovement.toFixed(1) : '0.0'}
          </div>
          <div className="flex flex-col justify-center ml-4 pt-3 flex-1 min-w-0">
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '2.5px',
                color: '#ffffff',
              }}
            >
              {selectedActivity
                ? `${CARDIO_DISPLAY[selectedActivity]?.label || selectedActivity} (KM)`
                : 'MOVEMENT (KM)'}
            </div>
            {selectedActivity && (
              <div className="text-[11px] font-medium mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                This week
              </div>
            )}
            {!selectedActivity && yesterdayMovement > 0 && (
              <div className="text-[11px] font-medium mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Yesterday {yesterdayMovement.toFixed(1)} km
              </div>
            )}
          </div>
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

      <section className="mb-4">
        <div className={`rounded-lg ${dayWeights.length > 0 ? 'p-5' : 'p-3'} cursor-pointer`} style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }} onClick={() => setWeightsExpanded(!weightsExpanded)}>
          <div className={`flex items-center justify-between ${dayWeights.length > 0 ? 'mb-4' : 'mb-0'}`}>
            <div className="flex items-center gap-2">
              <Dumbbell size={16} color="white" />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Weights
              </span>
            </div>
            {/* Score circle */}
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#000000', lineHeight: 1 }}>
                {dailyScore > 0 ? dailyScore : '—'}
              </span>
            </div>
          </div>
          {dayWeights.length > 0 ? (
            <>
              <div className="text-4xl font-black text-white tracking-tight">
                {Math.round(dayWeightsTotal).toLocaleString()} <span className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>KG</span>
              </div>
              <div className="mt-4 space-y-2">
                {dayWeights.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-white/60">{toTitleCase(ex.name)}</span>
                    <span className="text-[12px] font-bold text-white">{Math.round(ex.weight).toLocaleString()} kg</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[13px] text-white/30 font-medium py-1">No weights logged</div>
          )}
        </div>
      </section>

      {weightsExpanded && (
        <section className="mb-4 mt-0">
          <WeeklyVolumeCompact selectedWeekNumber={selectedWeekNumber} allWeekNumbers={allWeekNumbers} />
        </section>
      )}

      <section className="mt-8">
        <WeeklyChart cardioWeeks={cardioWeeks} weightsWeeks={weightsWeeks} calorieWeeks={calorieWeeks} scoreWeeks={scoreWeeks} weightsExerciseCounts={weightsExerciseCounts} selectedWeekNumber={selectedWeekNumber} onWeekChange={setSelectedWeekNumber} />
      </section>

      <section className="mt-8">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              color: '#ffffff',
            }}>
              Monthly
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button
                onClick={() => setMonthlyOffset(o => Math.max(o - 1, monthlyMinOffset))}
                disabled={monthlyOffset <= monthlyMinOffset}
                style={{ opacity: monthlyOffset <= monthlyMinOffset ? 0.2 : 0.55, background: 'none', border: 'none', cursor: monthlyOffset <= monthlyMinOffset ? 'default' : 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={18} color="white" />
              </button>
              <button
                onClick={() => setMonthlyOffset(o => Math.min(o + 1, monthlyMaxOffset))}
                disabled={monthlyOffset >= monthlyMaxOffset}
                style={{ opacity: monthlyOffset >= monthlyMaxOffset ? 0.2 : 0.55, background: 'none', border: 'none', cursor: monthlyOffset >= monthlyMaxOffset ? 'default' : 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <ChevronRight size={18} color="white" />
              </button>
            </div>
          </div>
          <span style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: '#ffffff',
          }}>
            {(() => {
              const d = new Date();
              d.setMonth(d.getMonth() + monthlyOffset);
              return d.toLocaleString('default', { month: 'long' }).toUpperCase();
            })()}
          </span>
        </div>
        <MonthlyCalendarChart monthOffset={monthlyOffset} containerStyle={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff', padding: '32px 24px' }} />
      </section>

      <section className="mt-8">
        <DailyActivityCards />
      </section>
    </div>
  );
};
