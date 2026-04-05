import React, { useState, useEffect } from 'react';
import { Dumbbell, ChevronLeft, ChevronRight, Bike, Footprints, Waves } from 'lucide-react';
import { DailyActivityCards } from '../components/DailyActivityCards';
import { WeeklySummaryBar } from '../components/WeeklySummaryBar';
import { supabase, weeksAgoMonday } from '../../lib/supabase';

type ChartTab = 'Cardio' | 'Weights' | 'Calories';

const TOTAL_CARDIO_IDS = [82, 83, 87];
const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const toTitleCase = (str: string) =>
  str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const CARDIO_DISPLAY: Record<string, { label: string; icon: React.ReactNode }> = {
  RUNNING: {
    label: 'Run',
    icon: (
      <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
        <path d="M393.1 144.1c11.3 7.8 26.8 5.1 34.6-6.2 7.8-11.3 5.1-26.8-6.2-34.6-21.7-15-46.7-22.1-72-20.5-24.8 1.6-48.4 11.2-66.5 27.2-4 3.5-7.7 7.4-11.1 11.5l-33.8 41.2c-5.9 7.2-15.5 10.4-24.6 8.3L153 158.2c-12.8-2.9-25.5 5.2-28.4 17.9s5.2 25.5 17.9 28.4l60.5 13.9c18.3 4.2 37.5-2.2 49.3-16.6l31.5-38.4c5.1-4.5 11-8 17.3-10.3 22.4-8 47.9-5.1 68.3 9l23.7 12zM154.5 281.3c-1.8-1.4-3.5-2.8-5.2-4.3l-55.7-49c-10.1-8.9-25.3-7.8-34.1 2.3s-7.8 25.3 2.3 34.1l55.7 49c8.2 7.2 16.9 13.6 26.2 19.1l80.5 47.8c11.9 7.1 27.1 3 34.2-8.9s3-27.1-8.9-34.2l-80.5-47.8c-4.9-2.9-9.7-6.2-14.5-8.1zM404.1 364.2l-123-146.1c-9.1-10.8-25.2-12.2-36-3.1s-12.2 25.2-3.1 36l123 146.1c5.9 7.1 13.1 13 21.2 17.4l83.6 45.4c11.7 6.3 26.4 1.9 32.7-9.8s1.9-26.4-9.8-32.7l-83.6-45.4c-1.7-.9-3.4-1.6-5-2.8z" />
      </svg>
    ),
  },
  ROW: { label: 'Row', icon: <Waves size={18} /> },
  CYCLE: { label: 'Cycle', icon: <Bike size={18} /> },
  WALKING: { label: 'Walk', icon: <Footprints size={18} /> },
  'CROSS TRAINER': {
    label: 'Cross-Trainer',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="M12 5l7 7-7 7" />
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
}> = ({ cardioWeeks, weightsWeeks, calorieWeeks }) => {
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
                barLabel = `${+val.toFixed(1)}km`;
              } else {
                barLabel = `${Math.round(val)}`;
              }
            }
            return (
              <div key={i} className="flex flex-col items-center h-full justify-end" style={{ flex: '1', maxWidth: '28px' }}>
                <div style={{ fontSize: '7.5px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>{barLabel}</div>
                <div className="w-full min-h-[4px] transition-all" style={{ height: `${pct * 100}%`, backgroundColor: barColor, borderRadius: '9999px 9999px 0 0' }} />
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
      const totalCardio = activities
        .filter(a => TOTAL_CARDIO_IDS.includes(a.exercise_id))
        .reduce((s, a) => s + (hasTrackerToday ? a.total_cardio : a.km), 0);
      setTotalMovement(+totalCardio.toFixed(1));

      const hasTrackerYesterday = yesterdayRows.some((r: any) => (r.exercises?.exercise_name || '').toUpperCase() === 'TRACKER');
      const yestTotal = yesterdayRows
        .filter((r: any) => TOTAL_CARDIO_IDS.includes(r.exercise_id))
        .reduce((s: number, r: any) => s + Number(hasTrackerYesterday ? (r.total_cardio || 0) : (r.km || 0)), 0);
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
        .select('week, day, total_weight')
        .in('type', ['CHEST', 'BACK', 'LEGS'])
        .not('week', 'is', null)
        .not('day', 'is', null)
        .order('week', { ascending: false })
        .limit(1000);

      if (weightsData) {
        setWeightsWeeks(groupByWeek(
          (weightsData as any[]).map(r => ({ week: Number(r.week), day: r.day, value: Number(r.total_weight || 0) }))
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
            const activity = todayActivities.find(a => a.exercise_name === key);
            const hasData = !!(activity && activity.km > 0);
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
                  {display.label}{hasData ? ` ${activity!.km}km` : ''}
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
        <WeeklyChart cardioWeeks={cardioWeeks} weightsWeeks={weightsWeeks} calorieWeeks={calorieWeeks} />
      </section>

      <section className="mt-8">
        <DailyActivityCards />
      </section>
    </div>
  );
};
