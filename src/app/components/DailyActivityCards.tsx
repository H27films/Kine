import React from 'react';
import { Footprints, Waves, Bike } from 'lucide-react';

// ─── Data shape ────────────────────────────────────────────────────────────────

export interface DayActivity {
  /** JS Date for this day */
  date: Date;
  /** Total calories logged */
  calories: number;
  /**
   * Cardio breakdown (all in km).
   * tracker = iPhone step-tracker reading for the day (adds to total).
   * row / cycle = separate cardio sessions (also add to total).
   */
  cardio: {
    tracker: number;
    row: number;
    cycle: number;
  };
  /** Muscle groups trained that day, e.g. ["Chest", "Shoulders"] */
  muscleGroups: string[];
}

// ─── Placeholder data (replace with real data store later) ─────────────────────

const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d;
};

export const DAILY_ACTIVITY_DATA: DayActivity[] = [
  {
    date: daysAgo(0),
    calories: 2_200,
    cardio: { tracker: 8.4, row: 0, cycle: 15.2 },
    muscleGroups: ['Chest', 'Shoulders'],
  },
  {
    date: daysAgo(1),
    calories: 1_950,
    cardio: { tracker: 6.1, row: 2.0, cycle: 0 },
    muscleGroups: ['Back', 'Biceps'],
  },
  {
    date: daysAgo(2),
    calories: 2_400,
    cardio: { tracker: 10.2, row: 0, cycle: 12.0 },
    muscleGroups: ['Legs'],
  },
  {
    date: daysAgo(3),
    calories: 1_800,
    cardio: { tracker: 5.3, row: 0, cycle: 0 },
    muscleGroups: [],
  },
  {
    date: daysAgo(4),
    calories: 2_600,
    cardio: { tracker: 9.8, row: 3.5, cycle: 18.5 },
    muscleGroups: ['Chest', 'Triceps'],
  },
  {
    date: daysAgo(5),
    calories: 2_100,
    cardio: { tracker: 7.2, row: 0, cycle: 0 },
    muscleGroups: ['Back', 'Legs'],
  },
  {
    date: daysAgo(6),
    calories: 0,
    cardio: { tracker: 3.1, row: 0, cycle: 0 },
    muscleGroups: [],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function dayLabel(date: Date): string {
  const now = new Date();
  const diffDays = Math.round((now.setHours(0,0,0,0) - new Date(date).setHours(0,0,0,0)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function fmt(n: number): string {
  return n % 1 === 0 ? `${n}` : n.toFixed(1);
}

// ─── Single card ───────────────────────────────────────────────────────────────

interface CardProps {
  day: DayActivity;
}

const DayCard: React.FC<CardProps> = ({ day }) => {
  const totalKm = day.cardio.tracker + day.cardio.row + day.cardio.cycle;
  const hasCardio = totalKm > 0;
  const hasWeights = day.muscleGroups.length > 0;
  const hasCalories = day.calories > 0;

  const label = dayLabel(day.date);
  const isToday = label === 'Today';

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
      {/* ── Header row: day label + calories ── */}
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
          {label !== 'Today' && label !== 'Yesterday' && (
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
              {formatDate(day.date)}
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

      {/* ── Cardio KM big number ── */}
      {hasCardio ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span
              style={{
                fontSize: '2.8rem',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                color: '#ffffff',
                lineHeight: 1,
              }}
            >
              {fmt(totalKm)}
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.06em',
              }}
            >
              KM
            </span>
          </div>

          {/* Breakdown chips */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            {day.cardio.tracker > 0 && (
              <Chip icon={<Footprints size={10} />} value={`${fmt(day.cardio.tracker)}`} />
            )}
            {day.cardio.row > 0 && (
              <Chip icon={<Waves size={10} />} value={`${fmt(day.cardio.row)}`} />
            )}
            {day.cardio.cycle > 0 && (
              <Chip icon={<Bike size={10} />} value={`${fmt(day.cardio.cycle)}`} />
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.18)',
            fontWeight: 500,
            paddingBottom: '4px',
          }}
        >
          No cardio
        </div>
      )}

      {/* ── Muscle groups ── */}
      {hasWeights ? (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {day.muscleGroups.map((g) => (
            <span
              key={g}
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: 'rgba(255,255,255,0.7)',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '6px',
                padding: '3px 8px',
              }}
            >
              {g}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
          No weights
        </div>
      )}
    </div>
  );
};

// ─── Tiny icon chip ────────────────────────────────────────────────────────────

interface ChipProps {
  icon: React.ReactNode;
  value: string;
}

const Chip: React.FC<ChipProps> = ({ icon, value }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: '6px',
      padding: '3px 7px',
    }}
  >
    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{icon}</span>
    <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
      {value}
    </span>
  </div>
);

// ─── Exported list ──────────────────────────────────────────────────────────────

interface DailyActivityCardsProps {
  days?: DayActivity[];
}

export const DailyActivityCards: React.FC<DailyActivityCardsProps> = ({
  days = DAILY_ACTIVITY_DATA,
}) => {
  return (
    <section>
      <div
        style={{
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '14px',
        }}
      >
        DAILY
      </div>

      {/* Horizontally scrollable row */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '8px',
          /* hide scrollbar on webkit */
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
        className="hide-scrollbar"
      >
        {days.map((day, i) => (
          <DayCard key={i} day={day} />
        ))}
      </div>
    </section>
  );
};
