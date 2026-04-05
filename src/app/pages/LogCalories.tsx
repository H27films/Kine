import React, { useState, useEffect } from 'react';
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

type FoodRating = 'bad' | 'ok' | 'good' | null;

// MEASUREMENT exercise IDs (from the exercises table)
const CALORIES_EXERCISE_ID = 90;

// Dotted percentage ring — matches the dark minimal design
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

// Get Monday of week at offset (0 = current, -1 = last week, etc.)
const getMondayAtOffset = (offset: number): Date => {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

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
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);

  // Weekly calories chart data (7 days Mon-Sun current week)
  const [weeklyBars, setWeeklyBars] = useState<number[]>(Array(7).fill(0));
  // Monthly (last 28 days)
  const [monthlyBars, setMonthlyBars] = useState<number[]>(Array(28).fill(0));
  // Weekly food ratings Mon-Sun (null = no data)
  const [weeklyRatings, setWeeklyRatings] = useState<(FoodRating | null)[]>(Array(7).fill(null));

  // Load calories/measurements (always current week)
  useEffect(() => {
    const loadData = async () => {
      const cutoff = weeksAgoMonday(3);
      const { data } = await supabase
        .from('workouts')
        .select('date, calories, food_rating, bodyweight, body_fat_percent, muscle_mass')
        .eq('type', 'MEASUREMENT')
        .gte('date', cutoff)
        .order('date', { ascending: false });

      if (!data) return;

      const latest = (data as any[]).find(r => r.bodyweight);
      if (latest) {
        if (latest.bodyweight) setBodyWeight(String(latest.bodyweight));
        if (latest.body_fat_percent) setBodyFat(String(latest.body_fat_percent));
        if (latest.muscle_mass) setMuscleMass(String(latest.muscle_mass));
      }

      const monday = getMondayAtOffset(0);
      const weekly = Array(7).fill(0);
      for (const row of data as any[]) {
        if (!row.calories) continue;
        const d = new Date(row.date + 'T12:00:00');
        const diffMs = d.getTime() - monday.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
          weekly[dayIdx] += Number(row.calories);
        }
      }
      setWeeklyBars(weekly);

      const monthly = Array(28).fill(0);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      for (const row of data as any[]) {
        if (!row.calories) continue;
        const d = new Date(row.date + 'T12:00:00');
        const diffMs = todayStart.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 28) {
          monthly[27 - diffDays] += Number(row.calories);
        }
      }
      setMonthlyBars(monthly);
    };
    loadData();
  }, []);

  // Load food ratings for the selected week (re-runs when weekOffset changes)
  useEffect(() => {
    const loadRatings = async () => {
      const monday = getMondayAtOffset(weekOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const { data } = await supabase
        .from('workouts')
        .select('date, food_rating, week')
        .eq('type', 'MEASUREMENT')
        .gte('date', fmt(monday))
        .lte('date', fmt(sunday))
        .order('date', { ascending: true });

      const ratings: (FoodRating | null)[] = Array(7).fill(null);
      let wkNum: number | null = null;
      if (data) {
        for (const row of data as any[]) {
          // Grab week number from first row that has it
          if (wkNum === null && row.week) wkNum = Number(row.week);
          if (!row.food_rating) continue;
          const d = new Date(row.date + 'T12:00:00');
          const diffMs = d.getTime() - monday.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
            if (!ratings[dayIdx]) ratings[dayIdx] = (row.food_rating as string).toLowerCase() as FoodRating;
          }
        }
      }
      setWeeklyRatings(ratings);
      setWeekNumber(wkNum);
    };
    loadRatings();
  }, [weekOffset]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const today = todayStr();
      const week = getISOWeek();
      const day = getDayName();

      if (calories) {
        await supabase.from('workouts').insert({
          date: today,
          week,
          day,
          type: 'MEASUREMENT',
          exercise_id: CALORIES_EXERCISE_ID,
          calories: parseInt(calories) || null,
          food_rating: foodRating,
          bodyweight: bodyWeight ? parseFloat(bodyWeight) : null,
          body_fat_percent: bodyFat ? parseFloat(bodyFat) : null,
          muscle_mass: muscleMass ? parseFloat(muscleMass) : null,
          // total_score_k is null for measurement rows
          total_score_k: null,
          new_entry: 'New',
          source: 'app',
        });

        // Recalculate daily total_score and tracker_daily for all rows today
        await recalculateDailyTotals(today);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const ratingButtons: { label: string; value: 'bad' | 'ok' | 'good' }[] = [
    { label: 'Bad', value: 'bad' },
    { label: 'Ok', value: 'ok' },
    { label: 'Good', value: 'good' },
  ];

  const weeklyMax = Math.max(...weeklyBars, 1);
  const monthlyMax = Math.max(...monthlyBars, 1);

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
        {/* Calories input row + sparkline — or expanded chart */}
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

        {/* Food Rating group: score + circles + buttons together */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* FOOD RATING label + score number + percentage circle */}
          {(() => {
            const foodScore = weeklyRatings.reduce((sum, r) => sum + (r === 'good' ? 3 : r === 'ok' ? 2 : r === 'bad' ? 1 : 0), 0);
            const daysWithRating = weeklyRatings.filter(r => r !== null).length;
            const maxScore = daysWithRating > 0 ? daysWithRating * 3 : 21;
            const pct = daysWithRating > 0 ? foodScore / maxScore : 0;
            return (
              <div>
                {/* FOOD RATING header: label + chevrons on left, week number on right */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="text-[13px] uppercase tracking-[0.2em] font-black" style={{ color: '#ffffff' }}>Food Rating</span>
                    <button onClick={() => setWeekOffset(o => o - 1)} style={{ background: 'none', border: 'none', padding: '4px 4px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 22, lineHeight: 1 }}>‹</button>
                    <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} style={{ background: 'none', border: 'none', padding: '4px 4px', cursor: 'pointer', color: weekOffset < 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)', fontSize: 22, lineHeight: 1 }}>›</button>
                  </div>
                  {weekOffset < 0 && weekNumber !== null && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      WEEK {weekNumber}
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
          {/* Weekly food rating circles — with connecting lines between days that have data */}
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
              if (rating === 'good') { border = '2px solid #90c9a0'; textColor = '#90c9a0'; glowShadow = '0 0 8px rgba(144,201,160,0.75), 0 0 18px rgba(144,201,160,0.3)'; }
              else if (rating === 'bad') { border = '2px solid #ef4444'; textColor = '#ef4444'; glowShadow = '0 0 8px rgba(239,68,68,0.75), 0 0 18px rgba(239,68,68,0.3)'; }
              else if (rating === 'ok') { border = '2px solid rgba(255,255,255,0.75)'; textColor = 'rgba(255,255,255,0.9)'; glowShadow = '0 0 8px rgba(255,255,255,0.45), 0 0 18px rgba(255,255,255,0.15)'; }
              const showLine = i > 0 && rating !== null && prevRating !== null;
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <div style={{
                      flex: 1,
                      height: 1.5,
                      backgroundColor: showLine ? 'rgba(255,255,255,0.75)' : 'transparent',
                    }} />
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
          {/* Food Rating buttons */}
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
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8" style={{ color: 'rgba(161,161,170,1)' }}>Performance Trends</h3>
        <div className="space-y-10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest mb-4 block" style={{ color: 'rgba(161,161,170,0.8)' }}>Calories: This Week</span>
            <div className="flex items-end justify-between h-32 gap-2">
              {weeklyBars.map((h, i) => {
                const pct = weeklyMax > 0 ? (h / weeklyMax) * 100 : 0;
                const isToday = i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                return (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(pct, h > 0 ? 4 : 0)}%`, backgroundColor: isToday ? '#ffffff' : h > 0 ? '#3f3f46' : '#18181b' }} />
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[8px] font-bold uppercase tracking-tighter" style={{ color: 'rgba(82,82,91,1)' }}>
              {weekDays.map(d => <span key={d}>{d}</span>)}
            </div>
          </div>
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

      <section className="mb-8">
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
    </div>
  );
};
