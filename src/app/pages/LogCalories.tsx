import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Page } from '../../types';
import { supabase, todayStr, getISOWeek, getDayName, recalculateDailyTotals } from '../../lib/supabase';
import CaloriesSparkline from '../components/CaloriesSparkline';
import CaloriesTrends from '../components/CaloriesTrends';
import CaloriesEditSheet from '../components/CaloriesEditSheet';

interface LogCaloriesProps {
  onNavigate: (page: Page) => void;
  showWeeklySummary?: boolean;
}

const tabs: { label: string; page: Page }[] = [
  { label: 'Weights', page: 'weights' },
  { label: 'Cardio', page: 'cardio' },
  { label: 'Calories', page: 'calories' },
];

type FoodRating = 'BAD' | 'OK' | 'GOOD' | null;

const CALORIES_EXERCISE_ID = 90;
const FOOD_EXERCISE_ID = 89;
const BODY_COMP_EXERCISE_ID = 88;



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

export const LogCalories: React.FC<LogCaloriesProps> = ({ onNavigate, showWeeklySummary = false }) => {
  const [calories, setCalories] = useState('');
  const [chartExpanded, setChartExpanded] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [foodRating, setFoodRating] = useState<FoodRating>(null);

  const [bodyWeight, setBodyWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [lastBodyWeight, setLastBodyWeight] = useState<string | null>(null);
  const [lastBodyFat, setLastBodyFat] = useState<string | null>(null);
  const [lastMuscleMass, setLastMuscleMass] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [weekOffset, setWeekOffset] = useState(0);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [weeklyBars, setWeeklyBars] = useState<number[]>(Array(7).fill(0));
  const [weeklyRatings, setWeeklyRatings] = useState<(FoodRating)[]>(Array(7).fill(null));

  // Load body measurements
  useEffect(() => {
    const loadData = async () => {
      const { data: bodyData } = await supabase
        .from('workouts')
        .select('date, bodyweight, body_fat_percent, muscle_mass')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', BODY_COMP_EXERCISE_ID)
        .order('date', { ascending: false })
        .limit(1);

      if (bodyData && bodyData.length > 0) {
        const latest = bodyData[0];
        if (latest.bodyweight) setLastBodyWeight(String(latest.bodyweight));
        if (latest.body_fat_percent) setLastBodyFat(String(latest.body_fat_percent));
        if (latest.muscle_mass) setLastMuscleMass(String(latest.muscle_mass));
      }

      // Also load this week's calories for the sparkline
      const monday = getMondayAtOffset(0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const { data: calData } = await supabase
        .from('workouts')
        .select('date, calories')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', CALORIES_EXERCISE_ID)
        .gte('date', fmtDate(monday))
        .lte('date', fmtDate(sunday))
        .order('date', { ascending: true });

      const weekly = Array(7).fill(0);
      const todayDateStr = fmtDate(new Date());
      if (calData) {
        for (const row of calData as any[]) {
          if (!row.calories) continue;
          const d = new Date(row.date + 'T12:00:00');
          const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
          weekly[dayIdx] += Number(row.calories);
          if (row.date === todayDateStr) {
            setCalories(String(row.calories));
          }
        }
      }
      setWeeklyBars(weekly);
    };
    loadData();
  }, []);

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
      if (weekOffset === 0) {
        const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
        if (ratings[todayIdx]) setFoodRating(ratings[todayIdx]);
      }
    };
    loadRatings();
  }, [weekOffset]);

  const ratingButtons: { label: string; value: 'BAD' | 'OK' | 'GOOD' }[] = [
    { label: 'Bad', value: 'BAD' },
    { label: 'Ok', value: 'OK' },
    { label: 'Good', value: 'GOOD' },
  ];


  const upsertMeasurementRow = async (
    exerciseId: number,
    payload: Record<string, unknown>
  ): Promise<number | null> => {
    const today = todayStr();
    const todayDate = new Date(today + 'T12:00:00+08:00');
    const week = getISOWeek(todayDate);
    const day = getDayName(todayDate);

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



  return (
    <div>

      <section className="mb-16 space-y-12">
        {chartExpanded ? (
          <CaloriesSparkline
            weeklyBars={weeklyBars}
            expanded
            onClick={() => setChartExpanded(false)}
            onEditClick={() => setShowEditSheet(true)}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'stretch', width: '100%', gap: 0 }}>
            <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
              <label className="block text-[13px] uppercase tracking-[0.2em] font-black mb-4" style={{ color: '#ffffff' }}>Total Calories</label>
              <input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="0000"
                className="text-7xl font-black tracking-tighter text-white p-0 placeholder:text-[#94A3B8]"
                style={{ backgroundColor: 'transparent', border: 'none', width: '4ch', flex: 1 }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] mt-2 block" style={{ color: 'rgba(161,161,170,1)' }}>kcal today</span>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch' }}>
              <CaloriesSparkline weeklyBars={weeklyBars} onClick={() => setChartExpanded(true)} />
            </div>
          </div>
        )}
      </section>

      <section className="mb-16 space-y-12">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(() => {
            const foodScore = weeklyRatings.reduce((sum, r) => sum + (r === 'GOOD' ? 3 : r === 'OK' ? 2 : r === 'BAD' ? 0 : 0), 0);
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
                  {daysWithRating > 0 && (
                    <svg width={54} height={54} viewBox={`0 0 54 54`}>
                      {Array.from({ length: 20 }, (_, i) => {
                        const angle = (i / 20) * 2 * Math.PI - Math.PI / 2;
                        const cx = 27;
                        const cy = 27;
                        const r = 21.5;
                        const x = cx + r * Math.cos(angle);
                        const y = cy + r * Math.sin(angle);
                        const filled = Math.round(pct * 20);
                        return (
                          <circle
                            key={i}
                            cx={x} cy={y} r={2.8}
                            fill={i < filled ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.10)'}
                          />
                        );
                      })}
                      <text x={27} y={31} textAnchor="middle" fill="rgba(255,255,255,0.80)" fontSize="11" fontWeight="700">
                        {Math.round(pct * 100)}%
                      </text>
                    </svg>
                  )}
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
              let border = '1.5px solid rgba(255,255,255,0.38)';
              let textColor = 'rgba(255,255,255,0.5)';
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
                    opacity: isFuture && !rating ? 0.35 : 1,
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
        <span className="text-[13px] uppercase tracking-[0.2em] font-black block mb-6" style={{ color: '#ffffff' }}>Body Measurements</span>
        <div className="grid grid-cols-1 gap-4">
          {[
            { label: 'Body Weight (KG)', value: bodyWeight, onChange: setBodyWeight, id: 'field-bodyweight', last: lastBodyWeight },
            { label: 'Body Fat (%)', value: bodyFat, onChange: setBodyFat, id: 'field-bodyfat', last: lastBodyFat },
            { label: 'Muscle Mass (KG)', value: muscleMass, onChange: setMuscleMass, id: 'field-musclemass', last: lastMuscleMass },
          ].map(field => {
            const isFocused = focusedField === field.id;
            const showHint = !isFocused && !field.value && field.last;
            return (
              <label key={field.label} htmlFor={field.id} className="flex justify-between items-center p-5 rounded-lg cursor-text"
                style={{
                  backgroundColor: isFocused ? '#ffffff' : '#121212',
                  border: isFocused ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.05)',
                  transition: 'background-color 0.15s, border-color 0.15s',
                }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isFocused ? '#000000' : '#ffffff' }}>{field.label}</span>
                <div style={{ position: 'relative', width: '6rem', textAlign: 'right' }}>
                  {showHint && (
                    <span className="text-lg font-black tracking-tight" style={{ color: '#9ba4b0', pointerEvents: 'none', userSelect: 'none' }}>
                      {field.last}
                    </span>
                  )}
                  <input
                    id={field.id}
                    type="number"
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    onFocus={() => setFocusedField(field.id)}
                    onBlur={() => setFocusedField(null)}
                    step="0.1"
                    className="text-right text-lg font-black tracking-tight p-0"
                    style={{
                      backgroundColor: 'transparent', border: 'none', outline: 'none',
                      color: isFocused ? '#000000' : '#ffffff',
                      width: showHint ? '0' : '100%',
                      opacity: showHint ? 0 : 1,
                      position: showHint ? 'absolute' : 'relative',
                    }}
                  />
                </div>
              </label>
            );
          })}
        </div>

        {saveError && <p className="text-red-400 text-sm mt-4 text-center">{saveError}</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full font-black uppercase tracking-widest text-[10px] py-5 rounded-full mt-8 active:scale-[0.98] transition-all"
          style={{ backgroundColor: saveSuccess ? '#22c55e' : '#ffffff', color: '#000000', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Update Metrics'}
        </button>
      </section>

      <CaloriesTrends />

      {/* Edit sheet triggered from sparkline pencil icon */}
      {showEditSheet && (
        <CaloriesEditSheet
          onClose={() => setShowEditSheet(false)}
          onSaved={() => { setShowEditSheet(false); setSaveSuccess(v => !v); }}
        />
      )}
    </div>
  );
};
