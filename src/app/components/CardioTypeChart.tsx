import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type ViewMode = 'weekly' | 'monthly';

const CARDIO_TYPES = ['RUNNING', 'ROW', 'CYCLE', 'CROSS TRAINER', 'WALKING', 'TRACKER'];
const TYPE_LABELS: Record<string, string> = {
  RUNNING: 'Running',
  ROW: 'Rowing',
  CYCLE: 'Cycling',
  'CROSS TRAINER': 'Cross-Trainer',
  WALKING: 'Walking',
  TRACKER: 'Tracker',
};

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonthBounds(offset: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const year = d.getFullYear();
  const month = d.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, '0');
  return {
    firstDay: `${year}-${mm}-01`,
    lastDay: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
    daysInMonth,
    label: d.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase(),
  };
}

export const CardioTypeChart: React.FC = () => {
  const [selectedType, setSelectedType] = useState('RUNNING');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');

  // Weekly: navigate by actual week numbers from supabase
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [weekIdx, setWeekIdx] = useState(0); // 0 = most recent
  const [weeklyData, setWeeklyData] = useState<number[]>(Array(7).fill(0));

  // Monthly
  const [monthOffset, setMonthOffset] = useState(0);
  const [monthlyData, setMonthlyData] = useState<number[]>([]);
  const [minMonthOffset, setMinMonthOffset] = useState(0);   // most recent month with data (forward limit)
  const [maxMonthOffset, setMaxMonthOffset] = useState(24);  // oldest month with data (back limit)

  // Load min/max date from supabase to bound month navigation
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('date')
        .eq('type', 'CARDIO')
        .not('date', 'is', null)
        .order('date', { ascending: true });
      if (data && data.length > 0) {
        const dates = (data as any[]).map(r => r.date as string).filter(Boolean);
        const minDate = new Date(dates[0]);
        const maxDate = new Date(dates[dates.length - 1]);
        const now = new Date();
        // offset = how many months back from now
        const toOffset = (d: Date) =>
          (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        const newMin = Math.max(0, toOffset(maxDate));
        const newMax = toOffset(minDate);
        setMinMonthOffset(newMin);
        setMaxMonthOffset(newMax);
        setMonthOffset(newMin); // start at most recent month with data
      }
    };
    load();
  }, []);

  // Load all distinct week numbers from supabase (descending)
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('week')
        .eq('type', 'CARDIO')
        .not('week', 'is', null);
      if (data) {
        const weeks = [...new Set((data as any[]).map(r => Number(r.week)))]
          .filter(w => !isNaN(w))
          .sort((a, b) => b - a);
        setAvailableWeeks(weeks);
        setWeekIdx(0);
      }
    };
    load();
  }, []);

  // Load weekly bar data by week number
  useEffect(() => {
    if (viewMode !== 'weekly' || availableWeeks.length === 0) return;
    const currentWeek = availableWeeks[weekIdx];
    const load = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('day, km, week, exercises:exercise_id(exercise_name)')
        .eq('type', 'CARDIO')
        .eq('week', currentWeek);
      const days = Array(7).fill(0);
      if (data) {
        (data as any[]).forEach(r => {
          if ((r.exercises?.exercise_name || '').toUpperCase() !== selectedType) return;
          const idx = DAY_ORDER.indexOf((r.day || '').toUpperCase());
          if (idx >= 0) days[idx] = +(days[idx] + Number(r.km || 0)).toFixed(2);
        });
      }
      setWeeklyData(days);
    };
    load();
  }, [selectedType, viewMode, weekIdx, availableWeeks]);

  // Load monthly bar data by date range
  useEffect(() => {
    if (viewMode !== 'monthly') return;
    const load = async () => {
      const { firstDay, lastDay, daysInMonth } = getMonthBounds(monthOffset);
      const { data } = await supabase
        .from('workouts')
        .select('date, km, exercises:exercise_id(exercise_name)')
        .eq('type', 'CARDIO')
        .gte('date', firstDay)
        .lte('date', lastDay);
      const byDay: Record<number, number> = {};
      if (data) {
        (data as any[]).forEach(r => {
          if ((r.exercises?.exercise_name || '').toUpperCase() !== selectedType) return;
          const d = parseInt(r.date.split('-')[2], 10);
          byDay[d] = +((byDay[d] || 0) + Number(r.km || 0)).toFixed(2);
        });
      }
      setMonthlyData(Array.from({ length: daysInMonth }, (_, i) => byDay[i + 1] || 0));
    };
    load();
  }, [selectedType, viewMode, monthOffset]);

  const displayData = viewMode === 'weekly' ? weeklyData : monthlyData;
  const rawMax = Math.max(...displayData, 0.1);
  const total = +(displayData.reduce((s, v) => s + v, 0)).toFixed(1);

  // Monthly peak highlighting (same as 30-day chart)
  const monthlyNonZero = monthlyData.filter(v => v > 0);
  const monthlyAvg = monthlyNonZero.length > 0
    ? monthlyNonZero.reduce((a, b) => a + b, 0) / monthlyNonZero.length
    : 0;
  const monthlyMaxVal = Math.max(...monthlyData, 0);
  const monthlyPeakIdx = monthlyMaxVal > 0 ? monthlyData.findIndex(v => v === monthlyMaxVal) : -1;

  const currentWeekNum = availableWeeks[weekIdx] ?? '—';
  const monthBounds = getMonthBounds(monthOffset);
  const navLabel = viewMode === 'weekly' ? `WEEK ${currentWeekNum}` : monthBounds.label;

  const canGoBack = viewMode === 'weekly'
    ? weekIdx < availableWeeks.length - 1
    : monthOffset < maxMonthOffset;
  const canGoForward = viewMode === 'weekly'
    ? weekIdx > 0
    : monthOffset > minMonthOffset;

  const onBack = () =>
    viewMode === 'weekly' ? setWeekIdx(i => i + 1) : setMonthOffset(o => Math.min(o + 1, maxMonthOffset));
  const onForward = () =>
    viewMode === 'weekly'
      ? setWeekIdx(i => Math.max(0, i - 1))
      : setMonthOffset(o => Math.max(o - 1, minMonthOffset));

  return (
    <section className="mb-20">

      {/* WEEK / MONTH tabs — above the box */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '10px', paddingLeft: '2px', alignItems: 'baseline' }}>
        {(['weekly', 'monthly'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              fontSize: viewMode === mode ? '14px' : '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: viewMode === mode ? '#ffffff' : 'rgba(255,255,255,0.28)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              padding: 0,
            }}
          >
            {mode === 'weekly' ? 'Week' : 'Month'}
          </button>
        ))}
      </div>

      {/* Chart box */}
      <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>

        {/* Top row: type selector + navigation */}
        <div className="flex items-center justify-between mb-3">

          {/* Type selector — no underline, larger */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setTypePickerOpen(o => !o)}
              style={{
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: '#ffffff',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {TYPE_LABELS[selectedType]}
            </button>
            {typePickerOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                backgroundColor: '#1c1c1c',
                borderRadius: 8,
                overflow: 'hidden',
                zIndex: 50,
                boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
                minWidth: 155,
              }}>
                {CARDIO_TYPES.map(type => (
                  <div
                    key={type}
                    onClick={() => { setSelectedType(type); setTypePickerOpen(false); }}
                    style={{
                      padding: '11px 14px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: selectedType === type ? 700 : 400,
                      color: selectedType === type ? '#ffffff' : 'rgba(255,255,255,0.45)',
                      backgroundColor: selectedType === type ? 'rgba(255,255,255,0.07)' : 'transparent',
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {TYPE_LABELS[type]}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={onBack}
              disabled={!canGoBack}
              style={{ opacity: canGoBack ? 0.6 : 0.18, background: 'none', border: 'none', cursor: canGoBack ? 'pointer' : 'default', padding: 0 }}
            >
              <ChevronLeft size={14} color="white" />
            </button>
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.6px', color: 'rgba(255,255,255,0.4)', minWidth: '72px', textAlign: 'center' }}>
              {navLabel}
            </span>
            <button
              onClick={onForward}
              disabled={!canGoForward}
              style={{ opacity: canGoForward ? 0.6 : 0.18, background: 'none', border: 'none', cursor: canGoForward ? 'pointer' : 'default', padding: 0 }}
            >
              <ChevronRight size={14} color="white" />
            </button>
          </div>
        </div>

        {/* Total only */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1 }}>
            {total}
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>KM</span>
        </div>

        {/* Bar chart */}
        <div
          className="flex items-end justify-between"
          style={{ height: '176px', gap: viewMode === 'weekly' ? '12px' : '6px', position: 'relative' }}
        >
          {/* Monthly: vertical week separator lines */}
          {viewMode === 'monthly' && (() => {
            const daysCount = monthlyData.length;
            return [7, 14, 21].filter(d => d < daysCount).map(day => {
              const pct = (day / daysCount) * 100;
              return (
                <div key={day} style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  pointerEvents: 'none',
                }} />
              );
            });
          })()}

          {/* Monthly: avg line + pill sitting on line at right end */}
          {viewMode === 'monthly' && rawMax > 0 && (() => {
            const nonZero = monthlyData.filter(v => v > 0);
            if (nonZero.length === 0) return null;
            const avg = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
            const avgPct = avg / rawMax;
            return (
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: `${avgPct * 100}%`,
                height: '1px',
                borderTop: '1px dashed rgba(255,255,255,0.35)',
                pointerEvents: 'none',
                zIndex: 10,
                overflow: 'visible',
              }}>
                <span style={{
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#000000',
                  backgroundColor: '#ffffff',
                  borderRadius: '999px',
                  padding: '2px 6px',
                  letterSpacing: '0.3px',
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                  zIndex: 20,
                }}>
                  {+avg.toFixed(1)}
                </span>
              </div>
            );
          })()}

          {displayData.map((val, i) => {
            const pct = val > 0 ? Math.max(val / rawMax, 0.04) : 0;
            const isWeekly = viewMode === 'weekly';
            const isPeak = !isWeekly && i === monthlyPeakIdx && val > 0;

            // Monthly: same opacity scheme as 30-day chart
            // Weekly: keep existing brightness-scaled rgb approach
            let barColor: string;
            let barGlow: string | undefined;
            if (isWeekly) {
              const brightness = val > 0 ? Math.round(80 + (val / rawMax) * 175) : 0;
              barColor = val > 0
                ? `rgb(${brightness},${brightness},${brightness})`
                : 'rgba(255,255,255,0.05)';
            } else {
              const opacity = val > 0
                ? (isPeak ? 1 : val >= monthlyAvg ? 0.65 : 0.22)
                : 0.07;
              barColor = `rgba(255,255,255,${opacity})`;
              if (isPeak) barGlow = '0 0 8px rgba(255,255,255,0.55), 0 0 16px rgba(255,255,255,0.25)';
            }

            const barLabel = val > 0 ? `${+val.toFixed(1)}` : '';
            const labelOpacity = isWeekly ? 0.7 : (isPeak ? 1 : val >= monthlyAvg ? 0.65 : 0.35);

            return (
              <div
                key={i}
                className="flex flex-col items-center h-full justify-end"
                style={{ flex: '1', minWidth: 0, maxWidth: isWeekly ? '28px' : undefined, position: 'relative' }}
              >
                {/* Data label above bar — weekly: in-flow; monthly: absolute so it doesn't stretch column */}
                {isWeekly ? (
                  <div style={{
                    fontSize: '7.5px',
                    fontWeight: 700,
                    color: val > 0 ? `rgba(255,255,255,${labelOpacity})` : 'transparent',
                    marginBottom: '4px',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}>
                    {barLabel}
                  </div>
                ) : val > 0 ? (
                  <div style={{
                    position: 'absolute',
                    bottom: `calc(${pct * 100}% + 3px)`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '9px',
                    fontWeight: isPeak ? 800 : 700,
                    color: `rgba(255,255,255,${labelOpacity})`,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 5,
                  }}>
                    {barLabel}
                  </div>
                ) : null}
                <div
                  className="w-full min-h-[4px] transition-all"
                  style={{
                    height: `${pct * 100}%`,
                    backgroundColor: barColor,
                    borderRadius: '9999px 9999px 0 0',
                    boxShadow: barGlow,
                  }}
                />
                {isWeekly && (
                  <div style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'rgba(255,255,255,0.55)',
                    marginTop: '8px',
                  }}>
                    {DAY_SHORT[i]}
                  </div>
                )}
              </div>
            );
          })}
        </div>{/* end bar chart */}
      </div>
    </section>
  );
};
