import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Page } from '../../types';
import { supabase, todayStr, getISOWeek, getDayName, weeksAgoMonday, recalculateDailyTotals } from '../../lib/supabase';
import CaloriesSparkline from '../components/CaloriesSparkline';

interface LogCaloriesProps {
  onNavigate: (page: Page) => void;
}

const tabs: { label: string; page: Page }[] = [
  { label: 'Weights', page: 'weights' },
  { label: 'Cardio', page: 'cardio' },
  { label: 'Calories', page: 'calories' },
];

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type FoodRating = 'BAD' | 'OK' | 'GOOD' | null;

const CALORIES_EXERCISE_ID = 90;
const FOOD_EXERCISE_ID = 89;
const BODY_COMP_EXERCISE_ID = 88;

const FoodScoreCircle: React.FC<{ pct: number; size?: number }> = ({ pct, size = 54 }) => {
  const N = 20;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 5.5;
  const dotR = 2.8;
  const filled = Math.round(pct * N);
  const pctDisplay = Math.round(pct * 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: N }, (_, i) => {
        const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return (
          <circle
            key={i}
            cx={x} cy={y} r={dotR}
            fill={i < filled ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.10)'}
          />
        );
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fill="rgba(255,255,255,0.80)" fontSize="11" fontWeight="700">
        {pctDisplay}%
      </text>
    </svg>
  );
};

const getMondayAtOffset = (offset: number): Date => {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const LogCalories: React.FC<LogCaloriesProps> = ({ onNavigate }) => {
  const [calories, setCalories] = useState('');
  const [chartExpanded, setChartExpanded] = useState(false);
  const [foodRating, setFoodRating] = useState<FoodRating>(null);
  const [bodyWeight, setBodyWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Food rating week navigation
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);

  // Calories chart week navigation (independent)
  const [calWeekOffset, setCalWeekOffset] = useState(0);
  const [calWeekNumber, setCalWeekNumber] = useState<number | null>(null);

  const [weeklyBars, setWeeklyBars] = useState<number[]>(Array(7).fill(0));
  const [monthlyBars, setMonthlyBars] = useState<number[]>(Array(28).fill(0));
  const [weeklyRatings, setWeeklyRatings] = useState<(FoodRating)[]>(Array(7).fill(null));

  // Load body measurements + monthly bars (static, no week offset)
  useEffect(() => {
    const loadData = async () => {
      const cutoff = weeksAgoMonday(3);

      const { data: bodyData } = await supabase
        .from('workouts')
        .select('date, bodyweight, body_fat_percent, muscle_mass')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', BODY_COMP_EXERCISE_ID)
        .gte('date', cutoff)
        .order('date', { ascending: false });

      if (bodyData && bodyData.length > 0) {
        const latest = bodyData[0];
        if (latest.bodyweight) setBodyWeight(String(latest.bodyweight));
        if (latest.body_fat_percent) setBodyFat(String(latest.body_fat_percent));
        if (latest.muscle_mass) setMuscleMass(String(latest.muscle_mass));
      }

      // Monthly bars (last 28 days, always)
      const { data: calData } = await supabase
        .from('workouts')
        .select('date, calories')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', CALORIES_EXERCISE_ID)
        .gte('date', cutoff)
        .order('date', { ascending: false });

      const monthly = Array(28).fill(0);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (calData) {
        for (const row of calData as any[]) {
          if (!row.calories) continue;
          const d = new Date(row.date + 'T12:00:00');
          const diffMs = todayStart.getTime() - d.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 28) {
            monthly[27 - diffDays] += Number(row.calories);
          }
        }
      }
      setMonthlyBars(monthly);
    };
    loadData();
  }, []);

  // Load calories chart for selected week
  useEffect(() => {
    const loadCalChart = async () => {
      const monday = getMondayAtOffset(calWeekOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const { data: calData } = await supabase
        .from('workouts')
        .select('date, calories, week')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', CALORIES_EXERCISE_ID)
        .gte('date', fmtDate(monday))
        .lte('date', fmtDate(sunday))
        .order('date', { ascending: true });

      const weekly = Array(7).fill(0);
      let wkNum: number | null = null;
      if (calData) {
        for (const row of calData as any[]) {
          if (wkNum === null && row.week) wkNum = Number(row.week);
          if (!row.calories) continue;
          const d = new Date(row.date + 'T12:00:00');
          const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
          weekly[dayIdx] += Number(row.calories);
        }
      }
      setWeeklyBars(weekly);
      setCalWeekNumber(wkNum);
    };
    loadCalChart();
  }, [calWeekOffset]);

  // Load food ratings for selected week
  useEffect(() => {
    const loadRatings = async () => {
      const monday = getMondayAtOffset(weekOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const { data } = await supabase
        .from('workouts')
        .select('date, food_rating, week')
        .eq('type', 'MEASUREMENT')
        .not('food_rating', 'is', null)
        .gte('date', fmtDate(monday))
        .lte('date', fmtDate(sunday))
        .order('date', { ascending: true });

      const ratings: (FoodRating)[] = Array(7).fill(null);
      let wkNum: number | null = null;
      if (data) {
        for (const row of data as any[]) {
          if (wkNum === null && row.week) wkNum = Number(row.week);
          if (!row.food_rating) continue;
          const d = new Date(row.date + 'T12:00:00');
          const diffMs = d.getTime() - monday.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
            if (!ratings[dayIdx]) ratings[dayIdx] = (row.food_rating as string).toUpperCase() as FoodRating;
          }
        }
      }
      setWeeklyRatings(ratings);
      setWeekNumber(wkNum);
    };
    loadRatings();
  }, [weekOffset]);

  const upsertMeasurementRow = async (
    exerciseId: number,
    payload: Record<string, unknown>
  ): Promise<number | null> => {
    const today = todayStr();
    const week = getISOWeek();
    const day = getDayName();

    const { data: existing } = await supabase
      .from('workouts')
      .select('id')
      .eq('date', today)
      .eq('type', 'MEASUREMENT')
      .eq('exercise_id', exerciseId)
      .maybeSingle();

    if (existing) {
      await supabase.from('workouts').update(payload).eq('id', existing.id);
      return existing.id;
    } else {
      const { data: inserted } = await supabase.from('workouts').insert({
        date: today,
        week,
        day,
        type: 'MEASUREMENT',
        exercise_id: exerciseId,
        total_score_k: null,
        new_entry: 'New',
        source: 'app',
        ...payload,
      }).select('id').single();
      return inserted?.id ?? null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const today = todayStr();
      let anySaved = false;

      if (calories) {
        await upsertMeasurementRow(CALORIES_EXERCISE_ID, { calories: parseInt(calories) || null });
        anySaved = true;
      }
      if (foodRating) {
        await upsertMeasurementRow(FOOD_EXERCISE_ID, { food_rating: foodRating });
        anySaved = true;
      }
      const hasBodyData = bodyWeight || bodyFat || muscleMass;
      if (hasBodyData) {
        await upsertMeasurementRow(BODY_COMP_EXERCISE_ID, {
          bodyweight: bodyWeight ? parseFloat(bodyWeight) : null,
          body_fat_percent: bodyFat ? parseFloat(bodyFat) : null,
          muscle_mass: muscleMass ? parseFloat(muscleMass) : null,
        });
        anySaved = true;
      }

      if (anySaved) await recalculateDailyTotals(today);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const ratingButtons: { label: string; value: 'BAD' | 'OK' | 'GOOD' }[] = [
    { label: 'Bad', value: 'BAD' },
    { label: 'Ok', value: 'OK' },
    { label: 'Good', value: 'GOOD' },
  ];

  const weeklyMax = Math.max(...weeklyBars, 1);
  const monthlyMax = Math.max(...monthlyBars, 1);

  // Avg kcal for the displayed week (non-zero days only)
  const daysWithCals = weeklyBars.filter(v => v > 0).length;
  const weeklyAvg = daysWithCals > 0 ? Math.round(weeklyBars.reduce((a, b) => a + b, 0) / daysWithCals) : 0;

  // Index of highest bar (for previous weeks highlight)
  const maxBarIndex = weeklyBars.indexOf(Math.max(...weeklyBars));

  return (
    <div>
      <nav className="flex gap-8 mb-12 items-end">
        {tabs.map(tab => {
          const isActive = tab.page === 'calories';
          return (
            <button key={tab.page} onClick={() => onNavigate(tab.page)} className="flex flex-col items-center" style={{ filter: isActive ? 'none' : 'blur(0.4px)' }}>
              <span className="uppercase tracking-widest transition-all"
                style={{ color: isActive ? '#ffffff' : 'rgba(226,226,226,0.65)', fontWeight: isActive ? 900 : 400, fontSize: isActive ? '0.875rem' : '0.65rem', letterSpacing: '0.15em' }}>
                {tab.label}
              </span>
              {isActive && <div className="h-1 w-1 rounded-full mt-1" style={{ backgroundColor: '#ffffff' }} />}
            </button>
          );
        })}
      </nav>

      <section className="mb-16 space-y-12">
        {chartExpanded ? (
          <CaloriesSparkline
            weeklyBars={weeklyBars}
            expanded
            onClick={() => setChartExpanded(false)}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'stretch', width: '100%', gap: 0 }}>
            <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
              <label className="block text-[13px] uppercase tracking-[0.2em] font-black mb-4" style={{ color: '#ffffff' }}>Total Calories</label>
              <input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="0000"
                className="text-7xl font-black tracking-tighter text-white p-0"
                style={{ backgroundColor: 'transparent', border: 'none', width: '4ch', flex: 1 }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] mt-2 block" style={{ color: 'rgba(161,161,170,1)' }}>kcal today</span>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch' }}>
              <CaloriesSparkline weeklyBars={weeklyBars} onClick={() => setChartExpanded(true)} />
            </div>
          </div>
        )}

        {/* Food Rating */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(() => {
            const foodScore = weeklyRatings.reduce((sum, r) => sum + (r === 'GOOD' ? 3 : r === 'OK' ? 2 : r === 'BAD' ? 1 : 0), 0);
            const daysWithRating = weeklyRatings.filter(r => r !== null).length;
            const maxScore = daysWithRating > 0 ? daysWithRating * 3 : 21;
            const pct = daysWithRating > 0 ? foodScore / maxScore : 0;
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="text-[13px] uppercase tracking-[0.2em] font-black" style={{ color: '#ffffff' }}>Food Rating</span>
                    <button onClick={() => setWeekOffset(o => o - 1)} style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', color: weekOffset < 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center' }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  {weekNumber !== null && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em' }}>
                      {weekNumber}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="text-7xl font-black tracking-tighter text-white" style={{ lineHeight: 1 }}>{foodScore}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(161,161,170,1)' }}>/{maxScore}</span>
                  </div>
                  {daysWithRating > 0 && <FoodScoreCircle pct={pct} />}
                </div>
              </div>
            );
          })()}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {['M','T','W','T','F','S','S'].map((day, i) => {
              const rating = weeklyRatings[i];
              const prevRating = i > 0 ? weeklyRatings[i - 1] : null;
              const today = new Date();
              const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;
              const isFuture = weekOffset === 0 && i > todayIdx;
              let border = '1.5px solid rgba(255,255,255,0.15)';
              let textColor = 'rgba(255,255,255,0.2)';
              let glowShadow = 'none';
              if (rating === 'GOOD') { border = '2px solid #90c9a0'; textColor = '#90c9a0'; glowShadow = '0 0 8px rgba(144,201,160,0.75), 0 0 18px rgba(144,201,160,0.3)'; }
              else if (rating === 'BAD') { border = '2px solid #ef4444'; textColor = '#ef4444'; glowShadow = '0 0 8px rgba(239,68,68,0.75), 0 0 18px rgba(239,68,68,0.3)'; }
              else if (rating === 'OK') { border = '2px solid rgba(255,255,255,0.75)'; textColor = 'rgba(255,255,255,0.9)'; glowShadow = '0 0 8px rgba(255,255,255,0.45), 0 0 18px rgba(255,255,255,0.15)'; }
              const showLine = i > 0 && rating !== null && prevRating !== null;
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <div style={{ flex: 1, height: 1.5, backgroundColor: showLine ? 'rgba(255,255,255,0.75)' : 'transparent' }} />
                  )}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    backgroundColor: 'transparent', border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: isFuture && !rating ? 0.3 : 1,
                    flexShrink: 0,
                    boxShadow: rating ? glowShadow : 'none',
                  }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: textColor, letterSpacing: '0.05em' }}>{day}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="flex gap-2">
              {ratingButtons.map(btn => (
                <button key={btn.value} onClick={() => setFoodRating(btn.value)}
                  className="flex-1 py-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                  style={{ backgroundColor: foodRating === btn.value ? '#ffffff' : '#121212', border: foodRating === btn.value ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.05)', color: foodRating === btn.value ? '#000000' : 'rgba(161,161,170,1)' }}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-6" style={{ color: 'rgba(161,161,170,1)' }}>Body Measurements</h3>
        <div className="grid grid-cols-1 gap-4">
          {[
            { label: 'Body Weight (KG)', value: bodyWeight, onChange: setBodyWeight },
            { label: 'Body Fat (%)', value: bodyFat, onChange: setBodyFat },
            { label: 'Muscle Mass (KG)', value: muscleMass, onChange: setMuscleMass },
          ].map(field => (
            <div key={field.label} className="flex justify-between items-center p-5 rounded-lg" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(161,161,170,0.8)' }}>{field.label}</label>
              <input type="number" value={field.value} onChange={e => field.onChange(e.target.value)} step="0.1"
                className="text-right text-lg font-black tracking-tight text-white p-0 w-24"
                style={{ backgroundColor: 'transparent', border: 'none' }} />
            </div>
          ))}
        </div>

        {saveError && <p className="text-red-400 text-sm mt-4 text-center">{saveError}</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full font-black uppercase tracking-widest text-[10px] py-5 rounded-full mt-8 active:scale-[0.98] transition-all"
          style={{ backgroundColor: saveSuccess ? '#22c55e' : '#ffffff', color: '#000000', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Update Metrics'}
        </button>
      </section>

      <section className="mb-8">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8" style={{ color: 'rgba(161,161,170,1)' }}>Performance Trends</h3>
        <div className="space-y-10">

          {/* === CALORIES CHART with week toggle === */}
          <div>
            {/* Header row: CALORIES: avg kcal + chevrons | week number only */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(161,161,170,0.8)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Calories:
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.1em' }}>
                  {weeklyAvg > 0 ? `${weeklyAvg.toLocaleString()} KCAL` : '— KCAL'}
                </span>
                <button
                  onClick={() => setCalWeekOffset(o => o - 1)}
                  style={{ background: 'none', border: 'none', padding: '2px 1px', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCalWeekOffset(o => Math.min(o + 1, 0))}
                  style={{ background: 'none', border: 'none', padding: '2px 1px', cursor: 'pointer', color: calWeekOffset < 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              {calWeekNumber !== null && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
                  {calWeekNumber}
                </span>
              )}
            </div>

            {/* Bars with calorie values inside at base */}
            <div className="flex items-end justify-between gap-1" style={{ height: '112px' }}>
              {weeklyBars.map((h, i) => {
                const pct = weeklyMax > 0 ? (h / weeklyMax) * 100 : 0;
                const barPct = Math.max(pct, h > 0 ? 4 : 0);
                const isCurrentWeek = calWeekOffset === 0;
                const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
                const isToday = isCurrentWeek && i === todayIdx;
                // For previous weeks: highlight the highest bar in bright white with glow
                const isPeakBar = !isCurrentWeek && h > 0 && i === maxBarIndex;
                const label = h >= 1000 ? `${(h / 1000).toFixed(1)}k` : h > 0 ? String(h) : '';

                let bgColor = h > 0 ? '#3f3f46' : '#18181b';
                if (isToday) bgColor = '#ffffff';
                if (isPeakBar) bgColor = '#ffffff';

                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${barPct}%`,
                      backgroundColor: bgColor,
                      boxShadow: isPeakBar ? '0 0 8px rgba(255,255,255,0.6), 0 0 20px rgba(255,255,255,0.25)' : 'none',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingBottom: '3px',
                    }}
                  >
                    {h > 0 && (
                      <span style={{
                        fontSize: '8px',
                        fontWeight: 700,
                        color: (isToday || isPeakBar) ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.55)',
                        letterSpacing: '0.01em',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}>
                        {label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Day labels */}
            <div className="flex justify-between mt-2" style={{ gap: 4 }}>
              {weekDays.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <span style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(82,82,91,1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Last 28 days */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest mb-4 block" style={{ color: 'rgba(161,161,170,0.8)' }}>Calories: Last 28 Days</span>
            <div className="flex items-end justify-between h-16 gap-1">
              {monthlyBars.map((h, i) => {
                const pct = monthlyMax > 0 ? (h / monthlyMax) * 100 : 0;
                return (
                  <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(pct, h > 0 ? 4 : 0)}%`, backgroundColor: i === monthlyBars.length - 1 ? '#ffffff' : h >= monthlyMax * 0.7 ? '#3f3f46' : 'rgba(24,24,27,0.5)' }} />
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
