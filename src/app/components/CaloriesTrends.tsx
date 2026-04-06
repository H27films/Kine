import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_ABBREVS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CALORIES_EXERCISE_ID = 90;

const getMondayAtOffset = (offset: number): Date => {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getWeekNum = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Returns the 7 editable days: today-6 (oldest) → today (newest)
const getEditableDays = (): Date[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
};

const fmtEditLabel = (d: Date): string =>
  `${DAY_ABBREVS[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;

const trendLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'rgba(161,161,170,1)',
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
};

const CaloriesTrends: React.FC = () => {
  const [calWeekOffset, setCalWeekOffset] = useState(0);
  const [calWeekNumber, setCalWeekNumber] = useState<number | null>(null);
  const [weeklyBars, setWeeklyBars] = useState<number[]>(Array(7).fill(0));
  const [refreshKey, setRefreshKey] = useState(0);

  const [monthOffset, setMonthOffset] = useState(0);
  const [monthlyBars, setMonthlyBars] = useState<number[]>([]);
  const [monthName, setMonthName] = useState('');
  const [minMonthOffset, setMinMonthOffset] = useState(-24);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRowValues, setEditRowValues] = useState<string[]>(Array(7).fill(''));
  const [editSaving, setEditSaving] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const fetchEarliest = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('date')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', CALORIES_EXERCISE_ID)
        .order('date', { ascending: true })
        .limit(1);

      if (data && data.length > 0) {
        const earliest = new Date(data[0].date + 'T12:00:00');
        const now = new Date();
        const diffMonths =
          (earliest.getFullYear() - now.getFullYear()) * 12 +
          (earliest.getMonth() - now.getMonth());
        setMinMonthOffset(diffMonths);
      }
    };
    fetchEarliest();
  }, []);

  useEffect(() => {
    const loadWeekly = async () => {
      const monday = getMondayAtOffset(calWeekOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const { data } = await supabase
        .from('workouts')
        .select('date, calories, week')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', CALORIES_EXERCISE_ID)
        .gte('date', fmtDate(monday))
        .lte('date', fmtDate(sunday))
        .order('date', { ascending: true });

      const weekly = Array(7).fill(0);
      let wkNum: number | null = null;
      if (data) {
        for (const row of data as any[]) {
          if (wkNum === null && row.week) wkNum = Number(row.week);
          if (!row.calories) continue;
          const d = new Date(row.date + 'T12:00:00');
          const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
          weekly[dayIdx] += Number(row.calories);
        }
      }
      setWeeklyBars(weekly);
      setCalWeekNumber(wkNum);
    };
    loadWeekly();
  }, [calWeekOffset, refreshKey]);

  useEffect(() => {
    const loadMonthly = async () => {
      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const year = target.getFullYear();
      const month = target.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      setMonthName(MONTH_NAMES[month]);

      const firstDay = fmtDate(new Date(year, month, 1));
      const lastDay = fmtDate(new Date(year, month, daysInMonth));

      const { data } = await supabase
        .from('workouts')
        .select('date, calories')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', CALORIES_EXERCISE_ID)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date', { ascending: true });

      const bars = Array(daysInMonth).fill(0);
      if (data) {
        for (const row of data as any[]) {
          if (!row.calories) continue;
          const d = new Date(row.date + 'T12:00:00');
          const dayIdx = d.getDate() - 1;
          if (dayIdx >= 0 && dayIdx < daysInMonth) {
            bars[dayIdx] += Number(row.calories);
          }
        }
      }
      setMonthlyBars(bars);
    };
    loadMonthly();
  }, [monthOffset, refreshKey]);

  // Check if a bar (by chart index) falls within editable range
  const getBarDate = (barIndex: number): Date => {
    const monday = getMondayAtOffset(calWeekOffset);
    const d = new Date(monday);
    d.setDate(monday.getDate() + barIndex);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const isBarEditable = (barIndex: number): boolean => {
    const todayD = new Date();
    todayD.setHours(0, 0, 0, 0);
    const sixAgo = new Date(todayD);
    sixAgo.setDate(todayD.getDate() - 6);
    const barDate = getBarDate(barIndex);
    return barDate >= sixAgo && barDate <= todayD;
  };

  const openEditModal = async () => {
    const days = getEditableDays();
    const dateStrings = days.map(d => fmtDate(d));

    const { data } = await supabase
      .from('workouts')
      .select('date, calories')
      .eq('type', 'MEASUREMENT')
      .eq('exercise_id', CALORIES_EXERCISE_ID)
      .in('date', dateStrings);

    const valMap: Record<string, string> = {};
    if (data) {
      for (const row of data as any[]) {
        if (row.calories) valMap[row.date] = String(row.calories);
      }
    }

    const values = dateStrings.map(ds => valMap[ds] || '');
    setEditRowValues(values);
    setShowEditModal(true);
  };

  const handleBarClick = (barIndex: number) => {
    if (!isBarEditable(barIndex)) return;
    openEditModal();
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    const days = getEditableDays();

    for (let i = 0; i < 7; i++) {
      const raw = editRowValues[i].trim();
      if (raw === '') continue;
      const val = parseInt(raw);
      if (isNaN(val) || val < 0) continue;

      const dateStr = fmtDate(days[i]);
      const barDate = days[i];
      const weekNum = getWeekNum(barDate);
      const dayName = DAY_NAMES[barDate.getDay()];

      const { data: existing } = await supabase
        .from('workouts')
        .select('id')
        .eq('date', dateStr)
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', CALORIES_EXERCISE_ID)
        .maybeSingle();

      if (existing) {
        await supabase.from('workouts').update({ calories: val }).eq('id', existing.id);
      } else if (val > 0) {
        await supabase.from('workouts').insert({
          date: dateStr,
          week: weekNum,
          day: dayName,
          type: 'MEASUREMENT',
          exercise_id: CALORIES_EXERCISE_ID,
          calories: val,
          total_score_k: null,
          new_entry: 'New',
          source: 'app',
        });
      }
    }

    setEditSaving(false);
    setShowEditModal(false);
    setRefreshKey(k => k + 1); // re-fetch charts
  };

  const weeklyMax = Math.max(...weeklyBars, 1);
  const daysWithCals = weeklyBars.filter(v => v > 0).length;
  const weeklyAvg = daysWithCals > 0
    ? Math.round(weeklyBars.reduce((a, b) => a + b, 0) / daysWithCals)
    : 0;
  const weeklyMaxBarIndex = weeklyBars.indexOf(Math.max(...weeklyBars));

  const monthlyMax = Math.max(...monthlyBars, 1);
  const monthDaysWithCals = monthlyBars.filter(v => v > 0).length;
  const monthlyAvg = monthDaysWithCals > 0
    ? Math.round(monthlyBars.reduce((a, b) => a + b, 0) / monthDaysWithCals)
    : 0;
  const monthlyPeakIdx = monthlyBars.indexOf(Math.max(...monthlyBars));

  const todayDayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const editableDays = getEditableDays();

  return (
    <section className="mb-8">
      <h3 className="text-[13px] font-black uppercase tracking-[0.2em] mb-6" style={{ color: '#ffffff' }}>
        Performance Trends
      </h3>
      <div className="space-y-10">

        {/* === Weekly Calories Chart === */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={trendLabelStyle}>Calories:&nbsp;</span>
              <span style={trendLabelStyle}>
                {weeklyAvg > 0 ? `${weeklyAvg.toLocaleString()} KCAL` : '\u2014 KCAL'}
              </span>
              <button
                onClick={() => setCalWeekOffset(o => o - 1)}
                style={{ background: 'none', border: 'none', padding: '2px 1px', cursor: 'pointer', color: 'rgba(161,161,170,1)', display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => setCalWeekOffset(o => Math.min(o + 1, 0))}
                style={{ background: 'none', border: 'none', padding: '2px 1px', cursor: 'pointer', color: calWeekOffset < 0 ? 'rgba(161,161,170,1)' : 'rgba(161,161,170,0.25)', display: 'flex', alignItems: 'center' }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
            {calWeekNumber !== null && (
              <span style={trendLabelStyle}>{calWeekNumber}</span>
            )}
          </div>

          {/* Bars */}
          <div className="flex items-end justify-between gap-1" style={{ height: '140px' }}>
            {weeklyBars.map((h, i) => {
              const pct = weeklyMax > 0 ? (h / weeklyMax) * 100 : 0;
              const barPct = Math.max(pct, h > 0 ? 4 : 0);
              const isCurrentWeek = calWeekOffset === 0;
              const isToday = isCurrentWeek && i === todayDayIdx;
              const isPeakBar = !isCurrentWeek && h > 0 && i === weeklyMaxBarIndex;
              const editable = isBarEditable(i);

              let bgColor = h > 0 ? '#3f3f46' : '#18181b';
              if (isToday) bgColor = '#ffffff';
              if (isPeakBar) bgColor = '#ffffff';

              const labelColor = (isToday || isPeakBar) ? '#000000' : '#ffffff';

              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  onClick={() => handleBarClick(i)}
                  style={{
                    height: `${barPct}%`,
                    backgroundColor: bgColor,
                    boxShadow: isPeakBar ? '0 0 8px rgba(255,255,255,0.6), 0 0 20px rgba(255,255,255,0.25)' : 'none',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '9px',
                    cursor: editable ? 'pointer' : 'default',
                  }}
                >
                  {h > 0 && (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: labelColor,
                      letterSpacing: '0.01em',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day labels */}
          <div className="flex justify-between mt-3" style={{ gap: 4 }}>
            {weekDays.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <span style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {d}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* === Monthly Calories Chart === */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 42 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={trendLabelStyle}>Calories:&nbsp;</span>
              <span style={trendLabelStyle}>
                {monthlyAvg > 0 ? `${monthlyAvg.toLocaleString()} KCAL` : '\u2014 KCAL'}
              </span>
              <button
                onClick={() => setMonthOffset(o => Math.max(o - 1, minMonthOffset))}
                style={{
                  background: 'none', border: 'none', padding: '2px 1px', cursor: 'pointer',
                  color: monthOffset > minMonthOffset ? 'rgba(161,161,170,1)' : 'rgba(161,161,170,0.25)',
                  display: 'flex', alignItems: 'center'
                }}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => setMonthOffset(o => Math.min(o + 1, 0))}
                style={{
                  background: 'none', border: 'none', padding: '2px 1px', cursor: 'pointer',
                  color: monthOffset < 0 ? 'rgba(161,161,170,1)' : 'rgba(161,161,170,0.25)',
                  display: 'flex', alignItems: 'center'
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
            <span style={trendLabelStyle}>{monthName}</span>
          </div>

          {/* Bars */}
          <div style={{ position: 'relative' }}>
            <div className="flex items-end justify-between" style={{ height: '120px', gap: '3px' }}>
              {monthlyBars.map((h, i) => {
                const pct = monthlyMax > 0 ? (h / monthlyMax) * 100 : 0;
                const isToday = monthOffset === 0 && i === new Date().getDate() - 1;
                const isPeakBar = monthlyBars.length > 0 && h > 0 && i === monthlyPeakIdx;

                let bgColor = h > 0 ? (h >= monthlyMax * 0.7 ? '#3f3f46' : 'rgba(24,24,27,0.7)') : 'rgba(24,24,27,0.3)';
                if (isToday) bgColor = '#ffffff';
                if (isPeakBar) bgColor = '#ffffff';

                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: `${Math.max(pct, h > 0 ? 3 : 0)}%`,
                      backgroundColor: bgColor,
                      boxShadow: isPeakBar ? '0 0 6px rgba(255,255,255,0.5), 0 0 16px rgba(255,255,255,0.2)' : 'none',
                      position: 'relative',
                    }}
                  >
                    {isPeakBar && h > 0 && (
                      <span style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '12px',
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.01em',
                        lineHeight: 1,
                      }}>
                        {h}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* === 7-Day Bulk Edit Bottom Sheet === */}
      {showEditModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              position: 'absolute', bottom: '10px', left: '10px', right: '10px',
              backgroundColor: '#F2F2ED',
              borderRadius: '20px',
              padding: '28px 24px 40px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <p style={{
              fontSize: '14px', fontWeight: 900,
              color: '#000000',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 24,
            }}>
              Edit Calories
            </p>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
              {editableDays.map((day, i) => (
                <div key={i}>
                  <div
                    onClick={() => inputRefs.current[i]?.focus()}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: 14, paddingBottom: 14,
                      cursor: 'text',
                    }}
                  >
                    {/* Date label */}
                    <span style={{
                      fontSize: '11px', fontWeight: 700,
                      color: '#000000',
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      flexShrink: 0,
                    }}>
                      {fmtEditLabel(day)}
                    </span>

                    {/* Inline input — no box, right-aligned, Manrope */}
                    <input
                      ref={el => { inputRefs.current[i] = el; }}
                      type="number"
                      value={editRowValues[i]}
                      onChange={e => {
                        const newVals = [...editRowValues];
                        newVals[i] = e.target.value;
                        setEditRowValues(newVals);
                      }}
                      placeholder="—"
                      style={{
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        fontFamily: "'Manrope', sans-serif",
                        fontSize: '16px',
                        fontWeight: 400,
                        color: editRowValues[i] ? '#000000' : 'rgba(0,0,0,0.3)',
                        textAlign: 'right',
                        width: 90,
                        padding: 0,
                      }}
                    />
                  </div>
                  {/* Divider — not after last row */}
                  {i < editableDays.length - 1 && (
                    <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Update button */}
            <button
              onClick={handleEditSave}
              disabled={editSaving}
              style={{
                width: '100%', padding: '16px',
                backgroundColor: '#000000', color: '#ffffff',
                borderRadius: 999, border: 'none',
                fontSize: '11px', fontWeight: 900,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                cursor: 'pointer', opacity: editSaving ? 0.6 : 1,
              }}
            >
              {editSaving ? 'Saving...' : 'Update'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default CaloriesTrends;
