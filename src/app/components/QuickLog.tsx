import React, { useState, useEffect, useRef } from 'react';
import { supabase, todayStr, getISOWeek, getDayName, recalculateDailyTotals } from '../../lib/supabase';

const TRACKER_ID  = 82;
const CALORIES_ID = 90;
const FOOD_ID     = 89;

const FOOD_OPTIONS = ['BAD', 'OK', 'GOOD'] as const;
type FoodOption = typeof FOOD_OPTIONS[number];

export const QuickLog: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const today = todayStr();
  const [trackerKm, setTrackerKm] = useState('');
  const [calories, setCalories] = useState('');
  const [foodRating, setFoodRating] = useState<FoodOption>('GOOD');
  const [foodRatingOpen, setFoodRatingOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trackerMultiplier, setTrackerMultiplier] = useState<number>(1);

  useEffect(() => {
    const load = async () => {
      const { data: exData } = await supabase
        .from('exercises').select('multiplier').eq('exercise_id', TRACKER_ID).maybeSingle();
      if (exData) setTrackerMultiplier(Number(exData.multiplier || 1));

      const { data: tData } = await supabase
        .from('workouts').select('km').eq('type', 'CARDIO')
        .eq('exercise_id', TRACKER_ID).eq('date', today).maybeSingle();
      if (tData && tData.km !== null) setTrackerKm(parseFloat(String(tData.km)).toFixed(1));

      const { data: cData } = await supabase
        .from('workouts').select('calories').eq('type', 'MEASUREMENT')
        .eq('exercise_id', CALORIES_ID).eq('date', today).not('calories', 'is', null).maybeSingle();
      setCalories(cData && cData.calories != null ? String(cData.calories) : '');

      const { data: fData } = await supabase
        .from('workouts').select('food_rating').eq('type', 'MEASUREMENT')
        .eq('exercise_id', FOOD_ID).eq('date', today).not('food_rating', 'is', null).maybeSingle();
      if (fData && fData.food_rating) {
        const r = String(fData.food_rating).toUpperCase();
        setFoodRating(r === 'BAD' ? 'BAD' : r === 'GOOD' ? 'GOOD' : 'OK');
      } else {
        setFoodRating('OK');
      }
    };
    load();
  }, [today]);

  const foodRatingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (foodRatingRef.current && !foodRatingRef.current.contains(e.target as Node)) {
        setFoodRatingOpen(false);
      }
    };
    if (foodRatingOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [foodRatingOpen]);

  const upsert = async (type: string, exerciseId: number, payload: Record<string, unknown>) => {
    const week = getISOWeek(new Date(today + 'T12:00:00+08:00'));
    const day  = getDayName(new Date(today + 'T12:00:00+08:00'));
    const { data: existing } = await supabase
      .from('workouts').select('id')
      .eq('type', type).eq('exercise_id', exerciseId).eq('date', today).maybeSingle();
    if (existing) {
      await supabase.from('workouts').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('workouts').insert({
        date: today, week, day, type, exercise_id: exerciseId,
        total_score_k: null, new_entry: 'New', source: 'app', ...payload,
      });
    }
    await recalculateDailyTotals(today);
  };

  const saveTracker = async () => {
    const v = parseFloat(trackerKm);
    if (isNaN(v) || v <= 0) return;
    await upsert('CARDIO', TRACKER_ID, { km: v, total_cardio: +(v * trackerMultiplier).toFixed(2) });
  };
  const saveCalories = async () => {
    const v = parseInt(calories, 10);
    if (isNaN(v) || v <= 0) return;
    await upsert('MEASUREMENT', CALORIES_ID, { calories: v });
  };
  const saveFood = async () => {
    await upsert('MEASUREMENT', FOOD_ID, { food_rating: foodRating, calories: null });
  };

  const saveAll = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await Promise.all([saveTracker(), saveCalories(), saveFood()]);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px',
    textTransform: 'uppercase' as const, color: '#1a1a1a',
    fontFamily: "'Archivo', sans-serif",
  };

  const subLabelStyle = {
    fontSize: '8px', fontWeight: 600, color: 'rgba(26,26,26,0.45)',
    letterSpacing: '0.1em', textTransform: 'uppercase' as const,
    fontFamily: "'Archivo', sans-serif", marginTop: '4px',
  };

  const inputStyle = {
    width: '100%', textAlign: 'center' as const, background: 'transparent',
    border: 'none', outline: 'none', fontFamily: "'Archivo', sans-serif",
    fontSize: '16px', fontWeight: 600, color: '#1a1a1a', padding: 0,
    letterSpacing: '-0.02em',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px', width: '100%' }}>
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
        border: '1px solid rgba(255,255,255,0.55)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 5px 12px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 8,
        padding: '14px 20px 16px 20px', boxSizing: 'border-box',
      }}>
        {/* Headers */}
<div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
          {['TRACKER', 'CALORIES', 'FOOD'].map(label => (
            <div key={label} style={{ flex: 1, textAlign: 'center' }}>
              <span style={labelStyle}>{label}</span>
            </div>
          ))}
        </div>

        {/* Inputs row */}
        <div style={{ display: 'flex', gap: '12px' }}>

          {/* ── TRACKER ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', marginTop: '4px' }}>
              <input
                type="number" inputMode="decimal" step="0.1" placeholder="0.0"
                value={trackerKm}
                onChange={e => setTrackerKm(e.target.value)}
                style={inputStyle}
              />
            </div>
            <span style={subLabelStyle}>KM</span>
          </div>

          {/* ── CALORIES ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', marginTop: '4px' }}>
              <input
                type="number" inputMode="numeric" placeholder="0"
                value={calories}
                onChange={e => setCalories(e.target.value)}
                style={inputStyle}
              />
            </div>
            <span style={subLabelStyle}>KCAL</span>
          </div>

          {/* ── FOOD ── */}
          <div
            ref={foodRatingRef}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
          >
            <div style={{ position: 'relative', width: '100%', marginTop: '4px', textAlign: 'center' }}>
              <input
                type="text" readOnly value={foodRating}
                onClick={() => setFoodRatingOpen(!foodRatingOpen)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              />
              {foodRatingOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                  backgroundColor: '#f2f2f2', border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '10px', overflow: 'hidden', zIndex: 50,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 100,
                }}>
                  {FOOD_OPTIONS.map(opt => (
                    <div
                      key={opt}
                      onClick={() => { setFoodRating(opt); setFoodRatingOpen(false); }}
                      style={{
                        padding: '11px 14px', cursor: 'pointer', fontSize: '11px',
                        fontWeight: foodRating === opt ? 700 : 400, color: '#1a1a1a',
                        backgroundColor: foodRating === opt ? 'rgba(0,0,0,0.06)' : 'transparent',
                        letterSpacing: '0.8px', textTransform: 'uppercase',
                        borderBottom: '1px solid rgba(0,0,0,0.08)',
                        fontFamily: "'Archivo', sans-serif",
                      }}
                    >{opt}</div>
                  ))}
                </div>
              )}
            </div>
            <span style={subLabelStyle}>RATING</span>
          </div>

        </div>

        {/* ── Single LOG button ── */}
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={saveAll}
            disabled={saving}
            style={{
              width: '100%', padding: '8px 0', borderRadius: '9999px',
              backgroundColor: saving ? 'rgba(26,26,26,0.08)' : '#1a1a1a',
              color: saving ? 'rgba(26,26,26,0.35)' : '#f2f2f2',
              fontFamily: "'Archivo', sans-serif", fontSize: '9px', fontWeight: 700,
              letterSpacing: '1.5px', textTransform: 'uppercase', border: 'none',
              cursor: saving ? 'default' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {saving ? 'SAVING…' : 'LOG'}
          </button>
        </div>

      </div>
    </div>
  );
};