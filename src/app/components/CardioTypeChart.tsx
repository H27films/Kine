import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, weeksAgoMonday } from '../../lib/supabase';

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

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekBounds(offset: number): { monday: string; sunday: string; label: string } {
  const mondayStr = weeksAgoMonday(offset);
  const monday = new Date(mondayStr + 'T12:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return {
    monday: localDateStr(monday),
    sunday: localDateStr(sunday),
    label: `${fmt(monday)} – ${fmt(sunday)}`,
  };
}

function getMonthBounds(offset: number): {
  firstDay: string;
  lastDay: string;
  daysInMonth: number;
  label: string;
  year: number;
  month: number;
} {
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
    year,
    month,
  };
}

export const CardioTypeChart: React.FC = () => {
  const [selectedType, setSelectedType] = useState('RUNNING');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [weeklyData, setWeeklyData] = useState<number[]>(Array(7).fill(0));
  const [monthlyData, setMonthlyData] = useState<number[]>([]);

  useEffect(() => {
    if (viewMode !== 'weekly') return;
    const load = async () => {
      const { monday, sunday } = getWeekBounds(weekOffset);
      const { data } = await supabase
        .from('workouts')
        .select('day, km, exercises:exercise_id(exercise_name)')
        .eq('type', 'CARDIO')
        .gte('date', monday)
        .lte('date', sunday);
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
  }, [selectedType, viewMode, weekOffset]);

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

  const weekTotal = +(weeklyData.reduce((s, v) => s + v, 0)).toFixed(1);
  const activeDaysM = monthlyData.filter(v => v > 0);
  const monthTotal = +(activeDaysM.reduce((s, v) => s + v, 0)).toFixed(1);
  const monthAvg = activeDaysM.length > 0 ? +(monthTotal / activeDaysM.length).toFixed(1) : 0;
  const summaryValue = viewMode === 'weekly' ? weekTotal : monthTotal;

  const weekBounds = getWeekBounds(weekOffset);
  const monthBounds = getMonthBounds(monthOffset);
  const navLabel = viewMode === 'weekly' ? weekBounds.label : monthBounds.label;

  const offset = viewMode === 'weekly' ? weekOffset : monthOffset;
  const onBack = () =>
    viewMode === 'weekly' ? setWeekOffset(o => o + 1) : setMonthOffset(o => o + 1);
  const onForward = () =>
    viewMode === 'weekly'
      ? setWeekOffset(o => Math.max(0, o - 1))
      : setMonthOffset(o => Math.max(0, o - 1));

  return (
    <section className="mb-20">
      <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>

        {/* Top row: type | week/month toggles  +  navigation */}
        <div className="flex items-center justify-between mb-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

            {/* Type selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setTypePickerOpen(o => !o)}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  color: '#ffffff',
                  paddingBottom: '4px',
                  background: 'none',
                  cursor: 'pointer',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: '2px solid #ffffff',
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

            {/* Week / Month toggle tabs */}
            {(['weekly', 'monthly'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  paddingBottom: '4px',
                  color: viewMode === mode ? '#ffffff' : 'rgba(255,255,255,0.3)',
                  background: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: viewMode === mode ? '2px solid #ffffff' : '2px solid transparent',
                }}
              >
                {mode === 'weekly' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>

          {/* Navigation arrows + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={onBack} style={{ opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <ChevronLeft size={14} color="white" />
            </button>
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.6px',
              color: 'rgba(255,255,255,0.4)', minWidth: '72px', textAlign: 'center',
            }}>
              {navLabel}
            </span>
            <button
              onClick={onForward}
              disabled={offset === 0}
              style={{ opacity: offset > 0 ? 0.6 : 0.18, background: 'none', border: 'none', cursor: offset > 0 ? 'pointer' : 'default', padding: 0 }}
            >
              <ChevronRight size={14} color="white" />
            </button>
          </div>
        </div>

        {/* Summary total */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1 }}>
            {summaryValue}
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>KM</span>
          {viewMode === 'monthly' && monthAvg > 0 && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', marginLeft: 6 }}>
              avg {monthAvg} km
            </span>
          )}
        </div>

        {/* Bar chart */}
        <div
          className="flex items-end justify-between"
          style={{ height: '176px', gap: viewMode === 'weekly' ? '12px' : '3px' }}
        >
          {displayData.map((val, i) => {
            const pct = val > 0 ? Math.max(val / rawMax, 0.04) : 0;
            const brightness = val > 0 ? Math.round(80 + (val / rawMax) * 175) : 0;
            const barColor = val > 0
              ? `rgb(${brightness},${brightness},${brightness})`
              : 'rgba(255,255,255,0.05)';
            const barLabel = viewMode === 'weekly' && val > 0 ? `${+val.toFixed(1)}km` : '';
            const dayN = i + 1;
            const dayLabel = viewMode === 'weekly'
              ? DAY_SHORT[i]
              : (dayN === 1 || dayN % 7 === 0 ? `${dayN}` : '');

            return (
              <div
                key={i}
                className="flex flex-col items-center h-full justify-end"
                style={{ flex: '1', maxWidth: viewMode === 'weekly' ? '28px' : undefined }}
              >
                {viewMode === 'weekly' && (
                  <div style={{ fontSize: '7.5px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                    {barLabel}
                  </div>
                )}
                <div
                  className="w-full min-h-[4px] transition-all"
                  style={{
                    height: `${pct * 100}%`,
                    backgroundColor: barColor,
                    borderRadius: '9999px 9999px 0 0',
                  }}
                />
                <div style={{
                  fontSize: viewMode === 'weekly' ? '8px' : '6px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#ffffff',
                  marginTop: '8px',
                }}>
                  {dayLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
