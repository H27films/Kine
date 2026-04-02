import React, { useState, useEffect } from 'react';
import { Dumbbell, ChevronLeft, ChevronRight, Bike, Footprints, Waves } from 'lucide-react';
import { DailyActivityCards } from '../components/DailyActivityCards';
import { supabase, dateOffsetStr, mapToWeeklyChart, weeksAgoMonday } from '../../lib/supabase';

const TOTAL_WEEKS = 7;
type ChartTab = 'Cardio' | 'Weights' | 'Calories';

// Only these 3 exercise IDs count toward Total Cardio (TrackerDaily)
const TOTAL_CARDIO_IDS = [82, 83, 87]; // TRACKER, ROW, CYCLE

// Map exercise names to short display labels + icons
const CARDIO_DISPLAY: Record<string, { label: string; icon: React.ReactNode }> = {
  RUNNING:       { label: 'Run',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="17" cy="4" r="2"/><path d="M15.6 7.6L13 10l-3-3-4 4"/><path d="M3 17l3-3 3 3 4-4 2 2 3.5-3.5"/><path d="M10 10l-2 8h3l1 4"/></svg> },
  ROW:           { label: 'Row',    icon: <Waves size={18} /> },
  CYCLE:         { label: 'Cycle',  icon: <Bike size={18} /> },
  WALKING:       { label: 'Walk',   icon: <Footprints size={18} /> },
  'CROSS TRAINER':{ label: 'X-Train', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg> },
  TRACKER:       { label: 'Tracker', icon: <Footprints size={18} /> },
};

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

const getDayLabel = (offset: number): string => {
  if (offset === 0) return 'Today';
  if (offset === -1) return 'Yesterday';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const WeeklyChart: React.FC<{
  cardioWeeks: number[][];
  weightsWeeks: number[][];
  calorieWeeks: number[][];
}> = ({ cardioWeeks, weightsWeeks, calorieWeeks }) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('Cardio');
  const [weekIndices, setWeekIndices] = useState<Record<ChartTab, number>>({
    Cardio: 0, Weights: 0, Calories: 0,
  });

  const chartConfig: Record<ChartTab, { weeks: number[][]; unit: string }> = {
    Cardio:   { weeks: cardioWeeks,  unit: 'km' },
    Weights:  { weeks: weightsWeeks, unit: 'kg' },
    Calories: { weeks: calorieWeeks, unit: '' },
  };

  const weekIndex = weekIndices[activeTab];
  const { weeks, unit } = chartConfig[activeTab];
  const data = weeks[weekIndex] || Array(7).fill(0);
  const maxVal = Math.max(...data, 1);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekLabel = `${TOTAL_WEEKS - weekIndex}`;

  const onPrev = () => setWeekIndices(prev => ({ ...prev, [activeTab]: Math.min(prev[activeTab] + 1, TOTAL_WEEKS - 1) }));
  const onNext = () => setWeekIndices(prev => ({ ...prev, [activeTab]: Math.max(prev[activeTab] - 1, 0) }));

  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>WEEKLY</div>
        <div className="flex items-center gap-3">
          <button onClick={onPrev} disabled={weekIndex >= TOTAL_WEEKS - 1} className="transition-opacity" style={{ opacity: weekIndex >= TOTAL_WEEKS - 1 ? 0.2 : 0.6 }}><ChevronLeft size={16} color="white" /></button>
          <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/50 min-w-[50px] text-center">{weekLabel}</span>
          <button onClick={onNext} disabled={weekIndex <= 0} className="transition-opacity" style={{ opacity: weekIndex <= 0 ? 0.2 : 0.6 }}><ChevronRight size={16} color="white" /></button>
        </div>
      </div>
      <div className="flex gap-4 mb-5">
        {(['Cardio', 'Weights', 'Calories'] as ChartTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="text-[11px] font-bold uppercase tracking-[1px] pb-1 transition-all"
            style={{ color: activeTab === tab ? '#ffffff' : 'rgba(255,255,255,0.3)', borderBottom: activeTab === tab ? '2px solid #ffffff' : '2px solid transparent' }}>
            {tab}
          </button>
        ))}
      </div>
      <div className="flex items-end justify-between h-32" style={{ gap: '12px' }}>
        {data.map((val, i) => {
          const pct = maxVal > 0 ? val / maxVal : 0;
          const brightness = Math.round(80 + pct * 175);
          const barColor = val > 0 ? `rgb(${brightness},${brightness},${brightness})` : 'rgba(255,255,255,0.05)';
          const displayVal = unit === 'kg' ? Math.round(val) : unit === 'km' ? +val.toFixed(1) : Math.round(val);
          return (
            <div key={i} className="flex flex-col items-center h-full justify-end" style={{ flex: '1', maxWidth: '28px' }}>
              <div className="text-[8px] font-bold text-white/60 mb-1">{val > 0 ? (unit ? `${displayVal}${unit}` : `${displayVal}`) : ''}</div>
              <div className="w-full min-h-[4px] transition-all" style={{ height: `${Math.max(pct * 100, 4)}%`, backgroundColor: barColor, borderRadius: '4px' }} />
              <div className="text-[9px] font-bold uppercase mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{days[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // Today's cardio
  const [todayActivities, setTodayActivities] = useState<DayActivity[]>([]);
  const [totalMovement, setTotalMovement] = useState<number>(0);
  const [yesterdayMovement, setYesterdayMovement] = useState<number>(0);

  // Weights for selected day
  const [dayWeights, setDayWeights] = useState<DayWeight[]>([]);
  const [dayWeightsTotal, setDayWeightsTotal] = useState<number>(0);

  // Weekly chart data
  const [cardioWeeks, setCardioWeeks] = useState<number[][]>(Array.from({ length: 7 }, () => Array(7).fill(0)));
  const [weightsWeeks, setWeightsWeeks] = useState<number[][]>(Array.from({ length: 7 }, () => Array(7).fill(0)));
  const [calorieWeeks, setCalorieWeeks] = useState<number[][]>(Array.from({ length: 7 }, () => Array(7).fill(0)));

  // Per-activity sparkline data (last 7 days Mon-Sun of current week)
  const [activityWeeklyData, setActivityWeeklyData] = useState<Record<string, number[]>>({});

  // Load today's cardio + yesterday's
  // Total movement = ONLY Tracker + Row + Cycle (exercise IDs 82, 83, 87)
  // Other cardio (Running, Walking etc.) shown in breakdown but NOT added to total
  useEffect(() => {
    const loadCardio = async () => {
      const todayDate = dateOffsetStr(0);
      const yesterdayDate = dateOffsetStr(-1);

      // Fetch ALL cardio for display breakdown
      const { data } = await supabase
        .from('workouts')
        .select('date, km, total_cardio, exercise_id, exercises:exercise_id(exercise_name)')
        .eq('type', 'CARDIO')
        .gte('date', yesterdayDate)
        .lte('date', todayDate);

      if (!data) return;

      const todayRows = data.filter((r: any) => r.date === todayDate);
      const yesterdayRows = data.filter((r: any) => r.date === yesterdayDate);

      const activities: DayActivity[] = todayRows
        .filter((r: any) => r.km && r.km > 0)
        .map((r: any) => ({
          exercise_id: r.exercise_id,
          exercise_name: r.exercises?.exercise_name || 'Unknown',
          km: Number(r.km),
          total_cardio: Number(r.total_cardio || 0),
        }));

      setTodayActivities(activities);

      // Total movement: ONLY Tracker (82) + Row (83) + Cycle (87)
      const totalCardio = activities
        .filter(a => TOTAL_CARDIO_IDS.includes(a.exercise_id))
        .reduce((s, a) => s + a.total_cardio, 0);
      setTotalMovement(+totalCardio.toFixed(1));

      // Yesterday total: same 3 exercises only
      const yestTotal = yesterdayRows
        .filter((r: any) => TOTAL_CARDIO_IDS.includes(r.exercise_id))
        .reduce((s: number, r: any) => s + Number(r.total_cardio || 0), 0);
      setYesterdayMovement(+yestTotal.toFixed(1));
    };
    loadCardio();
  }, []);

  // Load per-activity weekly sparklines
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

  // Load weights for selected day
  useEffect(() => {
    const loadWeights = async () => {
      const dateStr = dateOffsetStr(dayOffset);
      const { data } = await supabase
        .from('workouts')
        .select('total_weight, exercises:exercise_id(exercise_name)')
        .in('type', ['CHEST', 'BACK', 'LEGS'])
        .eq('date', dateStr);

      if (!data) return;
      const exercises = (data as any[]).map(r => ({
        name: r.exercises?.exercise_name || 'Unknown',
        weight: Number(r.total_weight || 0),
      })).filter(e => e.weight > 0);
      setDayWeights(exercises);
      setDayWeightsTotal(exercises.reduce((s, e) => s + e.weight, 0));
    };
    loadWeights();
  }, [dayOffset]);

  // Load weekly chart data (last 7 weeks)
  // Cardio chart: ONLY Tracker (82) + Row (83) + Cycle (87)
  useEffect(() => {
    const loadWeeklyCharts = async () => {
      const cutoff = weeksAgoMonday(6);

      // Cardio chart: filter to TOTAL_CARDIO_IDS only
      const { data: cardioData } = await supabase
        .from('workouts')
        .select('date, total_cardio, exercise_id')
        .eq('type', 'CARDIO')
        .in('exercise_id', TOTAL_CARDIO_IDS)
        .gte('date', cutoff);
      if (cardioData) {
        setCardioWeeks(mapToWeeklyChart(
          (cardioData as any[]).map(r => ({ date: r.date, value: Number(r.total_cardio || 0) }))
        ));
      }

      // Weights
      const { data: weightsData } = await supabase
        .from('workouts')
        .select('date, total_weight')
        .in('type', ['CHEST', 'BACK', 'LEGS'])
        .gte('date', cutoff);
      if (weightsData) {
        setWeightsWeeks(mapToWeeklyChart(
          (weightsData as any[]).map(r => ({ date: r.date, value: Number(r.total_weight || 0) }))
        ));
      }

      // Calories
      const { data: calData } = await supabase
        .from('workouts')
        .select('date, calories')
        .eq('type', 'MEASUREMENT')
        .not('calories', 'is', null)
        .gte('date', cutoff);
      if (calData) {
        setCalorieWeeks(mapToWeeklyChart(
          (calData as any[]).map(r => ({ date: r.date, value: Number(r.calories || 0) }))
        ));
      }
    };
    loadWeeklyCharts();
  }, []);

  // All cardio activities shown in breakdown (TRACKER now shown too)
  const displayActivities = todayActivities.filter(a => a.km > 0);

  return (
    <div className="space-y-8">
      <section className="pt-4">
        <div className="flex items-start">
          <div className="text-[4rem] font-black leading-none tracking-tighter text-white">
            {totalMovement > 0 ? totalMovement.toFixed(1) : '—'}
          </div>
          <div className="flex flex-col justify-center ml-4 pt-3">
            <div className="text-[13px] font-black uppercase tracking-[2px] text-white">MOVEMENT (KM)</div>
            {yesterdayMovement > 0 && (
              <div className="text-[11px] font-medium mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Yesterday {yesterdayMovement.toFixed(1)} km
              </div>
            )}
          </div>
        </div>

        {displayActivities.length > 0 && (
          <div className="flex items-center gap-5 mt-5">
            {displayActivities.map((activity, i) => {
              const display = CARDIO_DISPLAY[activity.exercise_name] || { label: activity.exercise_name, icon: <Footprints size={18} /> };
              return (
                <div key={i}
                  className="flex items-center gap-2 cursor-pointer transition-opacity"
                  style={{ opacity: selectedActivity && selectedActivity !== activity.exercise_name ? 0.4 : 1 }}
                  onClick={() => setSelectedActivity(selectedActivity === activity.exercise_name ? null : activity.exercise_name)}
                >
                  <div className="text-white/60">{display.icon}</div>
                  <div className="text-[12px] font-bold text-white/80">{display.label} {activity.km}km</div>
                </div>
              );
            })}
          </div>
        )}

        {selectedActivity && activityWeeklyData[selectedActivity] && (() => {
          const data = activityWeeklyData[selectedActivity];
          const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
          const maxVal = Math.max(...data, 0.1);
          const chartH = 90;
          const getBottom = (val: number) => maxVal > 0 ? (val / maxVal) * chartH : 0;
          return (
            <div className="mt-8 relative" style={{ height: `${chartH + 30}px` }}>
              <div className="flex items-end justify-between relative" style={{ height: `${chartH}px` }}>
                {data.map((val, i) => {
                  const bottom = getBottom(val);
                  return (
                    <div key={i} className="flex flex-col items-center h-full justify-end relative" style={{ flex: '1' }}>
                      {val > 0 && (
                        <>
                          <div className="absolute left-0 right-0 flex flex-col items-center" style={{ bottom: `${bottom}px` }}>
                            <div className="text-[9px] font-bold text-white/70 mb-1 whitespace-nowrap">{val}</div>
                            <div className="w-[7px] h-[7px] rounded-full bg-white" />
                          </div>
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-0" style={{ height: `${bottom}px`, width: '1px', backgroundColor: 'rgba(255,255,255,0.25)' }} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                {days.map((d, i) => (
                  <div key={i} className="text-[9px] font-bold uppercase text-center" style={{ flex: '1', color: 'rgba(255,255,255,0.3)' }}>{d}</div>
                ))}
              </div>
            </div>
          );
        })()}
      </section>

      <section>
        <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell size={16} color="white" />
              <span className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Weights</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setDayOffset(prev => Math.max(prev - 1, -6))} disabled={dayOffset <= -6} className="transition-opacity" style={{ opacity: dayOffset <= -6 ? 0.2 : 0.6 }}>
                <ChevronLeft size={18} color="white" />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/50 min-w-[80px] text-center">{getDayLabel(dayOffset)}</span>
              <button onClick={() => setDayOffset(prev => Math.min(prev + 1, 0))} disabled={dayOffset >= 0} className="transition-opacity" style={{ opacity: dayOffset >= 0 ? 0.2 : 0.6 }}>
                <ChevronRight size={18} color="white" />
              </button>
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
                    <span className="text-[11px] font-medium text-white/60">{ex.name}</span>
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

      <section>
        <WeeklyChart cardioWeeks={cardioWeeks} weightsWeeks={weightsWeeks} calorieWeeks={calorieWeeks} />
      </section>

      <DailyActivityCards />
    </div>
  );
};
