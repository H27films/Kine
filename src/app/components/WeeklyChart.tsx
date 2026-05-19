import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, malaysiaDateStr } from '../../lib/supabase';

export type ChartTab = 'Cardio' | 'Weights' | 'Calories' | 'Score';

export interface WeekData {
  weekNumber: number;
  days: number[];
}

interface CardioEntry {
  exercise_name: string;
  km: number;
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
  const [cardioEntries, setCardioEntries] = useState<CardioEntry[]>([]);

  function getCardioDayDate(weekNumber: number, dayIndex: number): string | null {
    const monday = new Date('2025-01-06T00:00:00Z');
    monday.setDate(monday.getDate() + (weekNumber - 1) * 7 + dayIndex);
    return malaysiaDateStr(monday);
  }

  useEffect(() => {
    if (!cardioDayDate) { setCardioEntries([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('km, exercises:exercise_id(exercise_name)')
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
            }))
            .sort((a, b) => a.exercise_name.localeCompare(b.exercise_name))
        );
      } else {
        setCardioEntries([]);
      }
    };
    load();
  }, [cardioDayDate]);

  const handleBarClick = (weekNumber: number, dayIndex: number) => {
    if (activeTab !== 'Cardio') return;
    const hit = cardioDayDate && controlledWeek === weekNumber;
    if (hit) { setCardioDayDate(null); return; }
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
  const onPrev = () => { if (canPrev) setWeek(allWeekNumbers[currentGlobalIdx + 1]); };
  const onNext = () => { if (canNext) setWeek(allWeekNumbers[currentGlobalIdx - 1]); };

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
    <div>
      {/* ── Weekly header ── */}
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

      {/* ── Card-box wrapper (one card — both chart layout + breakdown inside) ── */}
      <div style={{ background: 'rgba(0,0,0,0.05)', borderLeft: '2px solid rgba(0,0,0,0.9)', boxShadow: '0 5px 12px rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden' }}>

        {/* ── Chart area ── */}
        <div style={{ padding: '20px' }}>
          <div className="flex items-center mb-3">
            <div className="flex gap-4">
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
                    transition: 'all 0.15s',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-baseline gap-1 mb-5">
            <span style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#1a1a1a',
              lineHeight: 1,
            }}>
              {summaryParts.value}
            </span>
            {summaryParts.unit && (
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'rgba(26,26,26,0.45)',
                letterSpacing: '0.12em',
              }}>
                {summaryParts.unit}
              </span>
            )}
            {activeTab === 'Weights' && effectiveWeekNumber !== null && (() => {
              const exerciseTotal = (weightsExerciseCounts[effectiveWeekNumber] || []).reduce((s, c) => s + c, 0);
              return (
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', marginLeft: '8px', fontFamily: "'Archivo', sans-serif" }}>
                  <span style={{ color: '#1a1a1a' }}> / {exerciseTotal}</span>
                  <span style={{ color: 'rgba(26,26,26,0.45)' }}> EX</span>
                </span>
              );
            })()}
          </div>

          <div className="flex items-end justify-between h-44" style={{ gap: '12px' }}>
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
                  className="flex flex-col items-center h-full justify-end"
                  style={{ flex: '1', maxWidth: '28px', cursor: activeTab === 'Cardio' && val > 0 ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (activeTab === 'Cardio' && val > 0 && effectiveWeekNumber !== null) {
                      handleBarClick(effectiveWeekNumber, i);
                    }
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.85)', marginBottom: '4px', height: '14px', fontFamily: "'Archivo', sans-serif" }}>{barLabel}</div>
                  <div className="w-full relative transition-all" style={{ height: `${pct * 100}%`, backgroundColor: barColor, borderRadius: '9999px 9999px 0 0', minHeight: val > 0 ? '4px' : 0 }}>
                    {activeTab === 'Weights' && exerciseCount > 0 && (
                      <div style={{ position: 'absolute', bottom: '5px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#ffffff', lineHeight: 1, fontFamily: "'Archivo', sans-serif" }}>
                          {exerciseCount}
          </div>
        </div>

                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(26,26,26,0.85)', marginTop: '8px', fontFamily: "'Archivo', sans-serif" }}>{days[i]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Divider before breakdown ── */}
        {cardioDayDate && cardioEntries.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: '16px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(26,26,26,0.45)',
                  fontFamily: "'Archivo', sans-serif",
                }}
              >
                {(() => {
                  const d = new Date(cardioDayDate + 'T12:00:00Z');
                  const ms = d.getDay() === 0 ? 6 : d.getDay() - 1;
                  return DAY_LABELS[ms];
                })()}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1a1a1a',
                  fontFamily: "'Archivo', sans-serif",
                }}
              >
                {cardioDayDate}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cardioEntries.map((entry, i) => (
                <div
                  key={`${entry.exercise_name}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.6)',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', fontFamily: "'Archivo', sans-serif" }}>
                    {entry.exercise_name}
                  </span>
                  <span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#1a1a1a', fontFamily: "'Archivo', sans-serif" }}>
                      {entry.km}
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(26,26,26,0.4)', marginLeft: '3px', letterSpacing: '0.06em' }}>
                      KM
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
