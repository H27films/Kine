import React, { useState, useEffect, useRef } from 'react';
import { Home, ChevronDown, Menu } from 'lucide-react';
import { Page } from '../../types';
import { supabase } from '../../lib/supabase';
import { RunningManIcon, CaloriesIcon } from '../components/NavIcons';

interface DataPoint {
  occurrence: number;
  value: number;
  date: string;
  workoutId: string;
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
  const [data, setData] = useState<DataPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exercises, setExercises] = useState<string[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const exerciseRef = useRef<HTMLDivElement>(null);

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
        .eq('favourite', 'yes')
        .order('exercise_name');

      if (data) {
        setExercises(data.map(row => row.exercise_name as string));
      }
      setLoadingExercises(false);
    };
    loadExercises();
  }, [category]);

  const loadChartData = async () => {
    let query = supabase
      .from('workouts')
      .select('*, exercises(exercise_name)')
      .eq('type', category)
      .eq('exercises.favourite', 'yes')
      .order('date', { ascending: true });

    if (selectedExercise) {
      query = query.eq('exercise_name', selectedExercise);
    }

    const { data: rows } = await query;

    const points: DataPoint[] = [];
    let occurrence = 1;

    if (rows) {
      for (const row of rows as any[]) {
        const workoutId = row.id || `${row.date}-${row.exercise_name}`;
        const value = row.total_weight || 0;
        points.push({
          occurrence,
          value,
          date: row.date,
          workoutId,
        });
        occurrence++;
      }
    }

    setData(points);
    setSessionCount(points.length);
    const sum = points.reduce((acc, p) => acc + p.value, 0);
    setTotal(Math.round(sum));
  };

  useEffect(() => {
    setSelectedExercise(null);
    loadChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, selectedExercise]);

  const metricLabel = 'KG';
  const displayTotal = total.toLocaleString();

  // SVG chart dimensions
  const chartHeight = 180;
  const chartWidth = 340; // approximate width based on container
  const paddingX = 8;
  const paddingY = 20;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingY * 2;

  const minValue = data.length > 0 ? Math.min(...data.map(d => d.value)) : 0;
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 100;

  // Add some padding to y-scale
  const yMin = Math.min(0, minValue - (maxValue - minValue) * 0.1);
  const yMax = maxValue + (maxValue - minValue) * 0.1 || 10;

  const getX = (idx: number) => paddingX + (idx / Math.max(data.length - 1, 1)) * plotWidth;
  const getY = (val: number) => paddingY + plotHeight - ((val - yMin) / (yMax - yMin)) * plotHeight;

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

  // Generate X-axis tick labels (show a reasonable number)
  const tickCount = Math.min(data.length, 10);
  const tickIndices = data.length > 0 ? Array.from({ length: tickCount }, (_, i) => Math.round((i / (tickCount - 1)) * (data.length - 1))) : [];

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

        {/* SVG Line chart */}
        <div style={{ height: '180px', position: 'relative', marginBottom: '4px' }}>
          {data.length > 0 ? (
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ overflow: 'visible' }}
            >
              {/* Grid lines (horizontal) */}
              {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
                const y = paddingY + plotHeight * (1 - tick);
                return (
                  <line
                    key={i}
                    x1={paddingX}
                    y1={y}
                    x2={paddingX + plotWidth}
                    y2={y}
                    stroke="rgba(0,0,0,0.06)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
                const val = yMin + (yMax - yMin) * tick;
                const y = paddingY + plotHeight * (1 - tick);
                return (
                  <text
                    key={i}
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    style={{ fontSize: '9px', fontWeight: 500, color: 'rgba(0,0,0,0.4)', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {Math.round(val)}
                  </text>
                );
              })}

              {/* Line path */}
              {data.length > 1 && (
                <polyline
                  points={data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ')}
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {/* Data points (dots) */}
              {data.map((d, i) => {
                const x = getX(i);
                const y = getY(d.value);
                const isHovered = hoveredIdx === i;
                const radius = isHovered ? 6 : 4;
                return (
                  <g key={d.workoutId}>
                    <circle
                      cx={x}
                      cy={y}
                      r={radius}
                      fill="#1a1a1a"
                      stroke="#f2f2f2"
                      strokeWidth="2"
                      style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                    {isHovered && (
                      <g>
                        {/* Tooltip background */}
                        <rect
                          x={x - 24}
                          y={y - 42}
                          width="48"
                          height="28"
                          rx="4"
                          fill="rgba(0,0,0,0.9)"
                        />
                        {/* Tooltip text */}
                        <text
                          x={x}
                          y={y - 24}
                          textAnchor="middle"
                          style={{ fontSize: '11px', fontWeight: 700, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {d.value.toLocaleString()}
                        </text>
                        {/* Tooltip unit */}
                        <text
                          x={x}
                          y={y - 12}
                          textAnchor="middle"
                          style={{ fontSize: '8px', fontWeight: 500, color: '#ccc', fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          KG
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '12px' }}>
              No data for this selection
            </div>
          )}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between items-center" style={{ paddingTop: '8px' }}>
          {tickIndices.map((dataIdx, i) => {
            const point = data[dataIdx];
            const occurrence = point?.occurrence || dataIdx + 1;
            return (
              <span key={i} className="flex-1 text-center" style={{ fontSize: '9px', fontWeight: 500, color: '#1a1a1a', letterSpacing: '0.02em' }}>
                {occurrence}
              </span>
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
                setCategoryOpen(!categoryOpen);
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
              {selectedExercise || 'EXERCISE'}
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
                  EXERCISE
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

        {/* Bottom metric cards - reserved space for future use */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
          {/* Left card - empty placeholder */}
          <div style={{ ...cardStyle, flex: '1 1 0' }} />
          {/* Right card - empty placeholder */}
          <div style={{ ...cardStyle, flex: '1 1 0' }} />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;900&family=Inconsolata:wght@200..900&display=swap');
      `}</style>
    </div>
  );
};