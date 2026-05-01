import React, { useState, useEffect, useRef } from 'react';
import { Home, ChevronDown, Menu } from 'lucide-react';
import { Page } from '../../types';
import { supabase } from '../../lib/supabase';
import { RunningManIcon, CaloriesIcon } from '../components/NavIcons';
import { ChartArea } from '../components/ChartArea';

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

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exercises, setExercises] = useState<{id: string, name: string}[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
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
         .select('id, exercise_name')
         .eq('type', category)
         .eq('favourite', 'yes')
         .order('exercise_name');

       if (data) {
         setExercises(data.map(row => ({ id: row.id as string, name: row.exercise_name as string })));
       } else {
         setExercises([]);
       }
       setLoadingExercises(false);
     };
     loadExercises();
   }, [category]);

   const loadChartData = async () => {
     let query = supabase
       .from('workouts')
       .select('*, exercises(exercise_name, favourite, type)')
       .eq('exercises.favourite', 'yes')
       .order('date', { ascending: true });

     // Filter by category type from workouts table
     query = query.eq('type', category);

     // Filter by selected exercise_id if any
     if (selectedExerciseId) {
       query = query.eq('exercise_id', selectedExerciseId);
     }

     const { data: rows } = await query;

     const points: DataPoint[] = [];
     let occurrence = 1;

     if (rows) {
        if (selectedExerciseId) {
          // Individual exercise mode: each workout = one point
          for (const row of rows as any[]) {
            const workoutId = row.id || `${row.date}-${row.exercise_name}`;
            const value = row.total_weight || 0;
            points.push({ occurrence, value, date: row.date, workoutId });
            occurrence++;
          }
          // If more than 15 points, show only the most recent 10
          if (points.length > 15) {
            points = points.slice(-10);
          }
        } else {
          // Aggregate mode: group by week, sum total_weight per week (only non-zero weeks)
          const weeklySums: Record<number, number> = {};
          for (const row of rows as any[]) {
            const week = row.week;
            const value = row.total_weight || 0;
            if (week != null) {
              weeklySums[week] = (weeklySums[week] || 0) + value;
            }
          }
          // Only include weeks with sum > 0, sorted by week
          Object.entries(weeklySums)
            .filter(([, sum]) => sum > 0)
            .sort(([weekA], [weekB]) => parseInt(weekA) - parseInt(weekB))
            .forEach(([week, sum]) => {
              points.push({ occurrence: parseInt(week), value: sum, date: week, workoutId: week });
              occurrence++;
            });
        }
     }

      setData(points);
      setSessionCount(points.length);
      if (selectedExerciseId) {
        const maxVal = points.length > 0 ? Math.max(...points.map(p => p.value)) : 0;
        setTotal(Math.round(maxVal));
      } else {
        const sum = points.reduce((acc, p) => acc + p.value, 0);
        setTotal(Math.round(sum));
      }
   };

   useEffect(() => {
     // Reset to no specific exercise when category changes
     setSelectedExercise(null);
     setSelectedExerciseId(null);
   }, [category]);

   useEffect(() => {
     loadChartData();
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [category, selectedExerciseId]);

  const metricLabel = 'KG';

  const navItems: NavItem[] = [
    { label: 'Home', icon: <Home size={20} />, page: 'dashboard' },
    { label: 'Weights', icon: <DumbbellIconSmall size={21} />, page: 'weights' },
    { label: 'Cardio', icon: <RunningManIcon size={24} color="#1a1a1a" />, page: 'cardio' },
    { label: 'Calories', icon: <CaloriesIcon size={20} color="#1a1a1a" />, page: 'calories' },
    { label: 'Profile', icon: <ProfileUserIcon size={20} />, page: 'profile' },
  ];

   const pillStyle = (): React.CSSProperties => ({
     width: '100%',
     padding: '20px 18px',
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

        <div className="px-5" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '16px' }}>
          <ChartArea mode={selectedExercise ? 'exercise' : 'aggregate'} data={data} total={total} sessionCount={sessionCount} metricLabel={metricLabel} selectedExercise={selectedExercise} category={category} />
        </div>


       {/* Selectors + metric cards */}
      <div className="px-5" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', paddingTop: '8px' }}>
        {/* Two selectors side by side */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          {/* Category selector */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }} ref={categoryRef}>
            <button
              onClick={() => {
                setCategoryOpen(!categoryOpen);
                setExerciseOpen(false);
              }}
              disabled={categoryOpen}
              style={{ ...pillStyle(), flex: 1 }}
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
                    onClick={() => { setCategory(cat); setCategoryOpen(false); setSelectedExercise(null); setSelectedExerciseId(null); }}
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
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }} ref={exerciseRef}>
            <button
              onClick={() => { setExerciseOpen(!exerciseOpen); setCategoryOpen(false); }}
              disabled={exerciseOpen}
              style={{ ...pillStyle(), flex: 1 }}
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
                    onClick={() => { setSelectedExercise(null); setSelectedExerciseId(null); setExerciseOpen(false); }}
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
                        key={ex.id}
                        onClick={() => { setSelectedExercise(ex.name); setSelectedExerciseId(ex.id); setExerciseOpen(false); }}
                        style={{
                          width: '100%', padding: '10px 14px', textAlign: 'left',
                          border: 'none', background: selectedExercise === ex.name ? 'rgba(0,0,0,0.06)' : 'transparent',
                          fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#1a1a1a',
                          cursor: 'pointer',
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {ex.name}
                      </div>
                    ))
                  )}
              </div>
            )}
           </div>
         </div>
       </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;900&family=Inconsolata:wght@200..900&display=swap');
      `}</style>
    </div>
  );
};