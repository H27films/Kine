import React, { useState, useEffect } from 'react';
import { Database } from 'lucide-react';
import { supabase, getISOWeek } from '../../lib/supabase';

interface WorkoutRow {
  id: number;
  date: string;
  type: string;
  exercise_id: number | null;
  exercise_name: string;
  km: number | null;
  calories: number | null;
  food_rating: string | null;
  time: string | null;
}

interface WorkoutsDataCompactProps {
  onOpenWorkoutsData: () => void;
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const FOOD_EXERCISE_ID = 89;
const CALORIES_EXERCISE_ID = 90;
const TRACKER_EXERCISE_ID = 82;

const twoDaysAgo = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTime = (time: string): string => {
  const parts = time.split(':');
  if (parts.length !== 3) return time;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return `${h * 60 + m}:${parts[2]}`;
};

// Icon components (26×26)
const RunIcon: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="18" width="35" height="3" rx="1.5" fill="#1a1a1a"/>
    <rect x="15" y="28" width="25" height="3" rx="1.5" fill="#1a1a1a"/>
    <rect x="5"  y="38" width="30" height="3" rx="1.5" fill="#1a1a1a"/>
    <rect x="20" y="48" width="25" height="3" rx="1.5" fill="#1a1a1a"/>
    <rect x="15" y="58" width="25" height="3" rx="1.5" fill="#1a1a1a"/>
    <circle cx="72" cy="22" r="6" fill="#1a1a1a"/>
    <path d="M48 38L65 28L75 35L85 45" stroke="#1a1a1a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M65 28L55 45L40 38"        stroke="#1a1a1a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M55 45L65 65L70 85"        stroke="#1a1a1a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M55 45L45 55L22 62"        stroke="#1a1a1a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RowingIcon: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="25" r="5" fill="#1a1a1a"/>
    <path d="M50 30L45 50L55 55L65 45" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M45 50L40 60H55"          stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M65 45L75 45V35"          stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M30 65H80"                stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round"/>
  </svg>
);

const FootstepsIcon: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 70C40 80 30 85 25 80C20 75 25 60 30 50C35 40 45 40 45 50C45 60 40 60 40 70Z" fill="#1a1a1a"/>
    <circle cx="25" cy="40" r="3" fill="#1a1a1a"/>
    <circle cx="32" cy="35" r="3" fill="#1a1a1a"/>
    <circle cx="40" cy="35" r="3" fill="#1a1a1a"/>
    <circle cx="48" cy="40" r="3" fill="#1a1a1a"/>
    <path d="M60 70C60 80 70 85 75 80C80 75 75 60 70 50C65 40 55 40 55 50C55 60 60 60 60 70Z" fill="#1a1a1a"/>
    <circle cx="75" cy="40" r="3" fill="#1a1a1a"/>
    <circle cx="68" cy="35" r="3" fill="#1a1a1a"/>
    <circle cx="60" cy="35" r="3" fill="#1a1a1a"/>
    <circle cx="52" cy="40" r="3" fill="#1a1a1a"/>
  </svg>
);

const CycleIcon: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="25" cy="70" r="15" stroke="#1a1a1a" strokeWidth="5"/>
    <circle cx="75" cy="70" r="15" stroke="#1a1a1a" strokeWidth="5"/>
    <path d="M25 70L45 45H65L75 70" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M45 45L55 30H65"       stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="55" cy="25" r="4" fill="#1a1a1a"/>
  </svg>
);

const CrossTrainerIcon: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="75" width="50" height="8" fill="#1a1a1a"/>
    <rect x="35" y="70" width="35" height="5" fill="#1a1a1a"/>
    <rect x="56" y="65" width="14" height="5" fill="#1a1a1a"/>
    <path d="M62 65V45L68 40" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="47" cy="23" r="6" fill="#1a1a1a"/>
    <path d="M47 28L40 45"    stroke="#1a1a1a" strokeWidth="9" strokeLinecap="round"/>
    <path d="M47 30L55 38L60 38" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M47 30L35 35L28 42" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M40 45L45 55L52 65" stroke="#1a1a1a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M40 45L35 60L28 70" stroke="#1a1a1a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CaloriesIconSvg: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 505 600" preserveAspectRatio="xMidYMid meet" fill="#1a1a1a">
    <g transform="translate(0,600) scale(0.1,-0.1)">
      <path d="M2875 5216 c-543 -190 -1028 -489 -1411 -871 -377 -375 -614 -788 -733 -1275 -49 -202 -62 -316 -68 -565 -5 -202 -3 -245 15 -350 85 -498 395 -930 836 -1166 51 -27 100 -49 110 -49 24 0 66 45 66 71 0 12 -20 53 -44 93 -110 176 -136 375 -90 691 72 497 359 942 797 1236 93 62 114 71 102 42 -32 -77 -88 -259 -110 -358 -33 -146 -44 -366 -25 -496 26 -182 107 -353 225 -476 81 -84 94 -88 171 -43 95 54 173 168 210 305 21 81 30 325 15 439 -7 48 -10 91 -7 93 9 9 126 -179 181 -292 83 -169 108 -263 108 -415 1 -271 -74 -465 -271 -700 -56 -66 -72 -92 -72 -117 0 -34 18 -58 51 -68 52 -17 312 150 467 299 259 249 409 521 483 876 30 142 33 457 5 595 -39 199 -107 359 -227 537 -55 83 -116 163 -426 560 -132 168 -179 294 -204 538 -19 191 2 493 51 729 25 116 25 144 3 163 -34 30 -58 27 -208 -26z"/>
    </g>
  </svg>
);

const FoodIcon: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 15v30c0 8 6 14 14 14h4v26h8V59h4c8 0 14-6 14-14V15h-6v30h-6V15h-6v30h-6V15H20z" fill="#1a1a1a"/>
    <path d="M70 15v70h6V15h-6z" fill="#1a1a1a"/>
  </svg>
);

type ExerciseIconKey = 'running' | 'rowing' | 'walking' | 'cycling' | 'crosstrainer' | 'calories' | 'food';

const EXERCISE_ICON_MAP: Record<number, ExerciseIconKey> = {
  82: 'walking',      // Tracker → footsteps
  83: 'rowing',       // Rowing
  84: 'running',      // Running
  85: 'walking',      // Walking → footsteps
  86: 'crosstrainer', // CrossTrainer
  87: 'cycling',      // Ride / Cycle
  89: 'food',         // Food
  90: 'calories',     // Calories
};

const ICON_COMPONENTS: Record<ExerciseIconKey, React.FC> = {
  running: RunIcon,
  rowing: RowingIcon,
  walking: FootstepsIcon,
  cycling: CycleIcon,
  crosstrainer: CrossTrainerIcon,
  calories: CaloriesIconSvg,
  food: FoodIcon,
};

const WorkoutsDataCompact: React.FC<WorkoutsDataCompactProps> = ({ onOpenWorkoutsData }) => {
  const [rows, setRows] = useState<WorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const minDate = twoDaysAgo();
      const { data } = await supabase
        .from('workouts')
        .select(`
          id, date, type, exercise_id, km, calories, food_rating,
          time,
          exercises:exercise_id(exercise_name)
        `)
        .in('type', ['CARDIO', 'MEASUREMENT'])
        .gte('date', minDate)
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .limit(200);

      if (data) {
        const mapped = (data as any[]).map(r => ({
          id: r.id,
          date: r.date,
          type: r.type,
          exercise_id: r.exercise_id,
          exercise_name: r.exercises?.exercise_name || 'Unknown',
          km: r.km,
          calories: r.calories,
          food_rating: r.food_rating,
          time: r.time,
        }));
        mapped.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          const order = (r: typeof a) => {
            if (r.exercise_id === FOOD_EXERCISE_ID) return 3;
            if (r.exercise_id === CALORIES_EXERCISE_ID) return 4;
            if (r.exercise_id === TRACKER_EXERCISE_ID) return 5;
            if (r.type === 'CARDIO') return 0;
            return 1; // other MEASUREMENT
          };
          const oa = order(a);
          const ob = order(b);
          if (oa !== ob) return oa - ob;
          return b.id - a.id;
        });
        setRows(mapped);
      }
      setLoading(false);
    };
    load();
  }, []);

  const getPrimaryValue = (row: WorkoutRow): { value: string; label: string } | null => {
    if (row.exercise_id === CALORIES_EXERCISE_ID) {
      return row.calories != null ? { value: String(row.calories), label: 'KCAL' } : null;
    }
    if (row.exercise_id === FOOD_EXERCISE_ID) {
      return row.food_rating ? { value: row.food_rating.toUpperCase(), label: '' } : null;
    }
    if (row.km != null) {
      return { value: String(row.km), label: 'KM' };
    }
    return null;
  };

  // Group by date — only keep the 2 most recent dates
  const grouped: { date: string; rows: WorkoutRow[] }[] = [];
  rows.forEach(r => {
    const last = grouped[grouped.length - 1];
    if (last && last.date === r.date) {
      last.rows.push(r);
    } else if (grouped.length < 2) {
      grouped.push({ date: r.date, rows: [r] });
    }
  });

  const getIcon = (exerciseId: number | null): React.ReactNode => {
    if (exerciseId == null) return null;
    const key = EXERCISE_ICON_MAP[exerciseId];
    if (!key) return null;
    const IconComp = ICON_COMPONENTS[key];
    return <IconComp />;
  };

  const valueStyle: React.CSSProperties = {
    fontWeight: 650,
    fontSize: '0.85rem',
    color: '#1a1a1a',
    letterSpacing: '-0.02em',
    lineHeight: 1,
    fontFamily: "'Archivo', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    color: 'rgba(26,26,26,0.6)',
    fontWeight: 500,
    fontSize: '0.55rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontFamily: "'Archivo', sans-serif",
  };

  return (
    <div>
      {/* Header */}
      <div
        onClick={onOpenWorkoutsData}
        style={{ cursor: 'pointer', marginBottom: '1rem' }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={20} color="#1a1a1a" />
            <span style={{
              fontSize: '1.1rem',
              fontWeight: 550,
              letterSpacing: '0em',
              textTransform: 'uppercase',
              color: '#1a1a1a',
              fontFamily: "'Archivo', sans-serif",
            }}>
              Workouts Data
            </span>
          </div>
          <svg width="22" height="12" viewBox="0 0 40 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 6H34M34 6L25 1M34 6L25 11" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Data rows */}
      <div className="space-y-3" style={{ fontFamily: "'Archivo', sans-serif" }}>
        {loading ? (
          <div style={{ fontSize: '0.8rem', color: 'rgba(26,26,26,0.35)', fontFamily: "'Archivo', sans-serif" }}>
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'rgba(26,26,26,0.35)', fontFamily: "'Archivo', sans-serif" }}>
            No data in last 2 days
          </div>
        ) : (
          grouped.map((group, groupIdx) => (
            <React.Fragment key={group.date}>
              {/* Separator line between date groups */}
              {groupIdx > 0 && (
                <div style={{ height: '16px', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', height: '1px', backgroundColor: '#1a1a1a', opacity: 0.8 }} />
                </div>
              )}
              {/* Date header above each date group */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '10px',
              }}>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 550,
                  letterSpacing: '0.06em',
                  color: '#1a1a1a',
                  textTransform: 'uppercase',
                  fontFamily: "'Archivo', sans-serif",
                }}>
                  {(() => {
                    const d = new Date(group.date + 'T00:00:00');
                    const day = d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
                    const date = d.getDate();
                    const month = MONTH_NAMES[d.getMonth()];
                    return `${day} ${date} ${month}`;
                  })()}
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: 'rgba(26,26,26,0.5)',
                  fontFamily: "'Archivo', sans-serif",
                }}>
                  W{getISOWeek(new Date(group.date + 'T00:00:00'))}
                </span>
              </div>
              {group.rows.map(row => {
                const primary = getPrimaryValue(row);
                const icon = getIcon(row.exercise_id);
                return (
                  <div
                    key={row.id}
                    onClick={onOpenWorkoutsData}
                    style={{
                      borderRadius: '10px',
                      background: (row.exercise_id === FOOD_EXERCISE_ID || row.exercise_id === CALORIES_EXERCISE_ID || row.exercise_id === TRACKER_EXERCISE_ID) ? 'linear-gradient(135deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.12) 100%)' : 'rgba(0,0,0,0.05)',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                      padding: '7px 12px',
                      cursor: 'pointer',
                      fontFamily: "'Archivo', sans-serif",
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                    }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        backgroundColor: 'rgba(0,0,0,0.04)',
                      }}>
                        {icon || (
                          <span style={{
                            fontSize: '0.6rem', fontWeight: 800, color: '#1a1a1a',
                            fontFamily: "'Archivo', sans-serif",
                          }}>
                            {row.exercise_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontWeight: 600, fontSize: '12px', color: '#1a1a1a',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          fontFamily: "'Archivo', sans-serif",
                        }}>
                          {row.exercise_name}
                        </p>
                        {row.time && (
                          <p style={{
                            fontSize: '9px', fontWeight: 500, letterSpacing: '0.08em',
                            color: 'rgba(26,26,26,0.6)', marginTop: '1px',
                            fontFamily: "'Archivo', sans-serif",
                          }}>
                            {formatTime(row.time)}
                          </p>
                        )}
                      </div>
                      {primary && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', flexShrink: 0 }}>
                          <span style={valueStyle}>{primary.value}</span>
                          {primary.label && <span style={labelStyle}>{primary.label}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkoutsDataCompact;