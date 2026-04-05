import React, { useState, useEffect } from 'react';
import { Dumbbell, ChevronLeft, ChevronRight, Footprints } from 'lucide-react';
import { DailyActivityCards } from '../components/DailyActivityCards';
import { WeeklySummaryBar } from '../components/WeeklySummaryBar';
import { supabase, weeksAgoMonday } from '../../lib/supabase';

type ChartTab = 'Cardio' | 'Weights' | 'Calories';

const TOTAL_CARDIO_IDS = [82, 83, 87];          // Tracker + Row + Cycle
const NO_TRACKER_CARDIO_IDS = [83, 84, 85, 86, 87]; // Row + Running + Walking + Cross Trainer + Cycle
const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const toTitleCase = (str: string) =>
  str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const CARDIO_DISPLAY: Record<string, { label: string; icon: React.ReactNode }> = {
  RUNNING: {
    label: 'Run',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="18" width="35" height="3" rx="1.5" fill="white"/>
        <rect x="15" y="28" width="25" height="3" rx="1.5" fill="white"/>
        <rect x="5" y="38" width="30" height="3" rx="1.5" fill="white"/>
        <rect x="20" y="48" width="25" height="3" rx="1.5" fill="white"/>
        <rect x="15" y="58" width="25" height="3" rx="1.5" fill="white"/>
        <circle cx="72" cy="22" r="6" fill="white"/>
        <path d="M48 38L65 28L75 35L85 45" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M65 28L55 45L40 38" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M55 45L65 65L70 85" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M55 45L45 55L22 62" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  ROW: {
    label: 'Row',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="25" r="5" fill="white"/>
        <path d="M50 30L45 50L55 55L65 45" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M45 50L40 60H55" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M65 45L75 45V35" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M30 65H80" stroke="white" strokeWidth="5" strokeLinecap="round"/>
      </svg>
    ),
  },
  CYCLE: {
    label: 'Cycle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="70" r="15" stroke="white" strokeWidth="5"/>
        <circle cx="75" cy="70" r="15" stroke="white" strokeWidth="5"/>
        <path d="M25 70L45 45H65L75 70" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M45 45L55 30H65" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="55" cy="25" r="4" fill="white"/>
      </svg>
    ),
  },
  WALKING: {
    label: 'Walk',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 70C40 80 30 85 25 80C20 75 25 60 30 50C35 40 45 40 45 50C45 60 40 60 40 70Z" fill="white"/>
        <circle cx="25" cy="40" r="3" fill="white"/>
        <circle cx="32" cy="35" r="3" fill="white"/>
        <circle cx="40" cy="35" r="3" fill="white"/>
        <circle cx="48" cy="40" r="3" fill="white"/>
        <path d="M60 70C60 80 70 85 75 80C80 75 75 60 70 50C65 40 55 40 55 50C55 60 60 60 60 70Z" fill="white"/>
        <circle cx="75" cy="40" r="3" fill="white"/>
        <circle cx="68" cy="35" r="3" fill="white"/>
        <circle cx="60" cy="35" r="3" fill="white"/>
        <circle cx="52" cy="40" r="3" fill="white"/>
      </svg>
    ),
  },
  'CROSS TRAINER': {
    label: 'Cross-Trainer',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="75" width="50" height="8" fill="white"/>
        <rect x="35" y="70" width="35" height="5" fill="white"/>
        <rect x="56" y="65" width="14" height="5" fill="white"/>
        <path d="M62 65V45L68 40" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="47" cy="23" r="6" fill="white"/>
        <path d="M47 28L40 45" stroke="white" strokeWidth="9" strokeLinecap="round"/>
        <path d="M47 30L55 38L60 38" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M47 30L35 35L28 42" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M40 45L45 55L52 65" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M40 45L35 60L28 70" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  TRACKER: { label: 'Tracker', icon: <Footprints size={18} /> },
};

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

const WeeklyChart: React.FC<{
  cardioWeeks: WeekData[];
  weightsWeeks: WeekData[];
  calorieWeeks: WeekData[];
  weightsExerciseCounts: Record<number, number[]>;
}> = ({ cardioWeeks, weightsWeeks, calorieWeeks, weightsExerciseCounts }) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('Cardio');
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);

  const chartConfig: Record<ChartTab, { weeks: WeekData[]; unit: string }> = {
    Cardio:   { weeks: cardioWeeks,  unit: 'km' },
    Weights:  { weeks: weightsWeeks, unit: 'kg' },
    Calories: { weeks: calorieWeeks, unit: '' },
  };

  const { weeks, unit } = chartConfig[activeTab];

  const allWeekNumbers = Array.from(
    new Set([
      ...cardioWeeks.map(w => w.weekNumber),
      ...weightsWeeks.map(w => w.weekNumber),
      ...calorieWeeks.map(w => w.weekNumber),
    ])
  ).sort((a, b) => b - a);

  const effectiveWeekNumber = selectedWeekNumber ?? (allWeekNumbers[0] ?? null);
  const current = weeks.find(w => w.weekNumber === effectiveWeekNumber) ?? null;
  const data = current?.days || Array(7).fill(0);
  const rawMax = Math.max(...data, 1);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekLabel = effectiveWeekNumber !== null ? `${effectiveWeekNumber}` : '\u2014';

  const currentGlobalIdx = effectiveWeekNumber !== null ? allWeekNumbers.indexOf(effectiveWeekNumber) : 0;
  const canPrev = currentGlobalIdx < allWeekNumbers.length - 1;
  const canNext = currentGlobalIdx > 0;
  const onPrev = () => { if (canPrev) setSelectedWeekNumber(allWeekNumbers[currentGlobalIdx + 1]); };
  const onNext = () => { if (canNext) setSelectedWeekNumber(allWeekNumbers[currentGlobalIdx - 1]); };

  const yMin = activeTab === 'Cardio' ? 5 : activeTab === 'Calories' ? 500 : 0;
  const yMax = activeTab === 'Cardio' ? 20 : rawMax;

  const summaryParts = (() => {
    const nonZero = data.filter(v => v > 0);
    const total = data.reduce((s, v) => s + v, 0);
    if (activeTab === 'Cardio') {
      return { value: total > 0 ? total.toFixed(1) : '0.0', unit: 'KM' };
    } else if (activeTab === 'Weights') {
      const k = total / 1000;
      return { value: total > 0 ? (k >= 10 ? `${Math.round(k)}K` : `${k.toFixed(1)}K`) : '0K', unit: '' };
    } else {
      if (nonZero.length === 0) return { value: '\u2014', unit: 'Kcal' };
      const avg = Math.round(total / nonZero.length);
      return { value: avg.toLocaleString(), unit: 'Kcal' };
    }
  })();

  return (
    <div>
      <div style={{
        fontSize: '1.1rem',
        fontWeight: 800,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#ffffff',
        marginBottom: '0.85rem',
      }}>
        Weekly
      </div>

      <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-4">
            {(['Cardio', 'Weights', 'Calories'] as ChartTab[]).map(tab => (
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
          <div className="flex items-center gap-3">
            <button onClick={onPrev} disabled={!canPrev} className="transition-opacity" style={{ opacity: !canPrev ? 0.2 : 0.6 }}>
              <ChevronLeft size={16} color="white" />
            </button>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.5)', minWidth: '24px', textAlign: 'center' }}>{weekLabel}</span>
            <button onClick={onNext} disabled={!canNext} className="transition-opacity" style={{ opacity: !canNext ? 0.2 : 0.6 }}>
              <ChevronRight size={16} color="white" />
            </button>
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
                        border: '1px solid rgba(0,0,0,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'rgba(0,0,0,0.75)',
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  const [todayActivities, setTodayActivities] = useState<DayActivity[]>([]);
  const [totalMovement, setTotalMovement] = useState<number>(0);
  const [yesterdayMovement, setYesterdayMovement] = useState<number>(0);

  const [dayWeights, setDayWeights] = useState<DayWeight[]>([]);
  const [dayWeightsTotal, setDayWeightsTotal] = useState<number>(0);

  const [cardioWeeks, setCardioWeeks] = useState<WeekData[]>([]);
  const [weightsWeeks, setWeightsWeeks] = useState<WeekData[]>([]);
  const [weightsExerciseCounts, setWeightsExerciseCounts] = useState<Record<number, number[]>>({});
  const [calorieWeeks, setCalorieWeeks] = useState<WeekData[]>([]);

  const [activityWeeklyData, setActivityWeeklyData] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const loadCardio = async () => {
      const activeDateStr = selectedDate.toISOString().split('T')[0];
      const yesterday = new Date(selectedDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDateStr = yesterday.toISOString().split('T')[0];

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
        const d = new Date(row.date + 'T12:00:00');
        const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
        result[name][dow] = +(result[name][dow] + Number(row.km || 0)).toFixed(2);
      }
      setActivityWeeklyData(result);
    };
    loadActivityWeekly();
  }, []);

  useEffect(() => {
    const loadWeights = async () => {
      const activeDateStr = selectedDate.toISOString().split('T')[0];
      const { data } = await supabase
        .from('workouts')
        .select('total_weight, exercises:exercise_id(exercise_name)')
        .in('type', ['CHEST', 'BACK', 'LEGS'])
        .eq('date', activeDateStr);

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
        .select('week, day, total_cardio, exercise_id')
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
        .select('week, day, total_weight, exercise_id')
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
        .select('week, day, calories')
        .eq('type', 'MEASUREMENT')
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
    };
    loadWeeklyCharts();
  }, []);

  const visibleCardioKeys = [
    ...CARDIO_ALWAYS,
    ...CARDIO_CONDITIONAL.filter(key =>
      todayActivities.some(a => a.exercise_name === key && a.km > 0)
    ),
  ];

  // When a pill is selected, show that activity's weekly km total instead of today's movement
  const weeklyActivityTotal = selectedActivity && activityWeeklyData[selectedActivity]
    ? +activityWeeklyData[selectedActivity].reduce((s, v) => s + v, 0).toFixed(1)
    : null;
  const displayMovement = weeklyActivityTotal !== null ? weeklyActivityTotal : totalMovement;

  return (
    <div className="-mt-2">
      {/* WEEKLY SUMMARY BAR — toggled by tapping KINÉ in header */}
      {showWeeklySummary && (
        <div className="mb-6">
          <WeeklySummaryBar />
        </div>
      )}

      {/* DATE SELECTOR */}
      <div className="flex justify-between items-center py-1 mb-1">
        {Array.from({ length: 7 }, (_, i) => {
          const now = new Date();
          const d = new Date();
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1) + i;
          const date = new Date(d.setDate(diff));
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === now.toDateString();
          return (
            <div key={i} onClick={() => setSelectedDate(date)} className="flex flex-col items-center cursor-pointer">
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '1.5px',
                marginBottom: '8px',
                color: showWeeklySummary ? 'rgba(255,255,255,0.3)' : '#ffffff',
              }}>
                {date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </span>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isSelected ? 'bg-white text-black' : isToday ? 'border-2 border-white/40 text-white' : 'text-white/40'}`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <section className="pt-1 mb-4">
        {/* Movement */}
        <div className="flex items-start">
          <div className="text-[4rem] font-black leading-none tracking-tighter text-white flex-shrink-0">
            {displayMovement > 0 ? displayMovement.toFixed(1) : '0.0'}
          </div>
          <div className="flex flex-col justify-center ml-4 pt-3 flex-1 min-w-0">
            <div style={{
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '2.5px',
              color: '#ffffff',
            }}>
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

        {/* Cardio type pills — horizontal scroll on mobile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '12px',
            gap: '14px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '4px',
          }}
        >
          {visibleCardioKeys.map(key => {
            const display = CARDIO_DISPLAY[key];
            if (!display) return null;
            const matching = todayActivities.filter(a => a.exercise_name === key);
            const totalKm = +matching.reduce((s, a) => s + a.km, 0).toFixed(1);
            const hasData = totalKm > 0;
            const isSelected = selectedActivity === key;
            return (
              <div
                key={key}
                className="flex items-center gap-1.5 cursor-pointer transition-opacity flex-shrink-0"
                style={{ opacity: selectedActivity && !isSelected ? 0.3 : 1 }}
                onClick={() => setSelectedActivity(isSelected ? null : key)}
              >
                <div style={{ color: 'rgba(255,255,255,0.85)' }}>{display.icon}</div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                }}>
                  {display.label}{hasData ? ` ${totalKm}km` : ''}
                </div>
              </div>
            );
          })}
        </div>

        {selectedActivity && activityWeeklyData[selectedActivity] && (() => {
          const sparkData = activityWeeklyData[selectedActivity];
          const sparkDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
          const BASE_KM = 1;
          const VW = 280;
          const VH = 110;
          const padTop = 20;
          const padBottom = 6;
          const padLeft = 10;
          const padRight = 10;
          const chartW = VW - padLeft - padRight;
          const chartH = VH - padTop - padBottom;

          const maxVal = Math.max(...sparkData.filter(v => v > 0), BASE_KM, 0.1);
          const getY = (val: number) => padTop + (1 - val / maxVal) * chartH;

          const lineVals: (number | null)[] = sparkData.map((val, i) => {
            if (val > 0) return val;
            if (i === 0 || i === 6) return BASE_KM;
            return null;
          });

          const linePts = lineVals
            .map((val, i) =>
              val !== null
                ? { x: padLeft + (i / 6) * chartW, y: getY(val), val, i, isAnchor: sparkData[i] === 0 }
                : null
            )
            .filter((p): p is { x: number; y: number; val: number; i: number; isAnchor: boolean } => p !== null);

          let pathD = '';
          if (linePts.length === 1) {
            pathD = `M ${linePts[0].x} ${linePts[0].y}`;
          } else if (linePts.length > 1) {
            pathD = `M ${linePts[0].x} ${linePts[0].y}`;
            for (let k = 1; k < linePts.length; k++) {
              const prev = linePts[k - 1];
              const curr = linePts[k];
              const cpx = (prev.x + curr.x) / 2;
              pathD += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
            }
          }

          return (
            <div className="mt-6">
              <svg width="100%" viewBox={`0 0 ${VW} ${VH + 14}`} style={{ overflow: 'visible', display: 'block' }}>
                <defs>
                  <filter id="lineBlur1" x="-50%" y="-100%" width="200%" height="300%">
                    <feGaussianBlur stdDeviation="6" />
                  </filter>
                  <filter id="lineBlur2" x="-50%" y="-100%" width="200%" height="300%">
                    <feGaussianBlur stdDeviation="3" />
                  </filter>
                  <filter id="dotBlur" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="2.5" />
                  </filter>
                </defs>

                {linePts.length > 0 && pathD && (
                  <>
                    <path d={pathD} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="14" strokeLinecap="round" filter="url(#lineBlur1)" />
                    <path d={pathD} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="6" strokeLinecap="round" filter="url(#lineBlur2)" />
                    <path d={pathD} fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}

                {linePts.filter(p => !p.isAnchor).map((p, k) => (
                  <g key={k}>
                    <circle cx={p.x} cy={p.y} r="5" fill="rgba(255,255,255,0.18)" filter="url(#dotBlur)" />
                    <circle cx={p.x} cy={p.y} r="3" fill="white" />
                    <text x={p.x} y={p.y - 9} textAnchor="middle" fill="rgba(255,255,255,0.70)" fontSize="6.5" fontWeight="700">
                      {p.val}
                    </text>
                  </g>
                ))}

                {sparkData.map((_, k) => (
                  <text key={k} x={padLeft + (k / 6) * chartW} y={VH + 12} textAnchor="middle" fill="white" fontSize="7" fontWeight="700">
                    {sparkDays[k]}
                  </text>
                ))}
              </svg>
            </div>
          );
        })()}
      </section>

      <section className="mb-4">
        <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell size={16} color="white" />
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'rgba(255,255,255,0.4)',
              }}>Weights</span>
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
            <div className="text-[13px] text-white/30 font-medium py-4">No weights logged</div>
          )}
        </div>
      </section>

      <section className="mb-4 mt-8">
        <WeeklyChart cardioWeeks={cardioWeeks} weightsWeeks={weightsWeeks} calorieWeeks={calorieWeeks} weightsExerciseCounts={weightsExerciseCounts} />
      </section>

      <section className="mt-8">
        <DailyActivityCards />
      </section>
    </div>
  );
};
