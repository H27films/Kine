import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface MaxStatsCardProps {
  category: string;
  timePeriod: string;
}

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];
const CARDIO_MAP: Record<string, { exerciseName?: string; exerciseIds?: number[] }> = {
  TRACKER: { exerciseIds: [82, 83, 87] },
  RUNNING: { exerciseName: 'RUNNING' },
  ROWING: { exerciseName: 'ROW' },
  'CROSS TRAINER': { exerciseName: 'CROSS TRAINER' },
};

const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString();

const headerStyle: React.CSSProperties = {
  fontFamily: "'Inconsolata', monospace",
  fontSize: '22px',
  fontWeight: 348,
  fontStretch: '175%',
  letterSpacing: '0.06em',
  color: 'rgba(0,0,0,0.35)',
  textTransform: 'uppercase',
};

const headerStyleRight: React.CSSProperties = {
  ...headerStyle,
  textAlign: 'right',
};

export const MaxStatsCard: React.FC<MaxStatsCardProps> = ({ category, timePeriod }) => {
  const [maxValue, setMaxValue] = useState<number | null>(null);
  const [maxLabel, setMaxLabel] = useState<string | null>(null);
  const [avgValue, setAvgValue] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const isMonthly = timePeriod === 'MONTHLY';
      let rows: any[] = [];

      if (category === 'ALL WEIGHTS') {
        const sel = isMonthly ? 'date, total_weight' : 'week, total_weight';
        const { data } = await supabase.from('workouts').select(sel).in('type', WEIGHT_TYPES).not('week', 'is', null);
        rows = data || [];
      } else if (category === 'CALORIES') {
        const sel = isMonthly ? 'date, calories' : 'week, calories';
        const { data } = await supabase.from('workouts').select(sel).eq('type', 'MEASUREMENT').eq('exercise_id', 90).not('calories', 'is', null).not('week', 'is', null);
        rows = data || [];
      } else if (category === 'SCORE') {
        // Score has duplicate rows per day — needs day for weekly dedup
        const sel = isMonthly ? 'date, total_score' : 'week, day, total_score';
        const { data } = await supabase.from('workouts').select(sel).not('total_score', 'is', null).not('week', 'is', null);
        rows = data || [];
      } else if (category === 'FOOD') {
        const sel = isMonthly ? 'date, food_rating' : 'week, food_rating';
        const { data } = await supabase.from('workouts').select(sel).not('food_rating', 'is', null).not('week', 'is', null);
        rows = data || [];
      } else if (CARDIO_MAP[category]) {
        // Fetch all cardio + exercises, filter by name in JS (same as Analytics page)
        const sel = isMonthly ? 'date, total_cardio, exercises(exercise_name)' : 'week, total_cardio, exercises(exercise_name)';
        const { data } = await supabase.from('workouts').select(sel).not('week', 'is', null);
        rows = data || [];
      } else {
        // Individual weight type (CHEST, BACK, LEGS)
        const sel = isMonthly ? 'date, total_weight' : 'week, total_weight';
        const { data } = await supabase.from('workouts').select(sel).eq('type', category).not('week', 'is', null);
        rows = data || [];
      }

      if (rows.length === 0) {
        setMaxValue(null);
        setMaxLabel(null);
        setAvgValue(null);
        return;
      }

      const totals: Record<string, number> = {};
      const dayCounts: Record<string, number> = {};
      const foodDaysPerBucket: Record<string, Set<string>> = {};
      const seenDays = new Set<string>();

      for (const row of rows) {
        const bucket = isMonthly ? row.date?.substring(0, 7) : String(row.week);
        if (!bucket) continue;

        // Cardio: filter by exercise name in JS (ROWING → ROW mapping)
        if (CARDIO_MAP[category]) {
          const name = (row.exercises?.exercise_name || '').toUpperCase();
          const expectedName = category === 'ROWING' ? 'ROW' : category;
          if (name !== expectedName) continue;
        }

        // Dedup by date: only count each day once (for Calories, Score-monthly)
        if (category === 'CALORIES' || (category === 'SCORE' && isMonthly)) {
          if (seenDays.has(row.date)) continue;
          seenDays.add(row.date);
        }

        // Track unique days for Food monthly average
        if (category === 'FOOD' && isMonthly) {
          if (!foodDaysPerBucket[bucket]) foodDaysPerBucket[bucket] = new Set();
          foodDaysPerBucket[bucket].add(row.date);
        }

        // SCORE weekly: dedup by week_day since same value stored on multiple rows
        if (category === 'SCORE' && !isMonthly) {
          const key = `${row.week}_${row.day}`;
          if (seenDays.has(key)) continue;
          seenDays.add(key);
        }

        let val = 0;
        if (category === 'CALORIES') val = Number(row.calories || 0);
        else if (category === 'SCORE') val = Number(row.total_score || 0);
        else if (category === 'FOOD') {
          const rating = (row.food_rating || '').toUpperCase();
          val = rating === 'GOOD' ? 3 : rating === 'OK' ? 2 : rating === 'BAD' ? 1 : 0;
        } else if (CARDIO_MAP[category]) {
          val = Number(row.total_cardio || 0);
        } else {
          val = Number(row.total_weight || 0);
        }

        if (!totals[bucket]) { totals[bucket] = 0; dayCounts[bucket] = 0; }
        totals[bucket] += val;
        dayCounts[bucket]++;
      }

      const entries = Object.entries(totals).map(([bucket, value]) => ({
        bucket,
        value,
        days: category === 'FOOD' && isMonthly ? (foodDaysPerBucket[bucket]?.size || 1) : (dayCounts[bucket] || 1),
      }));
      if (entries.length === 0) { setMaxValue(null); setMaxLabel(null); setAvgValue(null); return; }

      // Determine if we convert to daily average
      // Cardio: always sum | Calories: always avg | Food: sum weekly / avg monthly | Score: always avg
      const isDailyAvg = category === 'CALORIES'
        || category === 'SCORE'
        || (category === 'FOOD' && isMonthly);
      const processedEntries = entries.map(e => {
        if (!isDailyAvg) return e;
        return { ...e, value: Math.round(e.value / e.days) };
      });

      const maxEntry = processedEntries.reduce((a, b) => a.value > b.value ? a : b);
      const avg = processedEntries.reduce((s, e) => s + e.value, 0) / processedEntries.length;

      setMaxValue(Math.round(maxEntry.value));
      setMaxLabel(formatBucket(maxEntry.bucket, isMonthly));
      setAvgValue(Math.round(avg));
    };

    loadData();
  }, [category, timePeriod]);

  if (maxValue === null || maxLabel === null) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
      <div>
        <div style={headerStyle}>MAX</div>
        <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', lineHeight: 1.1 }}>
          {category === 'CALORIES' ? maxValue!.toLocaleString() : fmt(maxValue)}
        </div>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#1a1a1a', marginTop: '2px', textTransform: 'uppercase' }}>
          {maxLabel}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={headerStyleRight}>AVG</div>
        <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', lineHeight: 1.1 }}>
          {category === 'CALORIES' ? avgValue!.toLocaleString() : fmt(avgValue!)}
        </div>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#1a1a1a', marginTop: '2px', textTransform: 'uppercase' }}>
          All {timePeriod === 'MONTHLY' ? 'months' : 'weeks'}
        </div>
      </div>
    </div>
  );
};

const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function formatBucket(bucket: string, isMonthly: boolean): string {
  if (isMonthly) {
    const [y, m] = bucket.split('-').map(Number);
    return `${monthNames[m - 1]} ${y}`;
  }
  return `Week ${bucket}`;
}
