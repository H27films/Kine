import React, { useState, useEffect, useRef } from 'react';
import { Home, ChevronDown, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { Page } from '../../types';
import { supabase } from '../../lib/supabase';
import { RunningManIcon, CaloriesIcon } from '../components/NavIcons';

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DataPoint {
  label: string;
  value: number;
}

interface WeightsPlusProps {
  onNavigate: (page: Page) => void;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  page: Page;
}

const DumbbellIconSmall = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ transform: 'rotate(-45deg)' }}>
    <path d="M7,25c-1.7,0-3-1.3-3-3V10c0-1.7,1.3-3,3-3s3,1.3,3,3v12C10,23.7,8.7,25,7,25z" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M25,25c-1.7,0-3-1.3-3-3V10c0-1.7,1.3-3,3-3s3,1.3,3,3v12C28,23.7,26.7,25,25,25z" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23,17H9c-0.6,0-1-0.4-1-1s0.4-1,1-1h14c0.6,0,1,0.4,1,1S23.6,17,23,17z" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2,10.2c-1.2,0.4-2,1.5-2,2.8v6c0,1.3,0.8,2.4,2,2.8V10.2z" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M30,10.2v11.6c1.2-0.4,2-1.5,2-2.8v-6C32,11.7,31.2,10.6,30,10.2z" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ProfileUserIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path fillRule="evenodd" clipRule="evenodd" d="M16.5 7.063C16.5 10.258 14.57 13 12 13c-2.572 0-4.5-2.742-4.5-5.938C7.5 3.868 9.16 2 12 2s4.5 1.867 4.5 5.063zM4.102 20.142C4.487 20.6 6.145 22 12 22c5.855 0 7.512-1.4 7.898-1.857a.416.416 0 0 0 .09-.317C19.9 18.944 19.106 15 12 15s-7.9 3.944-7.989 4.826a.416.416 0 0 0 .091.317z" fill="#1a1a1a" />
  </svg>
);

export const WeightsPlus: React.FC<WeightsPlusProps> = ({ onNavigate }) => {
  const [category, setCategory] = useState('CHEST');
  const [timePeriod, setTimePeriod] = useState('WEEKLY');
  const [data, setData] = useState<DataPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exercises, setExercises] = useState<string[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const exerciseRef = useRef<HTMLDivElement>(null);
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
     const handler = (e: MouseEvent) => {
       if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
         setMenuOpen(false);
       }
       if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
         setCategoryOpen(false);
       }
       if (exerciseRef.current && !exerciseRef.current.contains(e.target as Node)) {
         setExerciseOpen(false);
       }
     };
     document.addEventListener('mousedown', handler);
     return () => document.removeEventListener('mousedown', handler);
   }, []);

   useEffect(() => {
     const loadExercises = async () => {
       setLoadingExercises(true);
       const { data } = await supabase
         .from('exercises')
         .select('exercise_name')
         .eq('type', category)
         .order('exercise_name');

       if (data) {
         setExercises(data.map(row => row.exercise_name as string));
       }
       setLoadingExercises(false);
     };
     loadExercises();
    }, [category]);

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

     let query = supabase.from('workouts').select('*, exercises(exercise_name)');
     if (timePeriod === 'MONTHLY') {
       query = query.gte('date', dateStart!).lte('date', dateEnd!);
     } else {
       query = query.in('week', weekNumbers);
     }
     // Filter by category type
     query = query.eq('type', category);
     // Filter by selected exercise if any
     if (selectedExercise) {
       query = query.eq('exercise_name', selectedExercise);
     }

    const { data: rows } = await query;

    const values = new Array(labels.length).fill(0);
    const count = new Array(labels.length).fill(0);
    let rawTotal = 0;
    let sessionRows = 0;

    if (rows) {
      for (const row of rows as any[]) {
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
          const val = row.total_weight || 0;
          rawTotal += val;
          values[idx] += val;
          count[idx]++;
        }
      }
    }

    const points = labels.map((label, i) => ({
      label,
      value: Math.round(values[i]),
    }));
    setData(points);
    setTotal(Math.round(values.reduce((a, b) => a + b, 0)));
    setSessionCount(sessionRows);
  };

   useEffect(() => {
     setWeekOffset(0);
     setMonthOffset(0);
     setSelectedBarIdx(null);
     setSessionCount(0);
     loadChartData();
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [category, timePeriod, currentWeek, currentMonth, selectedExercise]);

   useEffect(() => { loadChartData(); }, [weekOffset, monthOffset, timePeriod, selectedExercise]);

  const minValue = Math.min(...data.map(d => d.value), 0);
  const maxValue = Math.max(...data.map(d => d.value), minValue + 1);
  const metricLabel = 'KG';

  const displayTotal = total.toLocaleString();

   const navItems: NavItem[] = [
     { label: 'Home', icon: <Home size={20} />, page: 'dashboard' },
     { label: 'Weights', icon: <DumbbellIconSmall size={21} />, page: 'weights' },
     { label: 'Cardio', icon: <RunningManIcon size={24} color="#1a1a1a" />, page: 'cardio' },
     { label: 'Calories', icon: <CaloriesIcon size={20} color="#1a1a1a" />, page: 'calories' },
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
        overflow: 'hidden',
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

        {/* Center: WEIGHTS+ */}
        <div style={{ flex: 1, textAlign: 'center', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.15s', pointerEvents: menuOpen ? 'none' : 'auto' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em', color: '#1a1a1a', textTransform: 'uppercase' }}>
            WEIGHTS+
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
          PROGRESS
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
                      {d.value.toLocaleString()} {metricLabel}
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
                 setExerciseOpen(false);
               }}
               disabled={categoryOpen}
               style={pillStyle()}
             >
               {category}
               <ChevronDown size={12} />
             </button>
             {categoryOpen && (
               <div style={{
                 position: 'absolute', bottom: '100%', left: 0, right: 0,
                 backgroundColor: '#f2f2f2', border: '1px solid rgba(0,0,0,0.08)',
                 borderRadius: '10px', marginBottom: '4px', overflow: 'hidden', zIndex: 50,
                 boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
                 maxHeight: '300px',
                 overflowY: 'auto',
               }}>
                 {['CHEST', 'BACK', 'LEGS'].map(cat => (
                   <div
                     key={cat}
                     onClick={() => { setCategory(cat); setCategoryOpen(false); setSelectedExercise(null); }}
                     style={{
                       width: '100%', padding: '10px 14px', textAlign: 'left',
                       border: 'none', background: category === cat ? 'rgba(0,0,0,0.06)' : 'transparent',
                       fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#1a1a1a',
                       cursor: 'pointer',
                     }}
                     role="button"
                     tabIndex={0}
                   >
                     {cat}
                   </div>
                 ))}
               </div>
             )}
           </div>

           {/* Exercise selector */}
           <div className="flex-1" style={{ position: 'relative' }} ref={exerciseRef}>
             <button
               onClick={() => { setExerciseOpen(!exerciseOpen); setCategoryOpen(false); }}
               disabled={exerciseOpen}
               style={pillStyle()}
             >
               {selectedExercise || 'ALL'}
               <ChevronDown size={12} />
             </button>
             {exerciseOpen && (
               <div style={{
                 position: 'absolute', bottom: '100%', left: 0, right: 0,
                 backgroundColor: '#f2f2f2', border: '1px solid rgba(0,0,0,0.08)',
                 borderRadius: '10px', marginBottom: '4px', overflow: 'hidden', zIndex: 50,
                 boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
                 maxHeight: '300px',
                 overflowY: 'auto',
               }}>
                 <div
                   onClick={() => { setSelectedExercise(null); setExerciseOpen(false); }}
                   style={{
                     width: '100%', padding: '10px 14px', textAlign: 'left',
                     border: 'none', background: !selectedExercise ? 'rgba(0,0,0,0.06)' : 'transparent',
                     fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#1a1a1a',
                     cursor: 'pointer',
                   }}
                   role="button"
                   tabIndex={0}
                 >
                   ALL
                 </div>
                 {loadingExercises ? (
                   <div style={{ padding: '12px', fontSize: '10px', color: '#999', textAlign: 'center' }}>Loading...</div>
                 ) : (
                   exercises.map(ex => (
                     <div
                       key={ex}
                       onClick={() => { setSelectedExercise(ex); setExerciseOpen(false); }}
                       style={{
                         width: '100%', padding: '10px 14px', textAlign: 'left',
                         border: 'none', background: selectedExercise === ex ? 'rgba(0,0,0,0.06)' : 'transparent',
                         fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#1a1a1a',
                         cursor: 'pointer',
                       }}
                       role="button"
                       tabIndex={0}
                     >
                       {ex}
                     </div>
                   ))
                 )}
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