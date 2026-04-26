import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Exercise IDs
const TRACKER_ID = 82;
const ROW_ID = 83;
const RUNNING_ID = 84;
const WALKING_ID = 85;
const CROSS_ID = 86;
const CYCLE_ID = 87;
const ALL_CARDIO_IDS = [TRACKER_ID, ROW_ID, RUNNING_ID, WALKING_ID, CROSS_ID, CYCLE_ID];

const TYPE_LABEL: Record<string, string> = {
  CHEST: 'Chest',
  BACK: 'Back',
  LEGS: 'Legs',
};

interface DayData {
  date: string;
  calories: number;
  cardio: Record<number, { tc: number; km: number }>;
  muscleGroups: string[];
  totalWeightKg: number;
  totalScore: number;
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
  return n.toFixed(1);
}

function fmtWeightFull(kg: number): string {
  return Math.round(kg).toLocaleString('en-GB');
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

type IconKey = 'running' | 'rowing' | 'walking' | 'cycling' | 'crosstrainer';

const IconSVG: React.FC<{ iconKey: IconKey; color: string; size?: number }> = ({ iconKey, color: c, size = 13 }) => {
  switch (iconKey) {
    case 'running':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <rect x="25" y="18" width="35" height="3" rx="1.5" fill={c}/>
          <rect x="15" y="28" width="25" height="3" rx="1.5" fill={c}/>
          <rect x="5"  y="38" width="30" height="3" rx="1.5" fill={c}/>
          <rect x="20" y="48" width="25" height="3" rx="1.5" fill={c}/>
          <rect x="15" y="58" width="25" height="3" rx="1.5" fill={c}/>
          <circle cx="72" cy="22" r="6" fill={c}/>
          <path d="M48 38L65 28L75 35L85 45" stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M65 28L55 45L40 38"        stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M55 45L65 65L70 85"        stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M55 45L45 55L22 62"        stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'rowing':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="25" r="5" fill={c}/>
          <path d="M50 30L45 50L55 55L65 45" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M45 50L40 60H55"          stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M65 45L75 45V35"          stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M30 65H80"                stroke={c} strokeWidth="5" strokeLinecap="round"/>
        </svg>
      );
    case 'walking':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <path d="M40 70C40 80 30 85 25 80C20 75 25 60 30 50C35 40 45 40 45 50C45 60 40 60 40 70Z" fill={c}/>
          <circle cx="25" cy="40" r="3" fill={c}/>
          <circle cx="32" cy="35" r="3" fill={c}/>
          <circle cx="40" cy="35" r="3" fill={c}/>
          <circle cx="48" cy="40" r="3" fill={c}/>
          <path d="M60 70C60 80 70 85 75 80C80 75 75 60 70 50C65 40 55 40 55 50C55 60 60 60 60 70Z" fill={c}/>
          <circle cx="75" cy="40" r="3" fill={c}/>
          <circle cx="68" cy="35" r="3" fill={c}/>
          <circle cx="60" cy="35" r="3" fill={c}/>
          <circle cx="52" cy="40" r="3" fill={c}/>
        </svg>
      );
    case 'cycling':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <circle cx="25" cy="70" r="15" stroke={c} strokeWidth="5"/>
          <circle cx="75" cy="70" r="15" stroke={c} strokeWidth="5"/>
          <path d="M25 70L45 45H65L75 70" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M45 45L55 30H65"       stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="55" cy="25" r="4" fill={c}/>
        </svg>
      );
    case 'crosstrainer':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <rect x="20" y="75" width="50" height="8" fill={c}/>
          <rect x="35" y="70" width="35" height="5" fill={c}/>
          <rect x="56" y="65" width="14" height="5" fill={c}/>
          <path d="M62 65V45L68 40" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="47" cy="23" r="6" fill={c}/>
          <path d="M47 28L40 45"    stroke={c} strokeWidth="9" strokeLinecap="round"/>
          <path d="M47 30L55 38L60 38" stroke={c} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M47 30L35 35L28 42" stroke={c} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M40 45L45 55L52 65" stroke={c} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M40 45L35 60L28 70" stroke={c} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return null;
  }
};

const Chip: React.FC<{ iconKey: IconKey; value: string }> = ({ iconKey, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
    <span style={{ display: 'flex', alignItems: 'center' }}>
      <IconSVG iconKey={iconKey} color="rgba(255,255,255,0.4)" size={13} />
    </span>
    <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{value}</span>
  </div>
);

const DayCard: React.FC<{ day: DayData }> = ({ day }) => {
  const c = day.cardio;
  const hasTracker = (c[TRACKER_ID]?.tc || 0) > 0;

  // Tracker-aware total — same logic as Dashboard movement
  const totalKm = hasTracker
    ? (c[TRACKER_ID]?.tc || 0) + (c[ROW_ID]?.tc || 0) + (c[CYCLE_ID]?.tc || 0)
    : (c[ROW_ID]?.tc || 0) + (c[RUNNING_ID]?.tc || 0) + (c[WALKING_ID]?.tc || 0) + (c[CROSS_ID]?.tc || 0) + (c[CYCLE_ID]?.tc || 0);

  const hasCardio = totalKm > 0;
  const hasWeights = day.muscleGroups.length > 0 || day.totalWeightKg > 0;
  const hasCalories = day.calories > 0;
  const label = dayLabel(day.date);
  const isToday = label === 'TODAY';

  return (
    <div
      style={{
        minWidth: '172px',
        backgroundColor: '#111111',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '2px solid rgba(255,255,255,0.7)',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {day.totalScore > 0 && (
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '12px',
          fontSize: '1rem',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: '#ffffff',
          lineHeight: 1,

        }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', marginRight: '5px', fontWeight: 800 }}>SCORE</span> <span style={{ fontWeight: 800 }}>{day.totalScore}</span>
        </div>
      )}
      {/* Row 1: Day label + calories */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isToday ? '#ffffff' : 'rgba(255,255,255,0.55)',
          }}>
            {label}
          </div>
          {/* Always show date */}
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
            {formatDisplayDate(day.date)}
          </div>
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

      {/* Cardio section — fixed height so all cards align */}
      <div style={{ minHeight: '72px', marginBottom: '12px' }}>
        {hasCardio && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.04em', color: '#ffffff', lineHeight: 1 }}>
                {totalKm.toFixed(1)}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
                KM
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
              {[
                { id: ROW_ID, icon: 'rowing' as IconKey },
                { id: RUNNING_ID, icon: 'running' as IconKey },
                { id: WALKING_ID, icon: 'walking' as IconKey },
                { id: CROSS_ID, icon: 'crosstrainer' as IconKey },
                { id: CYCLE_ID, icon: 'cycling' as IconKey },
              ]
                .filter(({ id }) => (c[id]?.km || 0) > 0)
                .sort((a, b) => (c[b.id]?.km || 0) - (c[a.id]?.km || 0))
                .slice(0, 2)
                .map(({ id, icon }) => (
                  <Chip key={id} iconKey={icon} value={`${fmt(c[id].km)}km`} />
                ))}
            </div>
          </>
        )}
      </div>

      {/* Weights section — fixed height so all cards align */}
      <div style={{ minHeight: '52px' }}>
        {hasWeights && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {day.totalWeightKg > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.85)', lineHeight: 1 }}>
                  {fmtWeightFull(day.totalWeightKg)}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
                  KG
                </span>
              </div>
            )}
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
          </div>
        )}
      </div>
    </div>
  );
};

export const DailyActivityCards: React.FC = () => {
  const [days, setDays] = useState<DayData[]>([]);

  useEffect(() => {
    const load = async () => {
      const dates = getLast7Dates();
      const oldest = dates[dates.length - 1];

      const { data: cardioData } = await supabase
        .from('workouts')
        .select('date, exercise_id, km, total_cardio')
        .eq('type', 'CARDIO')
        .in('exercise_id', ALL_CARDIO_IDS)
        .gte('date', oldest)
        .order('date', { ascending: false });

      const { data: calData } = await supabase
        .from('workouts')
        .select('date, calories')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', 90)
        .not('calories', 'is', null)
        .gte('date', oldest)
        .order('date', { ascending: false });

      const { data: weightsData } = await supabase
        .from('workouts')
        .select('date, type, total_weight')
        .in('type', ['CHEST', 'BACK', 'LEGS'])
        .gte('date', oldest)
        .order('date', { ascending: false });

      const { data: scoreData } = await supabase
        .from('workouts')
        .select('date, total_score')
        .not('total_score', 'is', null)
        .gte('date', oldest)
        .order('date', { ascending: false });

      // Build per-date, per-exercise_id totals
      const cardioMap: Record<string, Record<number, { tc: number; km: number }>> = {};
      for (const r of (cardioData || []) as any[]) {
        if (!cardioMap[r.date]) cardioMap[r.date] = {};
        if (!cardioMap[r.date][r.exercise_id]) cardioMap[r.date][r.exercise_id] = { tc: 0, km: 0 };
        cardioMap[r.date][r.exercise_id].tc += Number(r.total_cardio || 0);
        cardioMap[r.date][r.exercise_id].km += Number(r.km || 0);
      }

      const calMap: Record<string, number> = {};
      for (const r of (calData || []) as any[]) {
        calMap[r.date] = Number(r.calories || 0);
      }

      const muscleMap: Record<string, Set<string>> = {};
      const weightTotalMap: Record<string, number> = {};
      for (const r of (weightsData || []) as any[]) {
        if (!muscleMap[r.date]) muscleMap[r.date] = new Set();
        if (!weightTotalMap[r.date]) weightTotalMap[r.date] = 0;
        const lbl = TYPE_LABEL[r.type];
        if (lbl) muscleMap[r.date].add(lbl);
        weightTotalMap[r.date] += Number(r.total_weight || 0);
      }

      const scoreMap: Record<string, number> = {};
      for (const r of (scoreData || []) as any[]) {
        if (!scoreMap[r.date]) {
          scoreMap[r.date] = Number(r.total_score || 0);
        }
      }

      const result: DayData[] = dates.map(date => ({
        date,
        calories: calMap[date] || 0,
        cardio: cardioMap[date] || {},
        muscleGroups: muscleMap[date] ? Array.from(muscleMap[date]) : [],
        totalWeightKg: weightTotalMap[date] || 0,
        totalScore: scoreMap[date] || 0,
      }));

      setDays(result);
    };
    load();
  }, []);

  if (days.length === 0) return null;

  return (
    <section>
      <div style={{
        fontSize: '1.15rem',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        textTransform: 'uppercase',
        color: '#ffffff',
        marginBottom: '1.25rem',
      }}>
        Daily
      </div>
      <div
        style={{
          display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', paddingTop: '28px',
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}
        className="hide-scrollbar"
      >
        {days.map((day, i) => <DayCard key={i} day={day} />)}
      </div>
    </section>
  );
};
