import React, { useEffect, useState } from 'react';
import { Footprints, Waves, Bike } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Exercise IDs
const TRACKER_ID = 82;
const ROW_ID = 83;
const CYCLE_ID = 87;
const CARDIO_IDS = [TRACKER_ID, ROW_ID, CYCLE_ID];

// Map exercise type -> display label for muscle groups
const TYPE_LABEL: Record<string, string> = {
  CHEST: 'Chest',
  BACK: 'Back',
  LEGS: 'Legs',
};

interface DayData {
  date: string; // YYYY-MM-DD
  calories: number;
  tracker: number;
  row: number;
  cycle: number;
  muscleGroups: string[];
}

function dayLabel(dateStr: string): string {
  const today = new Date();
  const d = new Date(dateStr + 'T12:00:00');
  const diffDays = Math.round(
    (new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000
  );
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'YESTERDAY';
  return d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function fmt(n: number): string {
  return n % 1 === 0 ? `${n}` : n.toFixed(1);
}

function getLast7Dates(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

const DayCard: React.FC<{ day: DayData }> = ({ day }) => {
  const totalKm = day.tracker + day.row + day.cycle;
  const hasCardio = totalKm > 0;
  const hasWeights = day.muscleGroups.length > 0;
  const hasCalories = day.calories > 0;
  const label = dayLabel(day.date);
  const isToday = label === 'TODAY';
  const isYesterday = label === 'YESTERDAY';

  return (
    <div
      style={{
        minWidth: '172px',
        backgroundColor: '#111111',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        borderLeft: isToday ? '2px solid rgba(255,255,255,0.7)' : '2px solid rgba(255,255,255,0.12)',
        flexShrink: 0,
      }}
    >
      {/* Header: day label + calories */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isToday ? '#ffffff' : 'rgba(255,255,255,0.55)',
            }}
          >
            {label}
          </div>
          {!isToday && !isYesterday && (
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
              {formatDisplayDate(day.date)}
            </div>
          )}
        </div>
        {hasCalories && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>
              {day.calories.toLocaleString()}
            </div>
            <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginTop: '2px' }}>
              KCAL
            </div>
          </div>
        )}
      </div>

      {/* Cardio KM big number */}
      {hasCardio ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.04em', color: '#ffffff', lineHeight: 1 }}>
              {fmt(totalKm)}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
              KM
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            {day.tracker > 0 && <Chip icon={<Footprints size={10} />} value={fmt(day.tracker)} />}
            {day.row > 0 && <Chip icon={<Waves size={10} />} value={fmt(day.row)} />}
            {day.cycle > 0 && <Chip icon={<Bike size={10} />} value={fmt(day.cycle)} />}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.18)', fontWeight: 500, paddingBottom: '4px' }}>
          No cardio
        </div>
      )}

      {/* Muscle groups */}
      {hasWeights ? (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {day.muscleGroups.map(g => (
            <span key={g} style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
              color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: '6px', padding: '3px 8px',
            }}>
              {g}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>No weights</div>
      )}
    </div>
  );
};

const Chip: React.FC<{ icon: React.ReactNode; value: string }> = ({ icon, value }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '4px',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '3px 7px',
  }}>
    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{icon}</span>
    <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>{value}</span>
  </div>
);

export const DailyActivityCards: React.FC = () => {
  const [days, setDays] = useState<DayData[]>([]);

  useEffect(() => {
    const load = async () => {
      const dates = getLast7Dates();
      const oldest = dates[dates.length - 1];

      // Fetch cardio (tracker, row, cycle)
      const { data: cardioData } = await supabase
        .from('workouts')
        .select('date, exercise_id, km')
        .eq('type', 'CARDIO')
        .in('exercise_id', CARDIO_IDS)
        .gte('date', oldest)
        .order('date', { ascending: false });

      // Fetch calories
      const { data: calData } = await supabase
        .from('workouts')
        .select('date, calories')
        .eq('type', 'MEASUREMENT')
        .not('calories', 'is', null)
        .gte('date', oldest)
        .order('date', { ascending: false });

      // Fetch weights muscle groups (distinct types per day)
      const { data: weightsData } = await supabase
        .from('workouts')
        .select('date, type, total_weight')
        .in('type', ['CHEST', 'BACK', 'LEGS'])
        .gte('date', oldest)
        .gt('total_weight', 0)
        .order('date', { ascending: false });

      // Build a map per date
      const cardioMap: Record<string, { tracker: number; row: number; cycle: number }> = {};
      for (const r of (cardioData || []) as any[]) {
        if (!cardioMap[r.date]) cardioMap[r.date] = { tracker: 0, row: 0, cycle: 0 };
        const km = Number(r.km || 0);
        if (r.exercise_id === TRACKER_ID) cardioMap[r.date].tracker += km;
        if (r.exercise_id === ROW_ID) cardioMap[r.date].row += km;
        if (r.exercise_id === CYCLE_ID) cardioMap[r.date].cycle += km;
      }

      const calMap: Record<string, number> = {};
      for (const r of (calData || []) as any[]) {
        calMap[r.date] = Number(r.calories || 0);
      }

      const muscleMap: Record<string, Set<string>> = {};
      for (const r of (weightsData || []) as any[]) {
        if (!muscleMap[r.date]) muscleMap[r.date] = new Set();
        const label = TYPE_LABEL[r.type];
        if (label) muscleMap[r.date].add(label);
      }

      const result: DayData[] = dates.map(date => ({
        date,
        calories: calMap[date] || 0,
        tracker: cardioMap[date]?.tracker || 0,
        row: cardioMap[date]?.row || 0,
        cycle: cardioMap[date]?.cycle || 0,
        muscleGroups: muscleMap[date] ? Array.from(muscleMap[date]) : [],
      }));

      setDays(result);
    };
    load();
  }, []);

  if (days.length === 0) return null;

  return (
    <section>
      <div style={{
        fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '14px',
      }}>
        DAILY
      </div>
      <div
        style={{
          display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px',
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}
        className="hide-scrollbar"
      >
        {days.map((day, i) => <DayCard key={i} day={day} />)}
      </div>
    </section>
  );
};
