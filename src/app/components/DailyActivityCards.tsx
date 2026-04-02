import React, { useEffect, useState } from 'react';
import { Waves, Bike, PersonStanding } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Exercise IDs
const TRACKER_ID = 82;
const ROW_ID = 83;
const RUNNING_ID = 84;
const CYCLE_ID = 87;
// Total KM uses Tracker + Row + Cycle only
const TOTAL_CARDIO_IDS = [TRACKER_ID, ROW_ID, CYCLE_ID];
// Fetch all cardio types (for chips)
const ALL_CARDIO_IDS = [TRACKER_ID, ROW_ID, RUNNING_ID, CYCLE_ID];

const TYPE_LABEL: Record<string, string> = {
  CHEST: 'Chest',
  BACK: 'Back',
  LEGS: 'Legs',
};

interface DayData {
  date: string;
  calories: number;
  // total_cardio values (km × multiplier) — used for the big KM number
  trackerTotal: number;
  rowTotal: number;
  cycleTotal: number;
  // raw km — used for chips
  rowKm: number;
  cycleKm: number;
  runningKm: number;
  muscleGroups: string[];
  totalWeightKg: number;
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

function fmtWeight(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`;
  return `${Math.round(kg)}`;
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
  // Big KM number = sum of total_cardio (km × multiplier) for Tracker + Row + Cycle
  const totalKm = day.trackerTotal + day.rowTotal + day.cycleTotal;
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

      {/* Cardio KM big number — uses total_cardio */}
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
          {/* Chips: Row, Cycle, Running — show raw km */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            {day.rowKm > 0 && <Chip icon={<Waves size={10} />} value={fmt(day.rowKm)} />}
            {day.cycleKm > 0 && <Chip icon={<Bike size={10} />} value={fmt(day.cycleKm)} />}
            {day.runningKm > 0 && <Chip icon={<PersonStanding size={10} />} value={fmt(day.runningKm)} />}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.18)', fontWeight: 500, paddingBottom: '4px' }}>
          No cardio
        </div>
      )}

      {/* Muscle groups + weights total */}
      {hasWeights ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
          {day.totalWeightKg > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'rgba(255,255,255,0.75)' }}>
                {fmtWeight(day.totalWeightKg)}
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
                KG
              </span>
            </div>
          )}
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

      // Fetch cardio — need both km (raw) and total_cardio (km × multiplier)
      const { data: cardioData } = await supabase
        .from('workouts')
        .select('date, exercise_id, km, total_cardio')
        .eq('type', 'CARDIO')
        .in('exercise_id', ALL_CARDIO_IDS)
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

      // Fetch weights — muscle groups + total_weight per day
      const { data: weightsData } = await supabase
        .from('workouts')
        .select('date, type, total_weight')
        .in('type', ['CHEST', 'BACK', 'LEGS'])
        .gte('date', oldest)
        .order('date', { ascending: false });

      // Build cardio map
      // trackerTotal/rowTotal/cycleTotal = sum of total_cardio (for big KM number)
      // rowKm/cycleKm/runningKm = sum of raw km (for chips)
      const cardioMap: Record<string, {
        trackerTotal: number; rowTotal: number; cycleTotal: number;
        rowKm: number; cycleKm: number; runningKm: number;
      }> = {};

      for (const r of (cardioData || []) as any[]) {
        if (!cardioMap[r.date]) cardioMap[r.date] = {
          trackerTotal: 0, rowTotal: 0, cycleTotal: 0,
          rowKm: 0, cycleKm: 0, runningKm: 0,
        };
        const km = Number(r.km || 0);
        const tc = Number(r.total_cardio || 0);
        if (r.exercise_id === TRACKER_ID) cardioMap[r.date].trackerTotal += tc;
        if (r.exercise_id === ROW_ID) { cardioMap[r.date].rowTotal += tc; cardioMap[r.date].rowKm += km; }
        if (r.exercise_id === CYCLE_ID) { cardioMap[r.date].cycleTotal += tc; cardioMap[r.date].cycleKm += km; }
        if (r.exercise_id === RUNNING_ID) cardioMap[r.date].runningKm += km;
      }

      // Build calories map
      const calMap: Record<string, number> = {};
      for (const r of (calData || []) as any[]) {
        calMap[r.date] = Number(r.calories || 0);
      }

      // Build weights map (muscle groups + total weight)
      const muscleMap: Record<string, Set<string>> = {};
      const weightTotalMap: Record<string, number> = {};
      for (const r of (weightsData || []) as any[]) {
        if (!muscleMap[r.date]) muscleMap[r.date] = new Set();
        if (!weightTotalMap[r.date]) weightTotalMap[r.date] = 0;
        const label = TYPE_LABEL[r.type];
        if (label) muscleMap[r.date].add(label);
        weightTotalMap[r.date] += Number(r.total_weight || 0);
      }

      const result: DayData[] = dates.map(date => ({
        date,
        calories: calMap[date] || 0,
        trackerTotal: cardioMap[date]?.trackerTotal || 0,
        rowTotal: cardioMap[date]?.rowTotal || 0,
        cycleTotal: cardioMap[date]?.cycleTotal || 0,
        rowKm: cardioMap[date]?.rowKm || 0,
        cycleKm: cardioMap[date]?.cycleKm || 0,
        runningKm: cardioMap[date]?.runningKm || 0,
        muscleGroups: muscleMap[date] ? Array.from(muscleMap[date]) : [],
        totalWeightKg: weightTotalMap[date] || 0,
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
