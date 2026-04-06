import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
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

const trendLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'rgba(161,161,170,1)',
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
};

const CaloriesTrends: React.FC = () => {
  // Weekly chart state
  const [calWeekOffset, setCalWeekOffset] = useState(0);
  const [calWeekNumber, setCalWeekNumber] = useState<number | null>(null);
  const [weeklyBars, setWeeklyBars] = useState<number[]>(Array(7).fill(0));

  // Monthly chart state
  const [monthOffset, setMonthOffset] = useState(0);
  const [monthlyBars, setMonthlyBars] = useState<number[]>([]);
  const [monthName, setMonthName] = useState('');

  // Earliest data month offset (to clamp back-navigation)
  const [minMonthOffset, setMinMonthOffset] = useState(-24); // fallback

  // Find earliest data month on mount
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

  // Load weekly calories
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
  }, [calWeekOffset]);

  // Load monthly calories
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
  }, [monthOffset]);

  // Weekly computed values
  const weeklyMax = Math.max(...weeklyBars, 1);
  const daysWithCals = weeklyBars.filter(v => v > 0).length;
  const weeklyAvg = daysWithCals > 0
    ? Math.round(weeklyBars.reduce((a, b) => a + b, 0) / daysWithCals)
    : 0;
  const weeklyMaxBarIndex = weeklyBars.indexOf(Math.max(...weeklyBars));

  // Monthly computed values
  const monthlyMax = Math.max(...monthlyBars, 1);
  const monthDaysWithCals = monthlyBars.filter(v => v > 0).length;
  const monthlyAvg = monthDaysWithCals > 0
    ? Math.round(monthlyBars.reduce((a, b) => a + b, 0) / monthDaysWithCals)
    : 0;
  const monthlyPeakIdx = monthlyBars.indexOf(Math.max(...monthlyBars));

  const todayDayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  return (
    <section className="mb-8">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.3em] mb-6" style={{ color: 'rgba(161,161,170,1)' }}>
        Performance Trends
      </h3>
      <div className="space-y-10">

        {/* === Weekly Calories Chart === */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={trendLabelStyle}>Calories:&nbsp;</span>
              <span style={trendLabelStyle}>
                {weeklyAvg > 0 ? `${weeklyAvg.toLocaleString()} KCAL` : '— KCAL'}
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

              let bgColor = h > 0 ? '#3f3f46' : '#18181b';
              if (isToday) bgColor = '#ffffff';
              if (isPeakBar) bgColor = '#ffffff';

              const labelColor = (isToday || isPeakBar) ? '#000000' : '#ffffff';

              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${barPct}%`,
                    backgroundColor: bgColor,
                    boxShadow: isPeakBar ? '0 0 8px rgba(255,255,255,0.6), 0 0 20px rgba(255,255,255,0.25)' : 'none',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '9px',
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

          {/* Day labels - single letters */}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={trendLabelStyle}>Calories:&nbsp;</span>
              <span style={trendLabelStyle}>
                {monthlyAvg > 0 ? `${monthlyAvg.toLocaleString()} KCAL` : '— KCAL'}
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
                        marginBottom: '4px',
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
    </section>
  );
};

export default CaloriesTrends;
