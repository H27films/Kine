import React, { useState, useRef, useEffect } from 'react';
import { Dumbbell, ChevronDown, ChevronRight, ChevronUp, Plus, Minus, Clock, Check, X, Calendar } from 'lucide-react';
import { Page } from '../../types';
import { supabase, Exercise, todayStr, getISOWeek, getDayName, currentWeekMonday, weeksAgoMonday, recalculateDailyTotals } from '../../lib/supabase';

interface LogWeightsProps {
  onNavigate: (page: Page) => void;
}

const tabs: { label: string; page: Page }[] = [
  { label: 'Weights', page: 'weights' },
  { label: 'Cardio', page: 'cardio' },
  { label: 'Calories', page: 'calories' },
];

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];
// Fixed display order
const GROUP_ORDER = ['Chest', 'Back', 'Legs'];

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
  lastTime: { weight: number; reps: number } | null;
}

interface RecentLog {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

interface WeeklyGroupData {
  group: string;
  total: number;
  lastWeek: number;
}

const makeDefaultSets = (): SetRow[] =>
  Array.from({ length: 4 }, () => ({ weight: '', reps: 10 }));

const WEEKLY_MAX = 30000;

export const LogWeights: React.FC<LogWeightsProps> = ({ onNavigate }) => {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupOpen, setGroupOpen] = useState(false);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [addedExercises, setAddedExercises] = useState<AddedExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // DB state
  const [exercisesByGroup, setExercisesByGroup] = useState<Record<string, Exercise[]>>({});
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyGroupData[]>([]);

  const groupRef = useRef<HTMLDivElement>(null);
  const exerciseRef = useRef<HTMLDivElement>(null);

  // Load exercises from DB
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
        setExercisesByGroup(grouped);
      }
    };
    loadExercises();
  }, []);

  // Load recent weight logs
  useEffect(() => {
    const loadRecent = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('total_weight, sets, r1, exercises:exercise_id(exercise_name)')
        .in('type', WEIGHT_TYPES)
        .order('date', { ascending: false })
        .limit(5);
      if (data) {
        setRecentLogs((data as any[]).map(r => ({
          name: r.exercises?.exercise_name || 'Unknown',
          sets: r.sets || 1,
          reps: r.r1 || 10,
          weight: Number(r.total_weight || 0),
        })));
      }
    };
    loadRecent();
  }, []);

  // Load weekly totals
  useEffect(() => {
    const loadWeekly = async () => {
      const thisMonday = currentWeekMonday();
      const lastMonday = weeksAgoMonday(1);

      const [{ data: thisWeek }, { data: lastWeek }] = await Promise.all([
        supabase.from('workouts').select('type, total_weight').in('type', WEIGHT_TYPES).gte('date', thisMonday),
        supabase.from('workouts').select('type, total_weight').in('type', WEIGHT_TYPES).gte('date', lastMonday).lt('date', thisMonday),
      ]);

      const sumByType = (rows: any[] | null, type: string) =>
        (rows || []).filter(r => r.type === type).reduce((s, r) => s + Number(r.total_weight || 0), 0);

      const groups = ['CHEST', 'BACK', 'LEGS'].map(t => ({
        group: t.charAt(0) + t.slice(1).toLowerCase(),
        total: sumByType(thisWeek, t),
        lastWeek: sumByType(lastWeek, t),
      }));
      setWeeklyData(groups);
    };
    loadWeekly();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
      if (exerciseRef.current && !exerciseRef.current.contains(e.target as Node)) setExerciseOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectGroup = (group: string) => {
    setSelectedGroup(group);
    setGroupOpen(false);
    setExerciseOpen(false);
  };

  const cancelSelection = () => {
    setSelectedGroup('');
    setGroupOpen(false);
    setExerciseOpen(false);
  };

  const handleAddExercise = async (exercise: Exercise) => {
    if (addedExercises.find(e => e.exercise.id === exercise.id)) return;

    const { data } = await supabase
      .from('workouts')
      .select('w1, r1')
      .eq('exercise_id', exercise.id)
      .order('date', { ascending: false })
      .limit(1);

    const lastTime = data && data.length > 0 && (data[0] as any).w1
      ? { weight: Number((data[0] as any).w1), reps: Number((data[0] as any).r1 || 10) }
      : null;

    setAddedExercises(prev => [...prev, {
      exercise,
      sets: makeDefaultSets(),
      expanded: false,
      logged: false,
      copied: false,
      lastTime,
    }]);
  };

  const toggleExpanded = (id: number) => {
    setAddedExercises(prev => prev.map(e => e.exercise.id === id ? { ...e, expanded: !e.expanded } : e));
  };

  const updateSet = (id: number, setIdx: number, field: 'weight' | 'reps', value: string | number) => {
    setAddedExercises(prev => prev.map(e => {
      if (e.exercise.id !== id) return e;
      const sets = e.sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s);
      return { ...e, sets };
    }));
  };

  const addSet = (id: number) => {
    setAddedExercises(prev => prev.map(e => {
      if (e.exercise.id !== id || e.sets.length >= 6) return e;
      return { ...e, sets: [...e.sets, { weight: '', reps: 10 }] };
    }));
  };

  const toggleCopyFromLast = (id: number) => {
    const ex = addedExercises.find(e => e.exercise.id === id);
    if (!ex) return;
    if (ex.copied) {
      setAddedExercises(prev => prev.map(e => e.exercise.id !== id ? e : { ...e, copied: false, sets: makeDefaultSets() }));
    } else {
      if (!ex.lastTime) return;
      setAddedExercises(prev => prev.map(e => {
        if (e.exercise.id !== id) return e;
        const sets = e.sets.map(() => ({ weight: ex.lastTime!.weight > 0 ? String(ex.lastTime!.weight) : '', reps: ex.lastTime!.reps }));
        return { ...e, sets, copied: true };
      }));
    }
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

        // total_weight = sum of (weight × reps) across all sets × exercise multiplier
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
          // total_score_k is row-specific: total volume for this exercise (post-multiplier)
          total_score_k: totalWeight,
          sets: filledSets.length,
          new_entry: 'New',
          source: 'app',
          ...setData,
        });
      }

      // Recalculate daily total_score and tracker_daily for all rows today
      await recalculateDailyTotals(today);

      setAddedExercises(prev => prev.map(e => ({ ...e, logged: true, expanded: false })));
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

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.03em',
    textTransform: 'uppercase', color: '#ffffff', marginBottom: '1.25rem',
  };

  // Always display in Chest → Back → Legs order
  const orderedGroups = GROUP_ORDER.filter(g => exercisesByGroup[g]);

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

      <section className="mb-12">
        {/* Muscle group selector — always big font, no shrink */}
        <div ref={groupRef} className="relative mb-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div onClick={() => setGroupOpen(o => !o)} style={textTriggerStyle}>
              <span style={{ color: '#ffffff', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.1, textTransform: 'uppercase' }}>
                {selectedGroup || 'Select Muscle Group'}
              </span>
              <ChevronDown size={20} style={{ color: 'rgba(255,255,255,0.45)', transform: groupOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
            </div>
            {selectedGroup && (
              <button onClick={cancelSelection} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.35)', padding: '4px', flexShrink: 0, marginLeft: '8px' }}>
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </div>
          {/* Dropdown — no box, no background, just clean text */}
          {groupOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 50 }}>
              {orderedGroups.map(group => (
                <div key={group} onClick={() => handleSelectGroup(group)}
                  style={{ padding: '8px 0', cursor: 'pointer', color: selectedGroup === group ? '#ffffff' : 'rgba(255,255,255,0.45)', fontWeight: selectedGroup === group ? 900 : 600, fontSize: '1.4rem', letterSpacing: '-0.04em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  {group}
                </div>
              ))}
            </div>
          )}
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
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, backgroundColor: '#222222', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', overflow: 'hidden', zIndex: 50, boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
                {(exercisesByGroup[selectedGroup] || []).map((ex, i, arr) => {
                  const alreadyAdded = !!addedExercises.find(e => e.exercise.id === ex.id);
                  return (
                    <div key={ex.id} style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', backgroundColor: alreadyAdded ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
                      <div>
                        <span style={{ color: alreadyAdded ? '#666' : '#cccccc', fontSize: '0.875rem' }}>{ex.exercise_name}</span>
                        {ex.info_notes && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>{ex.info_notes}</span>}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleAddExercise(ex); }}
                        style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: alreadyAdded ? '#2a2a2a' : '#ffffff', color: alreadyAdded ? '#444' : '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: alreadyAdded ? 'default' : 'pointer', border: 'none' }}
                        disabled={alreadyAdded}>
                        <Plus size={14} strokeWidth={3} />
                      </button>
                    </div>
                  );
                })}
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
              const lastText = ex.lastTime
                ? ex.lastTime.weight > 0 ? `Last time: ${ex.lastTime.weight}kg × ${ex.lastTime.reps} reps` : `Last time: ${ex.lastTime.reps} reps`
                : 'No previous data';
              const hasData = ex.sets.some(s => s.weight !== '');
              const exTotal = calcExerciseTotal(ex.sets, ex.exercise.multiplier ?? 1);

              return (
                <div key={ex.exercise.id}>
                  <div className="flex items-center gap-4 py-4" style={{ borderBottom: ex.expanded ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', border: hasData || ex.logged ? 'none' : '2px solid rgba(255,255,255,0.2)', backgroundColor: hasData || ex.logged ? '#ffffff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.25s' }}>
                      {(hasData || ex.logged) && <Check size={14} color="#1a1a1a" strokeWidth={3} />}
                    </div>
                    <div className="flex-grow">
                      <p className="font-bold text-sm text-white">{ex.exercise.exercise_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{lastText}</p>
                    </div>
                    <button onClick={() => toggleExpanded(ex.exercise.id)} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                      {ex.expanded ? <ChevronUp size={20} /> : <ChevronRight size={20} />}
                    </button>
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
                        <button onClick={() => toggleCopyFromLast(ex.exercise.id)}
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
                            <input type="number" value={set.weight} onChange={e => updateSet(ex.exercise.id, idx, 'weight', e.target.value)} placeholder="—"
                              className="text-center font-bold rounded-lg py-2"
                              style={{ backgroundColor: '#1b1b1b', border: '1px solid rgba(255,255,255,0.07)', outline: 'none', width: '100%', fontSize: '0.875rem', color: rowHasData ? '#ffffff' : 'rgba(255,255,255,0.3)' }} />
                            <div className="flex items-center justify-between rounded-lg py-2 px-2" style={{ backgroundColor: '#1b1b1b', border: '1px solid rgba(255,255,255,0.07)' }}>
                              <button onClick={() => updateSet(ex.exercise.id, idx, 'reps', Math.max(1, set.reps - 1))} style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>−</button>
                              <span className="font-bold" style={{ fontSize: '0.875rem', color: rowHasData ? '#ffffff' : 'rgba(255,255,255,0.3)' }}>{set.reps}</span>
                              <button onClick={() => updateSet(ex.exercise.id, idx, 'reps', set.reps + 1)} style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>+</button>
                            </div>
                            <p className="text-center font-bold" style={{ fontSize: '0.875rem', color: '#ffffff' }}>{rowTotal > 0 ? rowTotal : ''}</p>
                          </div>
                        );
                      })}

                      {ex.sets.length < 6 && (
                        <div className="flex items-center mt-4">
                          <button onClick={() => addSet(ex.exercise.id)} className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            <Plus size={13} /><span>Set</span>
                          </button>
                        </div>
                      )}
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

      <section className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <p style={{ ...sectionLabelStyle, marginBottom: 0 }}>Weekly</p>
          <Calendar size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {weeklyData.map(({ group, total, lastWeek }) => {
            const pct = Math.min((total / WEEKLY_MAX) * 100, 100);
            return (
              <div key={group}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.6rem', paddingLeft: '2px', paddingRight: '2px' }}>
                  <div>
                    <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', display: 'block' }}>{group}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: 400, marginTop: '1px', display: 'block' }}>
                      Last week: {Math.round(lastWeek).toLocaleString()}kg
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.02em', lineHeight: 1 }}>{Math.round(total).toLocaleString()}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>kg</span>
                  </div>
                </div>
                <div style={{ height: '44px', width: '100%', backgroundColor: '#1f1f1f', borderRadius: '999px', overflow: 'hidden', padding: '5px' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #c6c6c7 0%, #ffffff 100%)', borderRadius: '999px', boxShadow: '0 0 14px rgba(255,255,255,0.25)', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <p style={sectionLabelStyle}>Recent Logs</p>
          <Clock size={15} style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.25rem' }} />
        </div>
        <div className="space-y-4">
          {recentLogs.map((log, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: '#1b1b1b' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#353535' }}>
                <Dumbbell size={18} color="white" />
              </div>
              <div className="flex-grow">
                <h4 className="font-bold text-sm uppercase tracking-tight text-white">{log.name}</h4>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: '#c6c6c6' }}>{log.sets} Sets • {log.reps} Reps</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-black tracking-tighter text-white">{log.weight.toFixed(1)}</div>
                <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#c6c6c6' }}>Kilos</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
