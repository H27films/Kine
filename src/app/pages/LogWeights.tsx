import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Plus, Minus, Check, X } from 'lucide-react';
import { Page } from '../../types';
import { supabase, Exercise, todayStr, getISOWeek, getDayName, weeksAgoMonday, recalculateDailyTotals } from '../../lib/supabase';
import WeeklyVolumeSection from '../components/WeeklyVolumeSection';
import RecentLogsSection from '../components/RecentLogsSection';

interface LogWeightsProps {
  onNavigate: (page: Page) => void;
}

const tabs: { label: string; page: Page }[] = [
  { label: 'Weights', page: 'weights' },
  { label: 'Cardio', page: 'cardio' },
  { label: 'Calories', page: 'calories' },
];

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];
// GROUP_ORDER not used anymore

const TYPE2_ORDER: Record<string, number> = {
  'BODY WEIGHT': 0,
  'BAR': 1,
  'DUMB BELL': 2,
  'MACHINE': 3,
};

const TYPE2_LABELS: Record<string, string> = {
  'BODY WEIGHT': 'Body Weight',
  'BAR': 'Bar',
  'DUMB BELL': 'Dumbbell',
  'MACHINE': 'Machine',
};

interface SetRow {
  weight: string;
  reps: number;
}

interface AddedExercise {
  exercise: Exercise;
  sets: SetRow[];
  expanded: boolean;
  logged: boolean;
  copied: boolean;
  lastSets: SetRow[] | null;
  fail: boolean;
}

const makeDefaultSets = (): SetRow[] =>
  Array.from({ length: 4 }, () => ({ weight: '', reps: 10 }));

const STORAGE_KEY = 'kine_logweights_v1';

export const LogWeights: React.FC<LogWeightsProps> = ({ onNavigate }) => {
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).selectedGroup || '';
    } catch {}
    return '';
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_groupOpen, setGroupOpen] = useState(false);
  const [exerciseOpen, setExerciseOpen] = useState(false);

  const [addedExercises, setAddedExercises] = useState<AddedExercise[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).addedExercises || [];
    } catch {}
    return [];
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [swipeOffsets, setSwipeOffsets] = useState<Record<number, number>>({});
  const touchStartX = useRef<Record<number, number>>({});

  const [exercisesByGroup, setExercisesByGroup] = useState<Record<string, Exercise[]>>({});
  const [thisWeekTotal, setThisWeekTotal] = useState<number>(0);
  const [lastWeekTotal, setLastWeekTotal] = useState<number>(0);
  const [todayTotal, setTodayTotal] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const groupRef = useRef<HTMLDivElement>(null);
  const exerciseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedGroup, addedExercises }));
    } catch {}
  }, [selectedGroup, addedExercises]);

  useEffect(() => {
    const loadExercises = async () => {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .in('type', WEIGHT_TYPES)
        .order('exercise_name');
      if (data) {
        const grouped: Record<string, Exercise[]> = {};
        for (const ex of data as Exercise[]) {
          const key = ex.type.charAt(0) + ex.type.slice(1).toLowerCase();
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(ex);
        }
        for (const key of Object.keys(grouped)) {
          grouped[key].sort((a, b) => {
            const aOrder = TYPE2_ORDER[a.type2 ?? ''] ?? 99;
            const bOrder = TYPE2_ORDER[b.type2 ?? ''] ?? 99;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return (a.exercise_name || '').localeCompare(b.exercise_name || '');
          });
        }
        setExercisesByGroup(grouped);
      }
    };
    loadExercises();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
      if (exerciseRef.current && !exerciseRef.current.contains(e.target as Node)) setExerciseOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const loadVolume = async () => {
      const thisMonday = weeksAgoMonday(0);
      const lastMonday = weeksAgoMonday(1);
      const today = todayStr();
      const [{ data: thisData }, { data: lastData }, { data: todayData }] = await Promise.all([
        supabase
          .from('workouts')
          .select('total_weight')
          .in('type', ['CHEST', 'BACK', 'LEGS'])
          .gte('date', thisMonday),
        supabase
          .from('workouts')
          .select('total_weight')
          .in('type', ['CHEST', 'BACK', 'LEGS'])
          .gte('date', lastMonday)
          .lt('date', thisMonday),
        supabase
          .from('workouts')
          .select('total_weight')
          .in('type', ['CHEST', 'BACK', 'LEGS'])
          .eq('date', today),
      ]);
      const sum = (rows: any[] | null) =>
        (rows || []).reduce((s: number, r: any) => s + Number(r.total_weight || 0), 0);
      setThisWeekTotal(sum(thisData));
      setLastWeekTotal(sum(lastData));
      setTodayTotal(sum(todayData));
    };
    loadVolume();
  }, []);

  const fmtVol = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;

  const handleSelectGroup = (group: string) => {
    // Toggle: if clicking same group, deselect it
    setSelectedGroup(selectedGroup === group ? '' : group);
    setExerciseOpen(false);
  };

  const handleAddExercise = async (exercise: Exercise) => {
    if (addedExercises.find(e => e.exercise.id === exercise.id)) return;

    const { data } = await supabase
      .from('workouts')
      .select('w1,r1,w2,r2,w3,r3,w4,r4,w5,r5,w6,r6')
      .eq('exercise_id', exercise.id)
      .order('date', { ascending: false })
      .limit(1);

    let lastSets: SetRow[] | null = null;
    if (data && data.length > 0) {
      const row = data[0] as any;
      const parsed: SetRow[] = [];
      for (let i = 1; i <= 6; i++) {
        const w = row[`w${i}`];
        const r = row[`r${i}`];
        if (w != null && Number(w) > 0) {
          parsed.push({ weight: String(Number(w)), reps: Number(r) || 10 });
        }
      }
      if (parsed.length > 0) lastSets = parsed;
    }

    setAddedExercises(prev => [...prev, {
      exercise,
      sets: makeDefaultSets(),
      expanded: false,
      logged: false,
      copied: false,
      lastSets,
      fail: false,
    }]);
  };

  const toggleExpanded = (id: number) => {
    setAddedExercises(prev => prev.map(e => e.exercise.id === id ? { ...e, expanded: !e.expanded } : e));
  };

  const removeExercise = (id: number) => {
    setAddedExercises(prev => prev.filter(e => e.exercise.id !== id));
  };

  const updateSet = (id: number, setIdx: number, field: 'weight' | 'reps', value: string | number) => {
    setAddedExercises(prev => prev.map(e => {
      if (e.exercise.id !== id) return e;
      const sets = e.sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s);
      return { ...e, sets };
    }));
  };

  const adjustWeight = (id: number, setIdx: number, delta: number) => {
    setAddedExercises(prev => prev.map(e => {
      if (e.exercise.id !== id) return e;
      const sets = e.sets.map((s, i) => {
        if (i !== setIdx) return s;
        const current = parseFloat(s.weight) || 0;
        const next = Math.max(0, Math.round((current + delta) * 10) / 10);
        return { ...s, weight: next === 0 ? '' : String(next) };
      });
      return { ...e, sets };
    }));
  };

  const addSet = (id: number) => {
    setAddedExercises(prev => prev.map(e => {
      if (e.exercise.id !== id || e.sets.length >= 6) return e;
      return { ...e, sets: [...e.sets, { weight: '', reps: 10 }] };
    }));
  };

  const loadLastSession = (id: number) => {
    setAddedExercises(prev => prev.map(e => {
      if (e.exercise.id !== id) return e;
      if (!e.lastSets || e.lastSets.length === 0) {
        return { ...e, expanded: true };
      }
      return { ...e, sets: [...e.lastSets], expanded: true, copied: true };
    }));
  };

  const toggleCopyFromLast = (id: number) => {
    const ex = addedExercises.find(e => e.exercise.id === id);
    if (!ex) return;
    if (ex.copied) {
      setAddedExercises(prev => prev.map(e => e.exercise.id !== id ? e : { ...e, copied: false, sets: makeDefaultSets() }));
    } else {
      if (!ex.lastSets || ex.lastSets.length === 0) return;
      setAddedExercises(prev => prev.map(e => {
        if (e.exercise.id !== id) return e;
        return { ...e, sets: [...e.lastSets!], copied: true };
      }));
    }
  };

  const toggleFail = (id: number) => {
    setAddedExercises(prev => prev.map(e => e.exercise.id === id ? { ...e, fail: !e.fail } : e));
  };

  const handleLogAll = async () => {
    setSaving(true);
    const today = todayStr();
    const week = getISOWeek();
    const day = getDayName();

    try {
      for (const ex of addedExercises) {
        const filledSets = ex.sets.filter(s => s.weight !== '');
        if (filledSets.length === 0) continue;

        const setData: Record<string, number | null> = {};
        for (let i = 0; i < 6; i++) {
          const s = ex.sets[i];
          if (s && s.weight !== '') {
            setData[`w${i + 1}`] = parseFloat(s.weight) || null;
            setData[`r${i + 1}`] = s.reps || null;
          } else {
            setData[`w${i + 1}`] = null;
            setData[`r${i + 1}`] = null;
          }
        }

        const multiplier = ex.exercise.multiplier ?? 1;
        const rawVolume = ex.sets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * s.reps, 0);
        const totalWeight = rawVolume * multiplier;

        await supabase.from('workouts').insert({
          date: today,
          week,
          day,
          type: ex.exercise.type,
          exercise_id: ex.exercise.id,
          multiplier,
          total_weight: totalWeight,
          total_score_k: totalWeight,
          sets: filledSets.length,
          new_entry: 'New',
          fail: ex.fail ? 'Fail' : null,
          source: 'app',
          ...setData,
        });
      }

      await recalculateDailyTotals(today);

      setAddedExercises([]);
      setRefreshKey(k => k + 1); // signal RecentLogsSection to re-fetch
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const calcExerciseTotal = (sets: SetRow[], multiplier: number = 1): number =>
    sets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * s.reps, 0) * multiplier;

  const grandTotal = addedExercises.reduce((acc, ex) => acc + calcExerciseTotal(ex.sets, ex.exercise.multiplier ?? 1), 0);

  const textTriggerStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: '#000000',
    borderRadius: 0,
    overflow: 'hidden',
    boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
  };

  const orderedGroups: string[] = [];
  void orderedGroups;

  const renderExerciseDropdown = () => {
    const exercises = exercisesByGroup[selectedGroup] || [];
    if (exercises.length === 0) return null;

    const items: React.ReactNode[] = [];
    let lastType2: string | null = undefined as any;

    exercises.forEach((ex, i) => {
      const t2 = ex.type2 ?? '';
      const alreadyAdded = !!addedExercises.find(e => e.exercise.id === ex.id);

      if (t2 !== lastType2) {
        lastType2 = t2;
        const label = TYPE2_LABELS[t2] || t2;
        items.push(
          <div key={`header-${t2}`} style={{
            padding: '10px 16px 6px 16px',
            borderTop: items.length > 0 ? '1px solid rgba(255,255,255,0.12)' : 'none',
          }}>
            <span style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.9)',
            }}>{label}</span>
          </div>
        );
      }

      items.push(
        <div
          key={ex.id}
          onClick={() => !alreadyAdded && handleAddExercise(ex)}
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: i < exercises.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            backgroundColor: alreadyAdded ? 'rgba(255,255,255,0.04)' : 'transparent',
            cursor: alreadyAdded ? 'default' : 'pointer',
          }}
        >
          <div>
            <span style={{ color: alreadyAdded ? '#555' : '#cccccc', fontSize: '0.875rem' }}>
              {ex.exercise_name.charAt(0).toUpperCase() + ex.exercise_name.slice(1).toLowerCase()}
            </span>
            {ex.info_notes && (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                {ex.info_notes}
              </span>
            )}
          </div>
          <div
            style={{
              width: 28, height: 28, borderRadius: '50%',
              backgroundColor: alreadyAdded ? '#2a2a2a' : '#ffffff',
              color: alreadyAdded ? '#444' : '#1a1a1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Plus size={14} strokeWidth={3} />
          </div>
        </div>
      );
    });

    return items;
  };

  return (
    <div>
      <nav className="flex gap-8 mb-12 items-end">
        {tabs.map(tab => {
          const isActive = tab.page === 'weights';
          return (
            <button key={tab.page} onClick={() => onNavigate(tab.page)} className="flex flex-col items-center" style={{ filter: isActive ? 'none' : 'blur(0.4px)' }}>
              <span className="uppercase tracking-widest transition-all" style={{ color: isActive ? '#ffffff' : 'rgba(226,226,226,0.65)', fontWeight: isActive ? 900 : 400, fontSize: isActive ? '0.875rem' : '0.65rem', letterSpacing: '0.15em' }}>
                {tab.label}
              </span>
              {isActive && <div className="h-1 w-1 rounded-full mt-1" style={{ backgroundColor: '#ffffff' }} />}
            </button>
          );
        })}
      </nav>

      {/* Weekly volume display */}
      <div className="flex items-start mb-8">
        <div className="text-[3.25rem] font-black leading-none tracking-tighter text-white flex-shrink-0">
          {fmtVol(thisWeekTotal)}
        </div>
        <div className="flex flex-col justify-center ml-4 pt-1 flex-1 min-w-0">
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2.5px', color: '#ffffff' }}>
            VOLUME (KG)
          </div>
          {lastWeekTotal > 0 && (
            <div className="text-[11px] font-medium mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Last week {fmtVol(lastWeekTotal)} kg
            </div>
          )}
        </div>
        {todayTotal > 0 && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginLeft: 'auto', alignSelf: 'flex-start', marginTop: '20px' }}>
            <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em', lineHeight: 1 }}>{Math.round(todayTotal).toLocaleString()}</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KG TODAY</span>
          </div>
        )}
      </div>

      <section className="mb-12">
        {/* Muscle group circles */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '24px', flex: 1, justifyContent: 'space-between' }}>
            {['Chest', 'Back', 'Legs'].map(group => (
              <button
                key={group}
                onClick={() => handleSelectGroup(group)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: selectedGroup === group ? '#ffffff' : 'transparent',
                  border: '2px solid #ffffff',
                  boxShadow: selectedGroup === group ? '0 0 16px rgba(255,255,255,0.5)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {selectedGroup && (
                    <Check size={24} color="#000000" strokeWidth={3} />
                  )}
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: '#ffffff',
                }}>
                  {group}
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedGroup && (
          <div ref={exerciseRef} className="relative">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div onClick={() => setExerciseOpen(o => !o)} style={textTriggerStyle}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', fontWeight: 500, letterSpacing: '0.03em' }}>Choose exercise...</span>
                <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)', transform: exerciseOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              {exerciseOpen && (
                <button onClick={() => setExerciseOpen(false)} style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.35)', padding: '4px', flexShrink: 0, marginLeft: '8px' }}>
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </div>
            {exerciseOpen && (
              <div style={{ ...dropdownStyle, top: 'calc(100% + 6px)', left: 0, right: 0, maxHeight: '65vh', overflowY: 'auto' }}>
                {renderExerciseDropdown()}
              </div>
            )}
          </div>
        )}
      </section>

      {addedExercises.length > 0 && grandTotal > 0 && (
        <div className="flex items-baseline gap-2 mb-6 mt-2">
          <span style={{ fontSize: '2.6rem', fontWeight: 900, lineHeight: 1, color: '#ffffff', letterSpacing: '-0.02em' }}>{grandTotal.toLocaleString()}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>KG</span>
        </div>
      )}

      {addedExercises.length > 0 && (
        <section className="mb-10">
          <div className="space-y-0">
            {addedExercises.map(ex => {
              const lastSummary = ex.lastSets && ex.lastSets.length > 0
                ? `Last: ${ex.lastSets.length} sets — ${ex.lastSets[0].weight}kg × ${ex.lastSets[0].reps}`
                : 'No previous data';
              const hasData = ex.sets.some(s => s.weight !== '');
              const exTotal = calcExerciseTotal(ex.sets, ex.exercise.multiplier ?? 1);

              const swipeOffset = swipeOffsets[ex.exercise.id] || 0;

              return (
                <div key={ex.exercise.id} style={{ position: 'relative', overflow: 'hidden' }}>
                  {/* Red remove reveal */}
                  {!ex.expanded && (
                    <div style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0,
                      width: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: '#ef4444',
                    }}>
                      <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em' }}>REMOVE</span>
                    </div>
                  )}
                  <div
                    className="flex items-center gap-4 py-4"
                    style={{
                      borderBottom: ex.expanded ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      transform: ex.expanded ? 'none' : `translateX(${swipeOffset}px)`,
                      transition: swipeOffset === 0 ? 'transform 0.25s ease' : 'none',
                      backgroundColor: '#000000',
                      willChange: 'transform',
                    }}
                    onTouchStart={ex.expanded ? undefined : (e) => {
                      touchStartX.current[ex.exercise.id] = e.touches[0].clientX;
                    }}
                    onTouchMove={ex.expanded ? undefined : (e) => {
                      const dx = e.touches[0].clientX - (touchStartX.current[ex.exercise.id] || 0);
                      if (dx < 0) {
                        setSwipeOffsets(prev => ({ ...prev, [ex.exercise.id]: Math.max(dx, -80) }));
                      }
                    }}
                    onTouchEnd={ex.expanded ? undefined : () => {
                      const offset = swipeOffsets[ex.exercise.id] || 0;
                      if (offset < -50) {
                        setAddedExercises(prev => prev.filter(e => e.exercise.id !== ex.exercise.id));
                        setSwipeOffsets(prev => { const n = { ...prev }; delete n[ex.exercise.id]; return n; });
                      } else {
                        setSwipeOffsets(prev => ({ ...prev, [ex.exercise.id]: 0 }));
                      }
                    }}
                  >
                    <div
                      onClick={(e) => { e.stopPropagation(); loadLastSession(ex.exercise.id); }}
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: hasData || ex.logged ? 'none' : '2px solid rgba(255,255,255,0.2)',
                        backgroundColor: hasData || ex.logged ? '#ffffff' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.25s',
                        cursor: 'pointer',
                      }}
                    >
                      {(hasData || ex.logged) && <Check size={14} color="#1a1a1a" strokeWidth={3} />}
                    </div>

                    <div className="flex-grow flex items-center justify-between" onClick={() => toggleExpanded(ex.exercise.id)} style={{ cursor: 'pointer' }}>
                      <div>
                        <p className="font-bold text-sm text-white">
                          {ex.exercise.exercise_name.charAt(0).toUpperCase() + ex.exercise.exercise_name.slice(1).toLowerCase()}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{lastSummary}</p>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                        {ex.expanded ? <ChevronUp size={20} /> : <ChevronRight size={20} />}
                      </div>
                    </div>
                  </div>

                  {ex.expanded && (
                    <div className="pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-baseline gap-1">
                          {exTotal > 0 && (
                            <>
                              <span className="font-black" style={{ fontSize: '1.5rem', color: '#ffffff', lineHeight: 1 }}>{exTotal.toLocaleString()}</span>
                              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ffffff' }}>KG</span>
                            </>
                          )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleCopyFromLast(ex.exercise.id); }}
                          style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: ex.copied ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)', border: ex.copied ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ex.copied ? '#ffffff' : 'rgba(255,255,255,0.55)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}>
                          {ex.copied ? <Minus size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
                        </button>
                      </div>

                      <div className="grid mb-2" style={{ gridTemplateColumns: '1.8rem 1fr 1fr 1fr', gap: '0.5rem' }}>
                        <div />
                        {['kg', 'reps', 'total'].map(h => <p key={h} className="text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</p>)}
                      </div>

                      {ex.sets.map((set, idx) => {
                        const w = parseFloat(set.weight) || 0;
                        const rowTotal = w * set.reps;
                        const rowHasData = set.weight !== '';
                        const numColor = rowHasData ? '#ffffff' : 'rgba(255,255,255,0.25)';
                        return (
                          <div key={idx} className="grid items-center mb-2" style={{ gridTemplateColumns: '1.8rem 1fr 1fr 1fr', gap: '0.5rem' }}>
                            <p className="font-black" style={{ fontSize: '1rem', color: numColor, lineHeight: 1, textAlign: 'center' }}>{idx + 1}</p>

                            <div
                              className="flex items-center justify-between rounded-lg py-2 px-2"
                              style={{ backgroundColor: '#1b1b1b', border: '1px solid rgba(255,255,255,0.07)' }}
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={() => adjustWeight(ex.exercise.id, idx, -1)}
                                style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                              >−</button>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={set.weight}
                                placeholder="—"
                                onChange={e => updateSet(ex.exercise.id, idx, 'weight', e.target.value)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  outline: 'none',
                                  width: '100%',
                                  textAlign: 'center',
                                  fontSize: '0.875rem',
                                  fontWeight: 700,
                                  color: rowHasData ? '#ffffff' : 'rgba(255,255,255,0.3)',
                                  MozAppearance: 'textfield',
                                }}
                              />
                              <button
                                onClick={() => adjustWeight(ex.exercise.id, idx, 1)}
                                style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                              >+</button>
                            </div>

                            <div className="flex items-center justify-between rounded-lg py-2 px-2" style={{ backgroundColor: '#1b1b1b', border: '1px solid rgba(255,255,255,0.07)' }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => updateSet(ex.exercise.id, idx, 'reps', Math.max(1, set.reps - 1))} style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>−</button>
                              <span className="font-bold" style={{ fontSize: '0.875rem', color: rowHasData ? '#ffffff' : 'rgba(255,255,255,0.3)' }}>{set.reps}</span>
                              <button onClick={() => updateSet(ex.exercise.id, idx, 'reps', set.reps + 1)} style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>+</button>
                            </div>

                            <p className="text-center font-bold" style={{ fontSize: '0.875rem', color: '#ffffff' }}>{rowTotal > 0 ? rowTotal : ''}</p>
                          </div>
                        );
                      })}

                      <div className="flex items-center gap-5 mt-4 flex-wrap">
                        {ex.sets.length < 6 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); addSet(ex.exercise.id); }}
                            className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
                            style={{ color: 'rgba(255,255,255,0.35)' }}
                          >
                            <Plus size={13} /><span>Set</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeExercise(ex.exercise.id); }}
                          className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
                          style={{ color: 'rgba(255,80,80,0.55)' }}
                        >
                          <Minus size={13} /><span>Remove Ex.</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFail(ex.exercise.id); }}
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{
                            padding: '3px 12px',
                            borderRadius: '999px',
                            border: ex.fail
                              ? '1px solid rgba(255,80,80,0.7)'
                              : '1px solid rgba(255,255,255,0.12)',
                            backgroundColor: ex.fail ? 'rgba(255,80,80,0.15)' : 'transparent',
                            color: ex.fail ? '#ff5050' : 'rgba(255,255,255,0.28)',
                            transition: 'all 0.2s',
                            letterSpacing: '0.1em',
                          }}
                        >
                          Fail
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={handleLogAll} disabled={saving}
            className="w-full mt-8 py-4 rounded-full font-black uppercase tracking-widest text-sm active:scale-95 duration-150"
            style={{ backgroundColor: saveSuccess ? '#22c55e' : '#ffffff', color: '#1a1c1c', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Log Exercises'}
          </button>
        </section>
      )}

      <WeeklyVolumeSection />

      <RecentLogsSection refreshKey={refreshKey} />
    </div>
  );
};
