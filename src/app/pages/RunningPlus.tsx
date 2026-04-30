import React, { useState, useEffect, useRef } from 'react';
import { Home, ChevronDown, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Page } from '../../types';
import { DoubleArrowIcon } from '../components/DoubleArrowIcon';

const TIME_PERIODS = ['WEEKLY', 'MONTHLY', 'PERIOD'];

interface DataPoint {
  label: string;
  value: number;
}

interface RunningPlusProps {
  onNavigate: (page: Page) => void;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  page: Page;
}

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DumbbellIconSmall = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ transform: 'rotate(-45deg)' }}>
    <path d="M7,25c-1.7,0-3-1.3-3-3V10c0-1.7,1.3-3,3-3s3,1.3,3,3v12C10,23.7,8.7,25,7,25z" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M25,25c-1.7,0-3-1.3-3-3V10c0-1.7,1.3-3,3-3s3,1.3,3,3v12C28,23.7,26.7,25,25,25z" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23,17H9c-0.6,0-1-0.4-1-1s0.4-1,1-1h14c0.6,0,1,0.4,1,1S23.6,17,23,17z" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2,10.2c-1.2,0.4-2,1.5-2,2.8v6c0,1.3,0.8,2.4,2,2.8V10.2z" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M30,10.2v11.6c1.2-0.4,2-1.5,2-2.8v-6C32,11.7,31.2,10.6,30,10.2z" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RunningManIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9.8 7.6C7.6 7.6 6 9.2 6 11.4c0 1.2.4 2.4 1.2 3.4 1.2-2.5 4.2-4.2 7.2-4.2 1.5 0 3 .3 4.3.9-.7.3-1.5.5-2.3.5-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7c0 1.8-.8 3.4-2.1 4.5V6.5c0-.6.4-1 1-.8.6.2 2.1.7 2.1 2.4h-3.3c-.1.4-.2.7-.2 1.2s0 .8.2 1.2H18c1.2 0 2.7-.4 3.7-1.6.4.1.8.2 1.2.2 1.9 0 3.5-1 4.2-2.5.1.4.1.9-.1 1.3 1.2 1.5 3.9 2.2 4.6 3.6.7.9.8 2.1.3 3.2-.6 1.3-2 2.2-3.8 2.2-.9 0-1.8-.3-2.5-.9-.7.6-1.6.9-2.5.9-1.8 0-3.2-1-3.8-2.2-.4-1.1-.4-2.3.3-3.2.7-1.4 3.4-2.1 4.6-3.6-.1-.4-.2-.9-.1-1.3.7 1.5 2.3 2.5 4.2 2.5 1.9 0 3.4-1 3.4-2.2 0-.6-.4-1-1-.8l-3.2 3.7c-.5.6-1.2.9-2 .9-1.4 0-2.5-.6-3.2-1.6-.2.7-.6 1.3-1.1 1.9z" fill="#1a1a1a"/>
  </svg>
);

const ProfileUserIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path fillRule="evenodd" clipRule="evenodd" d="M16.5 7.063C16.5 10.258 14.57 13 12 13c-2.572 0-4.5-2.742-4.5-5.938C7.5 3.868 9.16 2 12 2s4.5 1.867 4.5 5.063zM4.102 20.142C4.487 20.6 6.145 22 12 22c5.855 0 7.512-1.4 7.898-1.857a.416.416 0 0 0 .09-.317C19.9 18.944 19.106 15 12 15s-7.9 3.944-7.989 4.826a.416.416 0 0 0 .091.317z" fill="#1a1a1a" />
  </svg>
);

export const RunningPlus: React.FC<RunningPlusProps> = ({ onNavigate }) => {
  const [category, setCategory] = useState('RUNNING');
  const [timePeriod, setTimePeriod] = useState('WEEKLY');
  const [data, setData] = useState<DataPoint[]>([]);
  const [totalRaw, setTotalRaw] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);
  const [currentWeek, setCurrentWeek] = useState(66);
  const currentMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [minWeek, setMinWeek] = useState<number | null>(null);
  const [maxWeek, setMaxWeek] = useState<number | null>(null);
  const [minMonth, setMinMonth] = useState<string | null>(null);
  const [maxMonth, setMaxMonth] = useState<string | null>(null);

  const selectedWeek = currentWeek + weekOffset;

  const getSelectedMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + monthOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const selectedMonth = getSelectedMonth();

  const getMonthInfo = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const label = `${monthNames[month - 1]} ${year}`;
    return { daysInMonth, label };
  };

  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('week, date')
        .not('week', 'is', null)
        .order('week');

      if (data && data.length > 0) {
        const weeks = [...new Set((data as any[]).map(r => r.week as number))].sort((a, b) => a - b);
        setMinWeek(weeks[0]);
        setMaxWeek(weeks[weeks.length - 1]);
        setCurrentWeek(weeks[weeks.length - 1]);

        const dates = (data as any[]).map(r => r.date).filter(Boolean).sort();
        if (dates.length > 0) {
          const minDate = dates[0];
          const maxDate = dates[dates.length - 1];
          const toMonth = (d: string) => d.substring(0, 7);
          setMinMonth(toMonth(minDate));
          setMaxMonth(toMonth(maxDate));
        }
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setPeriodOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadChartData = async () => {
    let labels: string[] = [];
    let weekNumbers: number[] = [];
    let dateStart: string | null = null;
    let dateEnd: string | null = null;

    if (timePeriod === 'WEEKLY') {
      labels = dayLabels.map(d => d);
      weekNumbers = [selectedWeek];
    } else if (timePeriod === 'MONTHLY') {
      const { daysInMonth } = getMonthInfo(selectedMonth);
      const [year, month] = selectedMonth.split('-').map(Number);
      dateStart = `${year}-${String(month).padStart(2, '0')}-01`;
      dateEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    } else {
      const startWeek = selectedWeek - 7;
      weekNumbers = Array.from({ length: 8 }, (_, i) => startWeek + i);
      labels = weekNumbers.map(w => `W${w}`);
    }

    let query;
    if (timePeriod === 'MONTHLY') {
      query = supabase.from('workouts').select('*, exercises(exercise_name)').gte('date', dateStart!).lte('date', dateEnd!);
    } else {
      query = supabase.from('workouts').select('*, exercises(exercise_name)').in('week', weekNumbers);
    }

    const { data: rows } = await query;

    const values = new Array(labels.length).fill(0);
    let rawTotal = 0;
    let sessionRows = 0;

    if (rows) {
      for (const row of rows as any[]) {
        const name = (row.exercises?.exercise_name || '').toUpperCase();
        if (name !== 'RUNNING') continue;

        sessionRows++;

        let idx: number;
        if (timePeriod === 'MONTHLY') {
          const dayOfMonth = parseInt(row.date.split('-')[2], 10);
          idx = dayOfMonth - 1;
        } else if (timePeriod === 'WEEKLY') {
          const dayMap: Record<string, number> = {
            'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4, 'SAT': 5, 'SUN': 6,
          };
          idx = dayMap[(row.day || '').toUpperCase()] ?? 0;
        } else {
          idx = weekNumbers.indexOf(row.week);
        }

        if (idx >= 0 && idx < labels.length) {
          const val = row.total_cardio || 0;
          rawTotal += val;
          values[idx] += val;
        }
      }
    }

    const points = labels.map((label, i) => ({
      label,
      value: Math.round(values[i] * 10) / 10,
    }));
    setData(points);
    setTotalRaw(rawTotal);
    setSessionCount(sessionRows);
  };

  useEffect(() => {
    setWeekOffset(0);
    setMonthOffset(0);
    setSelectedBarIdx(null);
    setSessionCount(0);
    loadChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, timePeriod, currentWeek, currentMonth]);

  useEffect(() => { loadChartData(); }, [weekOffset, monthOffset, timePeriod]);

  const minValue = Math.min(...data.map(d => d.value), 0);
  const maxValue = Math.max(...data.map(d => d.value), minValue + 1);
  const metricLabel = 'KM';

  const displayTotal = totalRaw === 0 ? '0.0' : totalRaw.toFixed(1);

  const navItems: NavItem[] = [
    { label: 'Home', icon: <Home size={20} />, page: 'dashboard' },
    { label: 'Weights', icon: <DumbbellIconSmall size={21} />, page: 'weights' },
    { label: 'Cardio', icon: <RunningManIcon size={24} color="#1a1a1a" />, page: 'cardio' },
    { label: 'Calories', icon: <div></div>, page: 'calories' },
    { label: 'Profile', icon: <ProfileUserIcon size={20} />, page: 'profile' },
  ];

  const pillStyle = (): React.CSSProperties => ({
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    backgroundColor: 'rgba(0,0,0,0.06)',
    color: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
  });

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: '12px',
    padding: '12px 16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  };

  const isMonthMode = timePeriod === 'MONTHLY';
  const canGoPrev = isMonthMode
    ? minMonth === null || selectedMonth > minMonth
    : minWeek === null || selectedWeek > minWeek;
  const canGoNext = isMonthMode
    ? maxMonth === null || selectedMonth < maxMonth
    : maxWeek === null || selectedWeek < maxWeek;

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'auto',
        backgroundColor: '#f2f2f2',
        color: '#1a1a1a',
        fontFamily: "'JetBrains Mono', monospace",
        paddingTop: 'env(safe-area-inset-top)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '20px', paddingRight: '20px', paddingBottom: '16px', paddingTop: '16px', position: 'relative' }}>
        {/* Left: hamburger */}
        <div style={{ width: 48, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 10 }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1a1a1a' }}
          >
            <Menu size={22} />
          </button>

          {menuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setMenuOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 'calc(100% + 4px)',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '24px',
                  padding: '10px 16px',
                  backgroundColor: '#f2f2f2',
                  borderRadius: '999px',
                  animation: 'fadeIn 0.15s ease-out',
                  zIndex: 100,
                  alignItems: 'center',
                }}
              >
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      onNavigate(item.page);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.15s',
                      borderRadius: '50%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Center: RUNNING+ */}
        <div style={{ flex: 1, textAlign: 'center', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.15s', pointerEvents: menuOpen ? 'none' : 'auto' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em', color: '#1a1a1a', textTransform: 'uppercase' }}>
            RUNNING+
          </span>
        </div>

        {/* Right: KINÉ */}
        <div style={{ width: 48, textAlign: 'right', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.15s', pointerEvents: menuOpen ? 'none' : 'auto' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 530,
            fontFamily: "'Archivo', sans-serif",
            fontStretch: '200%',
            letterSpacing: '0.8em',
            lineHeight: '1',
            color: '#1a1a1a',
            textTransform: 'uppercase',
          }}>
            KINÉ
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div className="px-5" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '16px' }}>
        {/* Period header */}
        <div style={{ fontFamily: "'Inconsolata', monospace", fontSize: '32px', fontWeight: 348, fontStretch: '175%', letterSpacing: '0.15em', color: 'rgba(0,0,0,0.2)', textTransform: 'uppercase', marginBottom: '8px' }}>
          {timePeriod === 'WEEKLY' ? `WEEK ${selectedWeek}` : timePeriod === 'MONTHLY' ? getMonthInfo(selectedMonth).label : 'PERIOD'}
        </div>

        {/* Big number */}
        <div className="flex items-start justify-between" style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: '#1a1a1a' }}>
              {displayTotal}
            </div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.15em', color: '#999', textTransform: 'uppercase' }}>
              {metricLabel}
            </div>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: '6px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                {sessionCount}
              </span>
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '2px', marginBottom: '4px' }}>
          {data.map((d, i) => {
            const pct = (d.value - minValue) / (maxValue - minValue);
            const height = pct * 100;
            const showBg = true;
            const hideZeroBar = timePeriod === 'MONTHLY' && d.value === 0;
            const isSelected = (timePeriod === 'WEEKLY' || timePeriod === 'PERIOD') && selectedBarIdx === i;
            const showTooltip = timePeriod === 'WEEKLY' || timePeriod === 'PERIOD';
            return (
              <div key={i} className="flex-1" style={{ height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', cursor: showTooltip ? 'pointer' : 'default' }}>
                {showBg && (
                  <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', top: 0, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '2px 2px 0 0' }} />
                )}
                {isSelected && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 900, color: '#1a1a1a', backgroundColor: 'rgba(0,0,0,0.06)', padding: '3px 8px', borderRadius: '4px' }}>
                      {d.value.toFixed(1)} {metricLabel}
                    </span>
                  </div>
                )}
                {!hideZeroBar && (
                  <div
                    onClick={() => showTooltip && setSelectedBarIdx(isSelected ? null : i)}
                    style={{ position: 'relative', zIndex: 1, width: '100%', height: `${Math.max(height, 1)}%`, backgroundColor: isSelected ? '#1a1a1a' : '#1a1a1a', borderRadius: '2px 2px 0 0', opacity: isSelected ? 1 : (0.15 + (Math.max(pct, 0) * 0.85)), transition: 'height 0.4s ease' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between items-center" style={{ paddingTop: '8px' }}>
          {data.map((d, i) => {
            const dayNum = parseInt(d.label, 10);
            const weekStarts = [1, 8, 15, 22, 29];
            const showLabel = timePeriod === 'MONTHLY'
              ? weekStarts.includes(dayNum)
              : true;
            return (
              <span key={i} className="flex-1 text-center" style={{ fontSize: '9px', fontWeight: 500, color: showLabel ? '#1a1a1a' : 'transparent', letterSpacing: '0.02em' }}>{showLabel ? d.label : ''}</span>
            );
          })}
        </div>
      </div>

      {/* Selectors + metric cards */}
      <div className="px-5" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', paddingTop: '8px' }}>
        {/* Two selectors side by side */}
        <div className="flex gap-2 mb-2">
          {/* Category selector */}
          <div className="flex-1 relative" style={{ position: 'relative' }} ref={categoryRef}>
            <button
              onClick={() => {
                const open = !categoryOpen;
                setCategoryOpen(open);
                setPeriodOpen(false);
              }}
              disabled={categoryOpen}
              style={pillStyle()}
            >
              {category}
              <ChevronDown size={12} />
            </button>
          </div>

          {/* Period selector */}
          <div className="flex-1" style={{ position: 'relative' }} ref={periodRef}>
            <button
              onClick={() => { setPeriodOpen(!periodOpen); setCategoryOpen(false); }}
              disabled={periodOpen}
              style={pillStyle()}
            >
              {timePeriod}
              <ChevronDown size={12} />
            </button>
            {periodOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0,
                backgroundColor: '#f2f2f2', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '10px', marginBottom: '4px', overflow: 'hidden', zIndex: 50,
                boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
              }}>
                {TIME_PERIODS.map(period => (
                  <button
                    key={period}
                    onClick={() => { setTimePeriod(period); setPeriodOpen(false); }}
                    style={{
                      width: '100%', padding: '10px 14px', textAlign: 'left',
                      border: 'none', background: timePeriod === period ? 'rgba(0,0,0,0.06)' : 'transparent',
                      fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#1a1a1a',
                      cursor: 'pointer',
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom metric cards */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
          {/* Total card */}
          <div style={{ ...cardStyle, flex: '1 1 0' }}>
            <span style={{ fontSize: '8px', fontWeight: 500, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'flex-start' }}>
              {metricLabel}
            </span>
            <span style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', marginTop: 'auto' }}>
              {displayTotal}
            </span>
          </div>

          {/* Week/Month number card with chevrons */}
          <div style={{ ...cardStyle, flex: '1 1 0', position: 'relative' }}>
            <span style={{ fontSize: '8px', fontWeight: 500, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', position: 'absolute', top: '12px', left: '16px' }}>
              {timePeriod === 'WEEKLY' ? 'WK' : timePeriod === 'MONTHLY' ? 'MT' : 'P'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
              <button
                onClick={() => {
                  if (isMonthMode) setMonthOffset(o => o - 1);
                  else setWeekOffset(o => o - 1);
                }}
                disabled={!canGoPrev}
                style={{
                  background: 'none', border: 'none', padding: '8px',
                  cursor: canGoPrev ? 'pointer' : 'default',
                  color: canGoPrev ? '#1a1a1a' : '#ccc',
                  display: 'flex', alignItems: 'center', flexShrink: 0,
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-0.02em', color: '#1a1a1a', textAlign: 'center', flex: 1, lineHeight: 1.2 }}>
                {timePeriod === 'MONTHLY' ? getMonthInfo(selectedMonth).label : selectedWeek}
              </span>
              <button
                onClick={() => {
                  if (isMonthMode) setMonthOffset(o => o + 1);
                  else setWeekOffset(o => o + 1);
                }}
                disabled={!canGoNext}
                style={{
                  background: 'none', border: 'none', padding: '8px',
                  cursor: canGoNext ? 'pointer' : 'default',
                  color: canGoNext ? '#1a1a1a' : '#ccc',
                  display: 'flex', alignItems: 'center', flexShrink: 0,
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;900&family=Inconsolata:wght@200..900&display=swap');
      `}</style>
    </div>
  );
};