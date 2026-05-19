import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, malaysiaDateStr } from '../../lib/supabase';
import { CARDIO_DISPLAY } from './CardioChartSection';

export type ChartTab = 'Cardio' | 'Weights' | 'Calories' | 'Score';

export interface WeekData {
  weekNumber: number;
  days: number[];
}

interface CardioEntry {
  exercise_name: string;
  km: number;
  time: string | null;
}

interface WeeklyChartProps {
  cardioWeeks: WeekData[];
  weightsWeeks: WeekData[];
  calorieWeeks: WeekData[];
  scoreWeeks: WeekData[];
  weightsExerciseCounts: Record<number, number[]>;
  selectedWeekNumber?: number | null;
  onWeekChange?: (week: number | null) => void;
}

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const parseTimeToHours = (time: string | null): number | null => {
  if (!time) return null;
  const parts = time.split(':');
  if (parts.length !== 3) return null;
  return parseFloat(parts[0]) + parseFloat(parts[1]) / 60 + parseFloat(parts[2]) / 3600;
};

const calculateSpeed = (km: number, time: string | null): number | null => {
  const hours = parseTimeToHours(time);
  if (!hours || hours === 0) return null;
  return km / hours;
};

export const WeeklyChart: React.FC<WeeklyChartProps> = ({
  cardioWeeks,
  weightsWeeks,
  calorieWeeks,
  scoreWeeks,
  weightsExerciseCounts,
  selectedWeekNumber: propWeek,
  onWeekChange,
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('Cardio');
  const [internalWeek, setInternalWeek] = useState<number | null>(null);
  const controlledWeek = propWeek !== undefined ? propWeek : internalWeek;
  const setWeek = onWeekChange || setInternalWeek;

  const [cardioDayDate, setCardioDayDate] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [openDayIndex, setOpenDayIndex] = useState<number | null>(null);
  const [cardioEntries, setCardioEntries] = useState<CardioEntry[]>([]);
  const [cardioLoading, setCardioLoading] = useState(false);
  const [cardioReady, setCardioReady] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);

  function getCardioDayDate(weekNumber: number, dayIndex: number): string | null {
    const monday = new Date('2025-01-06T00:00:00Z');
    monday.setDate(monday.getDate() + (weekNumber - 1) * 7 + dayIndex);
    return malaysiaDateStr(monday);
  }

  useEffect(() => {
    if (!cardioDayDate) { setCardioEntries([]); return; }
    const load = async () => {
      setCardioLoading(true);
      const { data } = await supabase
        .from('workouts')
        .select('km, time, exercises:exercise_id(exercise_name)')
        .eq('type', 'CARDIO')
        .eq('date', cardioDayDate)
        .not('km', 'is', null)
        .gt('km', 0)
        .order('exercise_id');
    
      if (data) {
        setCardioEntries(
          data
            .map((r: any) => ({
              exercise_name: r.exercises?.exercise_name || 'Unknown',
              km: Number(r.km),
              time: r.time ?? null,
            }))
            .sort((a, b) => {
              const aIsTracker = a.exercise_name.toUpperCase() === 'TRACKER';
              const bIsTracker = b.exercise_name.toUpperCase() === 'TRACKER';
              if (aIsTracker && !bIsTracker) return 1;
              if (!aIsTracker && bIsTracker) return -1;
              return a.exercise_name.localeCompare(b.exercise_name);
            })
        );
      } else {
        setCardioEntries([]);
      }
      setCardioLoading(false);
      setCardioReady(true);
    };
    load();
  }, [cardioDayDate]);

  useEffect(() => {
    if (!cardioDayDate) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (outerRef.current && !outerRef.current.contains(t)) {
        setClosing(true);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [cardioDayDate]);

  const handleBarClick = (weekNumber: number, dayIndex: number) => {
    if (activeTab !== 'Cardio') return;
  
    const isSameBar =
  cardioDayDate !== null &&
  effectiveWeekNumber === weekNumber &&
  openDayIndex === dayIndex;
  
    if (isSameBar) {
      setClosing(true);
      return;
    }
  
    setClosing(false);
    setOpenDayIndex(dayIndex);
    const date = getCardioDayDate(weekNumber, dayIndex);
    if (date) setCardioDayDate(date);
  };

  const chartConfig: Record<ChartTab, { weeks: WeekData[]; unit: string }> = {
    Cardio:   { weeks: cardioWeeks,  unit: 'km' },
    Weights:  { weeks: weightsWeeks, unit: 'kg' },
    Calories: { weeks: calorieWeeks, unit: '' },
    Score:    { weeks: scoreWeeks,   unit: '' },
  };

  const { weeks, unit } = chartConfig[activeTab];

  const allWeekNumbers = Array.from(
    new Set([
      ...cardioWeeks.map(w => w.weekNumber),
      ...weightsWeeks.map(w => w.weekNumber),
      ...calorieWeeks.map(w => w.weekNumber),
      ...scoreWeeks.map(w => w.weekNumber),
    ])
  ).sort((a, b) => b - a);

  const effectiveWeekNumber = controlledWeek ?? (allWeekNumbers[0] ?? null);
  const current = weeks.find(w => w.weekNumber === effectiveWeekNumber) ?? null;
  const data = current?.days || Array(7).fill(0);
  const rawMax = Math.max(...data, 1);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekLabel = effectiveWeekNumber !== null ? `${effectiveWeekNumber}` : '\u2014';

  const currentGlobalIdx = effectiveWeekNumber !== null ? allWeekNumbers.indexOf(effectiveWeekNumber) : 0;
  const canPrev = currentGlobalIdx < allWeekNumbers.length - 1;
  const canNext = currentGlobalIdx > 0;
  const onPrev = () => { if (canPrev) { setWeek(allWeekNumbers[currentGlobalIdx + 1]); setOpenDayIndex(null); setCardioDayDate(null); setClosing(false); } };
const onNext = () => { if (canNext) { setWeek(allWeekNumbers[currentGlobalIdx - 1]); setOpenDayIndex(null); setCardioDayDate(null); setClosing(false); } };

  const yMin = activeTab === 'Cardio' ? 5 : activeTab === 'Calories' ? 500 : 0;
  const yMax = activeTab === 'Cardio' ? 20 : activeTab === 'Score' ? Math.max(rawMax, 100) : rawMax;

  const summaryParts = (() => {
    const nonZero = data.filter(v => v > 0);
    const total = data.reduce((s, v) => s + v, 0);
    if (activeTab === 'Cardio') {
      return { value: total > 0 ? total.toFixed(1) : '0.0', unit: 'KM' };
    } else if (activeTab === 'Weights') {
      const k = total / 1000;
      return { value: total > 0 ? (k >= 10 ? `${Math.round(k)}K` : `${k.toFixed(1)}K`) : '0K', unit: '' };
    } else if (activeTab === 'Calories') {
      if (nonZero.length === 0) return { value: '\u2014', unit: 'Kcal' };
      const avg = Math.round(total / nonZero.length);
      return { value: avg.toLocaleString(), unit: 'Kcal' };
    } else {
      if (nonZero.length === 0) return { value: '\u2014', unit: '' };
      const avg = Math.round(total / nonZero.length);
      return { value: avg.toLocaleString(), unit: 'pts' };
    }
  })();

  return (
    <div ref={outerRef}>
      {/* ── Weekly heading (outside card, same as original) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#1a1a1a',
            fontFamily: "'Archivo', sans-serif",
          }}>Weekly</span>
          <button onClick={onPrev} disabled={!canPrev} style={{ opacity: !canPrev ? 0.2 : 0.9, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={18} color="#1a1a1a" />
          </button>
          <button onClick={onNext} disabled={!canNext} style={{ opacity: !canNext ? 0.2 : 0.9, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={18} color="#1a1a1a" />
          </button>
        </div>
        <span style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: '#1a1a1a',
          marginRight: '6px',
        }}>{weekLabel}</span>
      </div>

      {/* ── Single card box — MonthlyCalendarChart template ── */}
      <div style={{ background: 'rgba(0,0,0,0.05)', borderLeft: '2px solid rgba(0,0,0,0.9)', boxShadow: '0 5px 12px rgba(0,0,0,0.08)', borderRadius: 8, padding: '32px 24px 20px 24px' }}>

        {/* ── Tabs ── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {(['Cardio', 'Weights', 'Calories', 'Score'] as ChartTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  paddingBottom: '4px',
                  color: activeTab === tab ? '#1a1a1a' : 'rgba(26,26,26,0.35)',
                  borderBottom: activeTab === tab ? '2px solid #1a1a1a' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  marginRight: '20px',
                  fontFamily: "'Archivo', sans-serif",
                  transition: 'all 0.15s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Summary value ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '30px' }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#1a1a1a', lineHeight: 1, fontFamily: "'Archivo', sans-serif" }}>
            {summaryParts.value}
          </span>
          {summaryParts.unit && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.45)', letterSpacing: '0.12em', fontFamily: "'Archivo', sans-serif" }}>
              {summaryParts.unit}
            </span>
          )}
          {activeTab === 'Weights' && effectiveWeekNumber !== null && (() => {
            const exerciseTotal = (weightsExerciseCounts[effectiveWeekNumber] || []).reduce((s, c) => s + c, 0);
            return (
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Archivo', sans-serif" }}>
                <span style={{ color: '#1a1a1a' }}> / {exerciseTotal}</span>
                <span style={{ color: 'rgba(26,26,26,0.45)' }}> EX</span>
              </span>
            );
          })()}
        </div>

        {/* ── Bar chart row ── */}
          <div            className="flex items-end justify-between h-44" style={{ gap: '12px', marginBottom: '16px', marginTop: '20px' }}>
          {data.map((val, i) => {
            const clampedVal = Math.min(Math.max(val, yMin), yMax);
            const pct = val > 0 ? Math.max((clampedVal - yMin) / (yMax - yMin), 0.04) : 0;
            const rawPct = rawMax > 0 ? val / rawMax : 0;
            const brightness = Math.round(210 - rawPct * 180);
            const barColor = val > 0 ? `rgb(${brightness},${brightness},${brightness})` : 'rgba(26,26,26,0.04)';
            let barLabel = '';
            if (val > 0) {
              if (unit === 'kg') { barLabel = `${Math.round(val / 1000)}k`; }
              else if (unit === 'km') { barLabel = `${+val.toFixed(1)}`; }
              else { barLabel = `${Math.round(val)}`; }
            }
            const exerciseCount = activeTab === 'Weights' && effectiveWeekNumber !== null
              ? (weightsExerciseCounts[effectiveWeekNumber]?.[i] ?? 0)
              : 0;
            return (
              <div
                key={i}
                className="flex h-full flex-col items-center justify-end"
                style={{ flex: '1', maxWidth: '28px', cursor: activeTab === 'Cardio' && val > 0 ? 'pointer' : 'default' }}
                onClick={() => {
                  if (activeTab === 'Cardio' && val > 0 && effectiveWeekNumber !== null) {
                    handleBarClick(effectiveWeekNumber, i);
                  }
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.85)', marginBottom: '4px', height: '14px', fontFamily: "'Archivo', sans-serif" }}>{barLabel}</div>
                <div className="relative w-full rounded-t-[9999px] transition-all"
                  style={{
                    backgroundColor: barColor,
                    height: val > 0 ? `${Math.max(pct * 100, 0.04)}%` : '4px',
                    width: '100%',
                  }}>
                  {activeTab === 'Weights' && exerciseCount > 0 && (
                    <div style={{ position: 'absolute', bottom: '5px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#ffffff', lineHeight: 1, fontFamily: "'Archivo', sans-serif" }}>
                        {exerciseCount}
                      </div>
                    </div>
                  )}
                </div>
                 <div style={{
  fontSize: '8px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: openDayIndex === i ? '#ffffff' : 'rgba(26,26,26,0.85)',
  marginTop: '8px',
  fontFamily: "'Archivo', sans-serif",
  padding: '2px 5px',
  borderRadius: '999px',
  background: openDayIndex === i ? 'rgba(0,0,0,0.85)' : 'transparent',
  boxShadow: openDayIndex === i ? '0 3px 6px rgba(0,0,0,0.18)' : 'none',
  transition: 'all 0.2s',
}}>{days[i]}</div>
              </div>
            );
          })}
        </div>

        {/* ── Cardio Day Breakdown (expanded inside the same card) ── */}
        {cardioDayDate && cardioReady && (
          <div
            className={closing ? 'fade-out-block' : 'fade-in-block'}
            onAnimationEnd={() => { if (closing) { setCardioDayDate(null); setOpenDayIndex(null); setCardioReady(false); setClosing(false); } }}
            onMouseDown={e => { e.stopPropagation(); setClosing(true); }}
            style={{ borderTop: '1px solid rgba(0,0,0,0.75)', padding: '20px 0 0', willChange: 'opacity, transform', cursor: 'pointer' }}
          >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', letterSpacing: '0.04em', fontFamily: "'Archivo', sans-serif" }}>
                    {(() => {
                      const d = new Date(cardioDayDate + 'T12:00:00Z');
                      const ms = d.getDay() === 0 ? 6 : d.getDay() - 1;
                      const day = DAY_LABELS[ms];
                      const date = d.getDate();
                      const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                      return `${day} ${date} ${month}`;
                    })()}
                  </span>
                </div>
                {(() => {
                  const normal = cardioEntries.filter(e => e.exercise_name.toUpperCase() !== 'TRACKER');
                  const trackers = cardioEntries.filter(e => e.exercise_name.toUpperCase() === 'TRACKER');
                  return (
                    <>
                      {normal.map((entry, i) => (
                        <div
                          key={`normal-${entry.exercise_name}-${i}`}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 500, color: '#1a1a1a', fontFamily: "'Archivo', sans-serif", letterSpacing: '0.02em' }}>
                            {entry.exercise_name ? entry.exercise_name.charAt(0).toUpperCase() + entry.exercise_name.slice(1).toLowerCase() : ''}
                            {(() => {
                              const key = entry.exercise_name.toUpperCase();
                              const display = CARDIO_DISPLAY[key];
                              return display ? <span style={{ color: '#1a1a1a', display: 'flex', marginLeft: '8px', opacity: 0.9 }}>{display.icon}</span> : null;
                            })()}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(26,26,26,0.4)', letterSpacing: '0.04em', fontFamily: "'Archivo', sans-serif" }}>
                            {entry.exercise_name.toUpperCase() === 'RUNNING'
                              ? (() => {
                                  const spd = calculateSpeed(entry.km, entry.time);
                                  if (spd === null) return null;
                                  return (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginRight: '6px' }}>
                                      <span style={{ fontSize: '11px', color: 'rgba(26,26,26,0.9)', fontWeight: 500, fontFamily: "'Archivo', sans-serif" }}>{spd.toFixed(1)}</span>
                                      <span style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(26,26,26,0.4)', letterSpacing: '0.04em', fontFamily: "'Archivo', sans-serif" }}>km/h</span>
                                    </span>
                                  );
                                })()
                              : null}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 550, color: '#1a1a1a', fontFamily: "'Archivo', sans-serif" }}>{entry.km.toFixed(1)}</span>
                              <span style={{ fontSize: '8px', fontWeight: 500, color: 'rgba(26,26,26,0.4)', letterSpacing: '0.04em' }}>KM</span>
                            </span>
                          </span>
                        </div>
                      ))}
                      {trackers.map((entry, i) => (
                          <div
                            key={`tracker-${entry.exercise_name}-${i}`}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '3px 6px 2px 6px',
                              borderRadius: '6px',
                              background: 'rgba(255,255,255,0.4)',
                              marginLeft: '-6px', marginRight: '-6px', marginTop: '3px',
                            }}
                          >
                          <span style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 500, color: '#1a1a1a', fontFamily: "'Archivo', sans-serif", letterSpacing: '0.02em' }}>
                            {entry.exercise_name ? entry.exercise_name.charAt(0).toUpperCase() + entry.exercise_name.slice(1).toLowerCase() : ''}
                            {(() => {
                              const key = entry.exercise_name.toUpperCase();
                              const display = CARDIO_DISPLAY[key];
                              return display ? <span style={{ color: '#1a1a1a', display: 'flex', marginLeft: '8px', opacity: 0.9 }}>{display.icon}</span> : null;
                            })()}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(26,26,26,0.4)', letterSpacing: '0.04em', fontFamily: "'Archivo', sans-serif" }}>
                            {entry.exercise_name.toUpperCase() === 'RUNNING'
                              ? (() => {
                                  const spd = calculateSpeed(entry.km, entry.time);
                                  if (spd === null) return null;
                                  return (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginRight: '6px' }}>
                                      <span style={{ fontSize: '11px', color: 'rgba(26,26,26,0.9)', fontWeight: 500, fontFamily: "'Archivo', sans-serif" }}>{spd.toFixed(1)}</span>
                                      <span style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(26,26,26,0.4)', letterSpacing: '0.04em', fontFamily: "'Archivo', sans-serif" }}>km/h</span>
                                    </span>
                                  );
                                })()
                              : null}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 550, color: '#1a1a1a', fontFamily: "'Archivo', sans-serif" }}>{entry.km.toFixed(1)}</span>
                              <span style={{ fontSize: '8px', fontWeight: 500, color: 'rgba(26,26,26,0.4)', letterSpacing: '0.04em' }}>KM</span>
                            </span>
                          </span>
                        </div>
                      ))}
                    </>
                  );
                })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
