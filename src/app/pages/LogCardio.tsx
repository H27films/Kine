import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Page } from '../../types';
import { supabase, Exercise, todayStr, getISOWeek, getDayName, currentWeekMonday, recalculateDailyTotals } from '../../lib/supabase';
import { CardioTypeChart } from '../components/CardioTypeChart';

interface LogCardioProps {
  onNavigate: (page: Page) => void;
}

const tabs: { label: string; page: Page }[] = [
  { label: 'Weights', page: 'weights' },
  { label: 'Cardio', page: 'cardio' },
  { label: 'Calories', page: 'calories' },
];

// Same IDs as Dashboard TOTAL_CARDIO_IDS: Tracker=82, Row=83, Cycle=87
const TOTAL_CARDIO_IDS = [82, 83, 87];

export const LogCardio: React.FC<LogCardioProps> = ({ onNavigate }) => {
  const [trackerDistance, setTrackerDistance] = useState('');
  const [distance, setDistance] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  const [nonTrackerExercises, setNonTrackerExercises] = useState<Exercise[]>([]);
  const [trackerExercise, setTrackerExercise] = useState<Exercise | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [weeklyTotal, setWeeklyTotal] = useState<number>(0);

  const [weekChartData, setWeekChartData] = useState<number[]>(Array(7).fill(0));
  const [thirtyDayData, setThirtyDayData] = useState<{ date: string; total: number }[]>([]);
  const [thirtyDayOffset, setThirtyDayOffset] = useState(0);
  const [hasOlderCardioData, setHasOlderCardioData] = useState(false);
  const [trackerInputVisible, setTrackerInputVisible] = useState(false);

  const isRunning = selectedExercise?.exercise_name?.toUpperCase() === 'RUNNING';

  useEffect(() => {
    const loadExercises = async () => {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .eq('type', 'CARDIO')
        .order('exercise_name');
      if (data) {
        const exercises = data as Exercise[];
        const tracker = exercises.find(e => e.exercise_name?.toUpperCase() === 'TRACKER');
        if (tracker) setTrackerExercise(tracker);
        const others = exercises.filter(e => e.exercise_name?.toUpperCase() !== 'TRACKER');
        setNonTrackerExercises(others);
        if (others.length > 0) setSelectedExercise(others[0]);
      }
    };
    loadExercises();
  }, []);

  useEffect(() => {
    const loadWeeklyTotal = async () => {
      const thisMonday = currentWeekMonday();
      const { data } = await supabase
        .from('workouts')
        .select('total_cardio')
        .eq('type', 'CARDIO')
        .in('exercise_id', TOTAL_CARDIO_IDS)
        .gte('date', thisMonday);
      if (data) {
        const total = (data as any[]).reduce((sum, r) => sum + Number(r.total_cardio || 0), 0);
        setWeeklyTotal(+total.toFixed(2));
      }
    };
    loadWeeklyTotal();
  }, [saveSuccess]);

  const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  useEffect(() => {
    const loadWeekChart = async () => {
      const thisMonday = currentWeekMonday();
      const { data } = await supabase
        .from('workouts')
        .select('day, total_cardio')
        .eq('type', 'CARDIO')
        .in('exercise_id', TOTAL_CARDIO_IDS)
        .gte('date', thisMonday)
        .not('day', 'is', null);
      if (data) {
        const days = Array(7).fill(0);
        (data as any[]).forEach(r => {
          const idx = DAY_ORDER.indexOf((r.day || '').toUpperCase());
          if (idx >= 0) days[idx] = +(days[idx] + Number(r.total_cardio || 0)).toFixed(2);
        });
        setWeekChartData(days);
      }
    };
    loadWeekChart();
  }, [saveSuccess]);

  useEffect(() => {
    const load30Day = async () => {
      const localStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const toD = new Date();
      toD.setDate(toD.getDate() - thirtyDayOffset * 30);
      const fromD = new Date(toD);
      fromD.setDate(fromD.getDate() - 29);
      const fromDate = localStr(fromD);
      const toDate = localStr(toD);
      const { data } = await supabase
        .from('workouts')
        .select('date, total_cardio')
        .eq('type', 'CARDIO')
        .in('exercise_id', TOTAL_CARDIO_IDS)
        .gte('date', fromDate)
        .lte('date', toDate);
      if (data) {
        const byDate: Record<string, number> = {};
        (data as any[]).forEach(r => {
          byDate[r.date] = (byDate[r.date] || 0) + Number(r.total_cardio || 0);
        });
        const result: { date: string; total: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const dd = new Date(toD);
          dd.setDate(dd.getDate() - i);
          const dateStr = localStr(dd);
          result.push({ date: dateStr, total: +(byDate[dateStr] || 0).toFixed(2) });
        }
        setThirtyDayData(result);
        // Check if older data exists beyond this window
        const olderTo = new Date(fromD);
        olderTo.setDate(olderTo.getDate() - 1);
        const { data: olderCheck } = await supabase
          .from('workouts')
          .select('date')
          .eq('type', 'CARDIO')
          .in('exercise_id', TOTAL_CARDIO_IDS)
          .lte('date', localStr(olderTo))
          .limit(1);
        setHasOlderCardioData(!!(olderCheck && olderCheck.length > 0));
      }
    };
    load30Day();
  }, [saveSuccess, thirtyDayOffset]);

  const handleCommit = async () => {
    const hasTracker = trackerExercise && trackerDistance && parseFloat(trackerDistance) > 0;
    const hasExercise = selectedExercise && distance && parseFloat(distance) > 0;
    if (!hasTracker && !hasExercise) return;

    setSaving(true);
    setSaveError('');
    try {
      const today = todayStr();
      const week = getISOWeek();
      const day = getDayName();

      if (hasTracker && trackerExercise) {
        const km = parseFloat(trackerDistance);
        const totalCardio = +(km * Number(trackerExercise.multiplier)).toFixed(2);
        const { error } = await supabase.from('workouts').insert({
          date: today, week, day, type: 'CARDIO',
          exercise_id: trackerExercise.id,
          km, total_cardio: totalCardio,
          multiplier: trackerExercise.multiplier,
          total_score_k: Math.round(totalCardio * 1000),
          new_entry: 'New', source: 'app',
        });
        if (error) throw error;
      }

      if (hasExercise && selectedExercise) {
        const km = parseFloat(distance);
        const totalCardio = +(km * Number(selectedExercise.multiplier)).toFixed(2);
        const timeStr = isRunning && (minutes || seconds)
          ? `00:${(minutes || '0').padStart(2, '0')}:${(seconds || '0').padStart(2, '0')}`
          : null;
        const { error } = await supabase.from('workouts').insert({
          date: today, week, day, type: 'CARDIO',
          exercise_id: selectedExercise.id,
          km, total_cardio: totalCardio,
          multiplier: selectedExercise.multiplier,
          time: timeStr,
          total_score_k: Math.round(totalCardio * 1000),
          new_entry: 'New', source: 'app',
        });
        if (error) throw error;
      }

      await recalculateDailyTotals(today);
      setSaveSuccess(true);
      setTrackerDistance('');
      setDistance('');
      setMinutes('');
      setSeconds('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    color: '#c6c6c6',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3em',
    fontWeight: 700,
  };

  const separatorStyle = {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(71,71,71,0.35)',
    marginTop: 8,
  };

  const hasAnyInput =
    (trackerDistance && parseFloat(trackerDistance) > 0) ||
    (distance && parseFloat(distance) > 0);

  // 30-day period label
  const periodLabel = thirtyDayOffset === 0
    ? '30 DAYS'
    : thirtyDayOffset === 1
    ? 'PREVIOUS 30 DAYS'
    : `PREVIOUS 30 DAYS ${'+'.repeat(thirtyDayOffset - 1)}`;

  // 30-day chart calculations
  const activeDays = thirtyDayData.filter(d => d.total > 0);
  const avg30 = activeDays.length > 0
    ? +(activeDays.reduce((s, d) => s + d.total, 0) / activeDays.length).toFixed(1)
    : 0;
  const total30 = +(activeDays.reduce((s, d) => s + d.total, 0)).toFixed(1);
  const max30 = thirtyDayData.length > 0 ? Math.max(...thirtyDayData.map(d => d.total)) : 0;
  const maxIdx30 = thirtyDayData.findIndex(d => d.total === max30 && max30 > 0);

  return (
    <div>
      <nav className="flex gap-8 mb-12 items-end">
        {tabs.map(tab => {
          const isActive = tab.page === 'cardio';
          return (
            <button key={tab.page} onClick={() => onNavigate(tab.page)} className="flex flex-col items-center" style={{ filter: isActive ? 'none' : 'blur(0.4px)' }}>
              <span className="uppercase tracking-widest transition-all"
                style={{ color: isActive ? '#ffffff' : 'rgba(226,226,226,0.65)', fontWeight: isActive ? 900 : 400, fontSize: isActive ? '0.875rem' : '0.65rem', letterSpacing: '0.15em' }}>
                {tab.label}
              </span>
              {isActive && <div className="h-1 w-1 rounded-full mt-1" style={{ backgroundColor: '#ffffff' }} />}
            </button>
          );
        })}
      </nav>

      {/* Header: TRACKER row, full-width chart, full-width input */}
      <header className="mb-6">

        {/* Row 1: TRACKER left (tappable), weekly total right */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1
            className="text-[2rem] font-black tracking-tighter leading-none text-white"
            style={{ cursor: 'pointer' }}
            onClick={() => setTrackerInputVisible(v => !v)}
          >TRACKER</h1>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {weeklyTotal.toFixed(1)}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>(KM)</span>
          </div>
        </div>

        {/* Row 2: full-width sparkline */}
        <div style={{ width: '100%' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {(() => {
              const sparkData = weekChartData;
              const sparkDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
              const BASE_KM = 1;
              const VW = 200;
              const VH = 90;
              const padTop = 22;
              const padBottom = 8;
              const padLeft = 6;
              const padRight = 6;
              const chartW = VW - padLeft - padRight;
              const chartH = VH - padTop - padBottom;
              const maxVal = Math.max(...sparkData.filter(v => v > 0), BASE_KM, 0.1);
              const getY = (val: number) => padTop + (1 - val / maxVal) * chartH;
              const lineVals: (number | null)[] = sparkData.map((val, i) => {
                if (val > 0) return val;
                if (i === 0 || i === 6) return BASE_KM;
                return null;
              });
              const linePts = lineVals
                .map((val, i) =>
                  val !== null
                    ? { x: padLeft + (i / 6) * chartW, y: getY(val), val, i, isAnchor: sparkData[i] === 0 }
                    : null
                )
                .filter((p): p is { x: number; y: number; val: number; i: number; isAnchor: boolean } => p !== null);
              let pathD = '';
              if (linePts.length === 1) {
                pathD = `M ${linePts[0].x} ${linePts[0].y}`;
              } else if (linePts.length > 1) {
                pathD = `M ${linePts[0].x} ${linePts[0].y}`;
                for (let k = 1; k < linePts.length; k++) {
                  const prev = linePts[k - 1];
                  const curr = linePts[k];
                  const cpx = (prev.x + curr.x) / 2;
                  pathD += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
                }
              }
              return (
                <svg width="100%" viewBox={`0 0 ${VW} ${VH + 14}`} style={{ overflow: 'visible', display: 'block' }}>
                  <defs>
                    <filter id="lcLineBlur1" x="-50%" y="-100%" width="200%" height="300%">
                      <feGaussianBlur stdDeviation="6" />
                    </filter>
                    <filter id="lcLineBlur2" x="-50%" y="-100%" width="200%" height="300%">
                      <feGaussianBlur stdDeviation="3" />
                    </filter>
                    <filter id="lcDotBlur" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="2.5" />
                    </filter>
                  </defs>
                  {linePts.length > 0 && pathD && (
                    <>
                      <path d={pathD} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="14" strokeLinecap="round" filter="url(#lcLineBlur1)" />
                      <path d={pathD} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="6" strokeLinecap="round" filter="url(#lcLineBlur2)" />
                      <path d={pathD} fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  )}
                  {linePts.filter(p => !p.isAnchor).map((p, k) => (
                    <g key={k}>
                      <circle cx={p.x} cy={p.y} r="5" fill="rgba(255,255,255,0.18)" filter="url(#lcDotBlur)" />
                      <circle cx={p.x} cy={p.y} r="3" fill="white" />
                      <text x={p.x} y={p.y - 9} textAnchor="middle" fill="rgba(255,255,255,0.70)" fontSize="9" fontWeight="700">
                        {p.val}
                      </text>
                    </g>
                  ))}
                  {sparkDays.map((d, k) => (
                    <text key={k} x={padLeft + (k / 6) * chartW} y={VH + 14} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">
                      {d}
                    </text>
                  ))}
                </svg>
              );
            })()}
          </div>
        </div>

        {/* Row 3: Full-width distance input — shown when TRACKER tapped */}
        {trackerInputVisible && <div style={{ marginTop: 18 }}>
          <div className="flex items-baseline gap-3">
            <input
              type="text"
              value={trackerDistance}
              onChange={e => setTrackerDistance(e.target.value)}
              placeholder="0.0"
              className="text-[2.5rem] font-black tracking-tighter text-white w-full p-0"
              style={{ backgroundColor: 'transparent', border: 'none' }}
            />
            <span className="text-[1rem] font-black tracking-tighter" style={{ color: '#c6c6c6' }}>KM</span>
          </div>
          <div style={separatorStyle} />
        </div>}
      </header>

      {/* EXERCISE section */}
      <section className="mb-8" style={{ marginTop: 32 }}>
        <label style={{ display: 'block', marginBottom: 20, fontSize: '0.9rem', fontWeight: 700, color: '#c6c6c6', letterSpacing: '0.3em', textTransform: 'uppercase', lineHeight: 1 }}>Exercise</label>

        {/* Exercise type dropdown */}
        <div className="relative mb-6">
          <button
            onClick={() => setExerciseOpen(o => !o)}
            className="flex items-center justify-between w-full"
            style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 0' }}
          >
            <span>{selectedExercise?.exercise_name || 'Select type'}</span>
            <ChevronDown size={16} style={{ transform: exerciseOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.5)' }} />
          </button>
          <div style={separatorStyle} />

          {exerciseOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              backgroundColor: '#000000', borderRadius: 0,
              overflow: 'hidden', zIndex: 50,
              boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
            }}>
              {nonTrackerExercises.map((ex, i, arr) => (
                <div key={ex.id}
                  onClick={() => { setSelectedExercise(ex); setExerciseOpen(false); }}
                  style={{
                    padding: '14px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    color: '#ffffff',
                    fontWeight: selectedExercise?.id === ex.id ? 700 : 400,
                    fontSize: '1rem',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    backgroundColor: selectedExercise?.id === ex.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                  }}>
                  <span>{ex.exercise_name}</span>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    backgroundColor: selectedExercise?.id === ex.id ? '#ffffff' : 'rgba(255,255,255,0.15)',
                    color: selectedExercise?.id === ex.id ? '#000000' : '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1 }}>+</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distance */}
        <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Distance</label>
        <div className="flex items-baseline gap-4">
          <input
            type="text"
            value={distance}
            onChange={e => setDistance(e.target.value)}
            placeholder="0.0"
            className="text-[2.5rem] font-black tracking-tighter text-white w-full p-0"
            style={{ backgroundColor: 'transparent', border: 'none' }}
          />
          <span className="text-[1rem] font-black tracking-tighter" style={{ color: '#c6c6c6' }}>KM</span>
        </div>
        <div style={separatorStyle} />
      </section>

      {/* Duration — only shown for Running */}
      {isRunning && (
        <section className="mb-16">
          <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Duration</label>
          <div className="flex items-baseline gap-4">
            <div className="flex items-baseline gap-2">
              <input type="text" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="00"
                className="text-[2.5rem] font-black tracking-tighter text-white w-16 text-left p-0"
                style={{ backgroundColor: 'transparent', border: 'none' }} />
              <span style={{ ...labelStyle }}>MIN</span>
            </div>
            <div className="flex items-baseline gap-2">
              <input type="text" value={seconds} onChange={e => setSeconds(e.target.value)} placeholder="00"
                className="text-[2.5rem] font-black tracking-tighter text-white w-16 text-left p-0"
                style={{ backgroundColor: 'transparent', border: 'none' }} />
              <span style={{ ...labelStyle }}>SEC</span>
            </div>
          </div>
          <div style={separatorStyle} />
        </section>
      )}

      {/* 30-day chart */}
      <section className="mb-12">
        <div style={{ paddingLeft: '2px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#ffffff' }}>Movement</span>
          <button
            onClick={() => setThirtyDayOffset(o => o + 1)}
            disabled={!hasOlderCardioData}
            style={{ background: 'none', border: 'none', padding: '0 4px', cursor: !hasOlderCardioData ? 'default' : 'pointer', opacity: !hasOlderCardioData ? 0.2 : 0.85, color: '#fff', fontSize: '18px', lineHeight: 1 }}
          >‹</button>
          <button
            onClick={() => setThirtyDayOffset(o => o - 1)}
            disabled={thirtyDayOffset === 0}
            style={{ background: 'none', border: 'none', padding: '0 4px', cursor: thirtyDayOffset === 0 ? 'default' : 'pointer', opacity: thirtyDayOffset === 0 ? 0.2 : 0.85, color: '#fff', fontSize: '18px', lineHeight: 1 }}
          >›</button>
        </div>
        <div className="p-6 rounded-xl relative" style={{ backgroundColor: '#121212' }}>
          {/* Inside box header: 30 DAYS left, total+avg stacked on right */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            {/* 30 DAYS — left, smaller, not bold */}
            <h3 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', color: '#ffffff', lineHeight: 1, margin: 0, textTransform: 'uppercase' }}>{periodLabel}</h3>

            {/* Total only — right */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.05em', color: '#ffffff', lineHeight: 1 }}>{total30}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>km</span>
            </div>
          </div>

          {/* Bar chart */}
          {thirtyDayData.length > 0 && (() => {
            const BAR_COUNT = thirtyDayData.length;
            const chartH = 130;
            const MAX_Y = 23;
            const avgLineY = chartH * (1 - avg30 / MAX_Y);

            const semiBar = (x: number, y: number, w: number, h: number) => {
              const r = w / 2;
              if (h <= r) {
                return `M${x},${y + h} L${x + w},${y + h} A${r},${r},0,0,1,${x},${y + h} Z`;
              }
              return [
                `M${x},${y + h}`,
                `L${x},${y + r}`,
                `A${r},${r},0,0,1,${x + w},${y + r}`,
                `L${x + w},${y + h}`,
                'Z'
              ].join(' ');
            };

            return (
              <svg width="100%" viewBox={`0 0 300 ${chartH + 16}`} style={{ display: 'block', overflow: 'visible' }}>
                <defs>
                  <filter id="barGlow30" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {thirtyDayData.map((d, i) => {
                  if (d.total === 0) return null;
                  const barW = Math.max(300 / BAR_COUNT - 3.5, 2);
                  const x = i * (300 / BAR_COUNT);
                  const barH = Math.max((d.total / MAX_Y) * chartH, barW);
                  const y = chartH - barH;
                  const isPeak = i === maxIdx30;
                  const opacity = isPeak ? 1 : d.total >= avg30 ? 0.65 : 0.22;
                  return (
                    <g key={i}>
                      <path
                        d={semiBar(x, y, barW, barH)}
                        fill={`rgba(255,255,255,${opacity})`}
                        filter={isPeak ? 'url(#barGlow30)' : undefined}
                      />
                      {isPeak && (
                        <text
                          x={x + barW / 2}
                          y={y - 5}
                          textAnchor="middle"
                          fill="white"
                          fontSize="7"
                          fontWeight="800"
                        >
                          {d.total}
                        </text>
                      )}
                    </g>
                  );
                })}
                {avg30 > 0 && (() => {
                  const pillW = 30;
                  const pillH = 14;
                  // Centre pill on last bar column (bar 29 starts at x=290, barW≈6.5)
                  const lastBarCentreX = 29 * (300 / BAR_COUNT) + (300 / BAR_COUNT - 3.5) / 2;
                  const pillX = lastBarCentreX - pillW / 2;
                  const pillY = avgLineY - pillH / 2;
                  return (
                    <g>
                      <line
                        x1={0} y1={avgLineY}
                        x2={pillX - 3} y2={avgLineY}
                        stroke="rgba(255,255,255,0.28)"
                        strokeWidth="0.75"
                        strokeDasharray="4 3"
                      />
                      <rect
                        x={pillX} y={pillY}
                        width={pillW} height={pillH}
                        rx={pillH / 2} ry={pillH / 2}
                        fill="white"
                      />
                      <text
                        x={pillX + pillW / 2}
                        y={pillY + pillH / 2 + 3.5}
                        textAnchor="middle"
                        fill="black"
                        fontSize="8"
                        fontWeight="800"
                        letterSpacing="0.2"
                      >
                        {avg30}
                      </text>
                    </g>
                  );
                })()}
              </svg>
            );
          })()}

          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.025, background: 'radial-gradient(circle at top right, white, transparent, transparent)' }} />
        </div>
      </section>

      {/* Per-type cardio chart */}
      <CardioTypeChart />

      {saveError && <p className="text-red-400 text-sm mb-4 text-center">{saveError}</p>}

      <button
        onClick={handleCommit}
        disabled={saving || !hasAnyInput}
        className="w-full rounded-full py-5 text-[0.75rem] uppercase tracking-[0.4em] font-black active:scale-95 transition-all"
        style={{ backgroundColor: saveSuccess ? '#22c55e' : '#ffffff', color: '#000000', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', opacity: saving || !hasAnyInput ? 0.6 : 1 }}>
        {saving ? 'Saving...' : saveSuccess ? '✓ Session Saved!' : 'Log Session'}
      </button>
    </div>
  );
};
