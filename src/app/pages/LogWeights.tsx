import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Minus, Check, X } from 'lucide-react';
import { Page } from '../../types';
import { supabase, Exercise, todayStr, getISOWeek, getDayName, weeksAgoMonday, recalculateDailyTotals } from '../../lib/supabase';
import WeeklyVolumeSection from '../components/WeeklyVolumeSection';
import RecentLogsSection from '../components/RecentLogsSection';
import WeeklyWeightsChart from '../components/WeeklyWeightsChart';
import LogWeightsEntry from '../components/LogWeightsEntry';
import { ArrowLeftFromLine } from 'lucide-react';
import { WeeklyVolumeHeader } from '../components/WeeklyVolumeHeader';
import { ExerciseItem } from '../components/ExerciseItem';

interface LogWeightsProps {
  onNavigate: (page: Page, data?: any) => void;
  showWeeklySummary?: boolean;
  data?: any;
}

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];

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

export interface SetRow {
  weight: string;
  reps: number;
}

export interface AddedExercise {
  exercise: Exercise;
  sets: SetRow[];
  expanded: boolean;
  logged: boolean;
  copied: boolean;
  loadedMax: boolean;
  lastSets: SetRow[] | null;
  maxSets: SetRow[] | null;
  fail: boolean;
  pbThreshold: number;
}

const makeDefaultSets = (): SetRow[] =>
  Array.from({ length: 4 }, () => ({ weight: '', reps: 10 }));

const STORAGE_KEY = 'kine_logweights_v1';
const EST_SLATE = '#868E96';

const fetchSavedWorkoutIds = async (): Promise<number[]> => {
  const { data } = await supabase
    .from('workout_templates')
    .select('exercise_ids')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (data?.exercise_ids && Array.isArray(data.exercise_ids)) {
    return data.exercise_ids.filter((id): id is number => typeof id === 'number');
  }
  return [];
};

export const LogWeights: React.FC<LogWeightsProps> = ({ onNavigate, showWeeklySummary: _showWeeklySummary, data }) => {
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
  const [savedWorkoutIds, setSavedWorkoutIds] = useState<number[]>([]);
  const [templateSaveFlash, setTemplateSaveFlash] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState<number | null>(null);
  const [showEntryCard, setShowEntryCard] = useState(false);

  useEffect(() => {
    if (data?.showEntryCard) setShowEntryCard(true);
    if (data?.addedExercises) setAddedExercises(data.addedExercises);
    if (data?.todayLoggedTotal !== undefined) setTodayTotal(data.todayLoggedTotal);
    if (data?.exercisesByGroup) setExercisesByGroup(data.exercisesByGroup);
  }, [data]);

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

    const loadSavedWorkout = async () => {
      const ids = await fetchSavedWorkoutIds();
      setSavedWorkoutIds(ids);
    };
    loadSavedWorkout();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
      if (exerciseRef.current && !exerciseRef.current.contains(e.target as Node)) setExerciseOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  useEffect(() => {
    loadVolume();
  }, []);

  useEffect(() => {
    const handler = () => loadVolume();
    window.addEventListener('kine:data-updated', handler);
    return () => window.removeEventListener('kine:data-updated', handler);
  }, []);

  const handleSelectGroup = (group: string) => {
    setSelectedGroup(selectedGroup === group ? '' : group);
    setExerciseOpen(false);
  };

  const fetchAddedExerciseRow = async (exercise: Exercise): Promise<AddedExercise> => {
    const [{ data }, { data: pbData }] = await Promise.all([
      supabase
        .from('workouts')
        .select('w1,r1,w2,r2,w3,r3,w4,r4,w5,r5,w6,r6')
        .eq('exercise_id', exercise.id)
        .order('date', { ascending: false })
        .limit(1),
      supabase
        .from('workouts')
        .select('total_weight,w1,r1,w2,r2,w3,r3,w4,r4,w5,r5,w6,r6')
        .eq('exercise_id', exercise.id)
        .order('total_weight', { ascending: false })
        .limit(1),
    ]);

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

    const pbThreshold = pbData && pbData.length > 0 ? Number((pbData[0] as any).total_weight || 0) : 0;

    let maxSets: SetRow[] | null = null;
    if (pbData && pbData.length > 0) {
      const maxRow = pbData[0] as any;
      const parsed: SetRow[] = [];
      for (let i = 1; i <= 6; i++) {
        const w = maxRow[`w${i}`];
        const r = maxRow[`r${i}`];
        if (w != null && Number(w) > 0) {
          parsed.push({ weight: String(Number(w)), reps: Number(r) || 10 });
        }
      }
      if (parsed.length > 0) maxSets = parsed;
    }

    return {
      exercise,
      sets: makeDefaultSets(),
      expanded: false,
      logged: false,
      copied: false,
      loadedMax: false,
      lastSets,
      maxSets,
      fail: false,
      pbThreshold,
    };
  };

  const handleAddExercise = async (exercise: Exercise) => {
    const existing = addedExercises.find(e => e.exercise.id === exercise.id);
    if (existing) {
      setAddedExercises(prev => prev.filter(e => e.exercise.id !== exercise.id));
      return;
    }
    const row = await fetchAddedExerciseRow(exercise);
    setAddedExercises(prev => (prev.some(e => e.exercise.id === exercise.id) ? prev : [...prev, row]));
  };

  const handleSaveWorkoutTemplate = async () => {
    if (addedExercises.length <= 1) return;
    const exerciseIds = addedExercises.map(e => e.exercise.id);
    try {
      await supabase.from('workout_templates').delete().neq('id', 0);
      const { error } = await supabase.from('workout_templates').insert({ exercise_ids: exerciseIds });
      if (error) throw error;
      setSavedWorkoutIds(exerciseIds);
      setTemplateSaveFlash(true);
      setTimeout(() => setTemplateSaveFlash(false), 2200);
    } catch (err) {
      console.error('Failed to save workout template:', err);
    }
  };

  // Guard removed: now works whether or not exercises are already added
  const handleApplySavedWorkoutTemplate = async () => {
    if (savedWorkoutIds.length === 0) return;
    const allExercises = Object.values(exercisesByGroup).flat();
    setApplyingTemplate(true);
    try {
      for (const id of savedWorkoutIds) {
        const exercise = allExercises.find(ex => ex.id === id);
        if (!exercise) continue;
        const row = await fetchAddedExerciseRow(exercise);
        setAddedExercises(prev => (prev.some(e => e.exercise.id === id) ? prev : [...prev, row]));
      }
    } finally {
      setApplyingTemplate(false);
    }
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
      if (e.copied && e.lastSets && e.lastSets.length > 0) {
        return { ...e, sets: makeDefaultSets(), copied: false, loadedMax: false };
      }
      if (!e.lastSets || e.lastSets.length === 0) return e;
      return { ...e, sets: [...e.lastSets], copied: true, loadedMax: false };
    }));
  };

  const toggleCopyFromLast = (id: number) => {
    const ex = addedExercises.find(e => e.exercise.id === id);
    if (!ex) return;
    if (ex.copied) {
      setAddedExercises(prev => prev.map(e => e.exercise.id !== id ? e : { ...e, copied: false, loadedMax: false, sets: makeDefaultSets() }));
    } else {
      if (!ex.lastSets || ex.lastSets.length === 0) return;
      setAddedExercises(prev => prev.map(e => {
        if (e.exercise.id !== id) return e;
        return { ...e, sets: [...ex.lastSets!], copied: true, loadedMax: false };
      }));
    }
  };

  const loadMaxSession = async (id: number) => {
    const ex = addedExercises.find(e => e.exercise.id === id);
    if (!ex) return;

    if (ex.loadedMax) {
      setAddedExercises(prev => prev.map(e => e.exercise.id !== id ? e : { ...e, loadedMax: false, sets: makeDefaultSets() }));
      return;
    }

    let maxSets = ex.maxSets;

    if (!maxSets || maxSets.length === 0) {
      const { data } = await supabase
        .from('workouts')
        .select('total_weight,w1,r1,w2,r2,w3,r3,w4,r4,w5,r5,w6,r6')
        .eq('exercise_id', id)
        .order('total_weight', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const maxRow = data[0] as any;
        const parsed: SetRow[] = [];
        for (let i = 1; i <= 6; i++) {
          const w = maxRow[`w${i}`];
          const r = maxRow[`r${i}`];
          if (w != null && Number(w) > 0) {
            parsed.push({ weight: String(Number(w)), reps: Number(r) || 10 });
          }
        }
        if (parsed.length > 0) maxSets = parsed;
      }
    }

    setAddedExercises(prev => prev.map(e => {
      if (e.exercise.id !== id) return e;
      if (!maxSets || maxSets.length === 0) return { ...e, expanded: true };
      return { ...e, sets: [...maxSets], maxSets, expanded: true, loadedMax: true };
    }));
  };

  const toggleFail = (id: number) => {
    setAddedExercises(prev => prev.map(e => e.exercise.id === id ? { ...e, fail: !e.fail } : e));
  };

  const handleLogAll = async () => {
    setSaving(true);
    const today = todayStr();
    const todayDate = new Date(today + 'T12:00:00+08:00');
    const week = getISOWeek(todayDate);
    const day = getDayName(todayDate);

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
        const totalWeight = ex.sets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * s.reps * multiplier, 0);
        const isPB = totalWeight > 0 && (ex.pbThreshold ?? 0) > 0 && totalWeight > (ex.pbThreshold ?? 0);

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
          pb: isPB ? 'PB' : null,
          source: 'app',
          ...setData,
        });
      }

      await recalculateDailyTotals(today);

      setAddedExercises([]);
      setRefreshKey(k => k + 1);
      setSaveSuccess(true);
      window.dispatchEvent(new CustomEvent('kine:data-updated'));
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const calcExerciseTotal = (sets: SetRow[], multiplier: number = 1): number =>
    sets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * s.reps * multiplier, 0);

  const grandTotal = addedExercises.reduce((acc, ex) => acc + calcExerciseTotal(ex.sets, ex.exercise.multiplier ?? 1), 0);
  const estGrandTotal = addedExercises.reduce((acc, ex) => {
    const mult = ex.exercise.multiplier ?? 1;
    if (ex.lastSets && ex.lastSets.length > 0) return acc + calcExerciseTotal(ex.lastSets, mult);
    return acc;
  }, 0);
  const showEstGrandTotal = addedExercises.length > 0 && grandTotal === 0;

  const handleRandomList = async (group?: string) => {
    const allChest = exercisesByGroup['Chest'] || [];
    const allBack = exercisesByGroup['Back'] || [];
    const allLegs = exercisesByGroup['Legs'] || [];

    const pickRandom = (arr: Exercise[], n: number): Exercise[] => {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, n);
    };

    // Pick 1-2 random leg exercises
    if (allLegs.length === 0) return;
    const legCount = Math.random() < 0.5 ? 1 : 2;
    const legPicks = pickRandom(allLegs, Math.min(legCount, allLegs.length));

    let remainingPool: Exercise[];
    if (group === 'Chest') {
      // Chest + remaining legs
      remainingPool = [...allChest, ...allLegs.filter(e => !legPicks.some(lp => lp.id === e.id))];
    } else if (group === 'Back') {
      // Back + remaining legs
      remainingPool = [...allBack, ...allLegs.filter(e => !legPicks.some(lp => lp.id === e.id))];
    } else {
      // All groups
      remainingPool = [...allChest, ...allBack, ...allLegs.filter(e => !legPicks.some(lp => lp.id === e.id))];
    }

    const remainingNeeded = 5 - legPicks.length;
    const remainingPicks = pickRandom(remainingPool, Math.min(remainingNeeded, remainingPool.length));

    const selected = [...legPicks, ...remainingPicks];

    // Add each exercise sequentially
    for (const exercise of selected) {
      await handleAddExercise(exercise);
    }
  };

  const textTriggerStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: '#f2f2f2',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
    border: '1px solid rgba(0,0,0,0.08)',
  };

  const renderExerciseDropdown = () => {
    const exercises = exercisesByGroup[selectedGroup] || [];
    if (exercises.length === 0) return null;

    const items: React.ReactNode[] = [];
    let lastType2: string | null = undefined as any;

    exercises.forEach((ex) => {
      const t2 = ex.type2 ?? '';
      const alreadyAdded = !!addedExercises.find(e => e.exercise.id === ex.id);

      if (t2 !== lastType2) {
        lastType2 = t2;
        const label = TYPE2_LABELS[t2] || t2;
        items.push(
          <div key={`header-${t2}`} style={{
            borderTop: items.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none',
            padding: '10px 16px 6px 16px',
          }}>
            <span style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(26,26,26,0.5)',
            }}>{label}</span>
          </div>
        );
      }

      items.push(
        <div
          key={ex.id}
          onClick={() => handleAddExercise(ex)}
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 'none',
            backgroundColor: alreadyAdded ? 'rgba(0,0,0,0.04)' : 'transparent',
            cursor: 'pointer',
          }}
        >
          <div>
            <span style={{ color: alreadyAdded ? 'rgba(26,26,26,0.35)' : '#1a1a1a', fontSize: '0.875rem' }}>
              {ex.exercise_name.charAt(0).toUpperCase() + ex.exercise_name.slice(1).toLowerCase()}
            </span>
            {ex.info_notes && (
              <span style={{ color: 'rgba(26,26,26,0.3)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                {ex.info_notes}
              </span>
            )}
          </div>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            backgroundColor: alreadyAdded ? 'rgba(0,0,0,0.15)' : '#1a1a1a',
            color: alreadyAdded ? '#ffffff' : '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {alreadyAdded ? <X size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
          </div>
        </div>
      );
    });

    return items;
  };

  return (
    <div>

      <WeeklyVolumeHeader
        weekTotal={thisWeekTotal}
        lastWeekTotal={lastWeekTotal}
        todayTotal={todayTotal}
        selectedGroup={selectedGroup}
        addedExercisesCount={addedExercises.length}
        onShowEntryCard={() => setShowEntryCard(true)}
      />

      <section style={{ marginBottom: selectedGroup ? '30px' : '2.5rem', transition: 'margin 0.35s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '24px', flex: 1, justifyContent: 'space-between' }}>
            {['Chest', 'Back', 'Legs'].map(group => (
              <button
                key={group}
                onClick={() => handleSelectGroup(group)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  backgroundColor: selectedGroup === group ? '#1a1a1a' : 'transparent',
                  border: selectedGroup === group ? '2px solid #1a1a1a' : '1px solid rgba(0,0,0,0.12)',
                  background: selectedGroup === group
                    ? '#1a1a1a'
                    : 'radial-gradient(circle at 30% 30%, rgba(26,26,26,0.12) 0%, rgba(26,26,26,0.05) 30%, transparent 70%)',
                  backgroundClip: 'padding-box',
                  boxShadow: selectedGroup === group
                    ? '0 0 16px rgba(0,0,0,0.2)'
                    : `0 0 8px rgba(0,0,0,0.06), 0 0 16px rgba(0,0,0,0.04), 0 0 26px rgba(0,0,0,0.02), 4px 6px 20px rgba(0,0,0,0.10), inset 2px 2px 12px rgba(255,255,255,0.25), inset -2px -2px 10px rgba(255,255,255,0.03)`,
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {selectedGroup === group ? (
                    <Check size={24} color="#ffffff" strokeWidth={3} />
                  ) : (
                      <img src={group === 'Legs' ? '/icons/NewLeg.svg' : `/icons/${group}.svg`} alt={group} style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
                  )}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#1a1a1a' }}>
                  {group}
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedGroup && (
          <div ref={exerciseRef} className="relative">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div onClick={() => setExerciseOpen(o => !o)} style={textTriggerStyle}>
                <span style={{ color: '#1a1a1a', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Choose Exercise</span>
                <ChevronDown size={14} style={{ color: '#1a1a1a', transform: exerciseOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {addedExercises.length === 0 && savedWorkoutIds.length > 0 && (
                  <button
                    type="button"
                    disabled={applyingTemplate || Object.values(exercisesByGroup).flat().length === 0}
                    title="Add saved exercises"
                    onClick={e => { e.stopPropagation(); void handleApplySavedWorkoutTemplate(); }}
                    style={{
                      width: 30, height: 30, borderRadius: '50%',
                      backgroundColor: '#1a1a1a', color: '#ffffff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none',
                      cursor: applyingTemplate || Object.values(exercisesByGroup).flat().length === 0 ? 'default' : 'pointer',
                      opacity: applyingTemplate ? 0.55 : 1,
                    }}
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                )}
                {exerciseOpen && (
                  <button type="button" onClick={() => setExerciseOpen(false)} style={{ display: 'flex', alignItems: 'center', color: 'rgba(26,26,26,0.35)', padding: '4px' }}>
                    <X size={16} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
            {exerciseOpen && (
              <div style={{ ...dropdownStyle, top: 'calc(100% + 16px)', left: '-16px', right: '-16px', maxHeight: '65vh', overflowY: 'auto', paddingBottom: '130px' }}>
                {renderExerciseDropdown()}
              </div>
            )}

            {selectedGroup && addedExercises.length > 1 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleSaveWorkoutTemplate}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '999px',
                      border: 'none',
                      backgroundColor: 'rgba(0,0,0,0.06)',
                      color: '#1a1a1a',
                      fontSize: '0.7rem',
                      fontWeight: 670,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      fontFamily: "'Archivo', sans-serif",
                      lineHeight: '18px',
                      minWidth: '88px',
                      textAlign: 'left',
                    }}
                  >
                    + SAVE
                  </button>
                  {templateSaveFlash && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#22c55e', letterSpacing: '0.08em' }}>Saved</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowClearConfirm(prev => prev === null ? 0 : null); }}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '999px',
                      border: 'none',
                      backgroundColor: 'rgba(0,0,0,0.06)',
                      color: '#1a1a1a',
                      fontSize: '0.7rem',
                      fontWeight: 670,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      fontFamily: "'Archivo', sans-serif",
                      lineHeight: '18px',
                      minWidth: '88px',
                    }}
                  >
                    <span style={{ textTransform: 'none' }}>x</span> CLEAR
                  </button>
                  {showClearConfirm !== null && (
                    <>
                      <button type="button" onClick={() => { setAddedExercises([]); setShowClearConfirm(null); }} style={{ ...textTriggerStyle, padding: 0, margin: 0, border: 'none', background: 'none', font: 'inherit' }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#1a1a1a', letterSpacing: '0.12em' }}>YES</span>
                      </button>
                      <button type="button" onClick={() => setShowClearConfirm(null)} style={{ ...textTriggerStyle, padding: 0, margin: 0, border: 'none', background: 'none', font: 'inherit' }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(26,26,26,0.75)', letterSpacing: '0.12em' }}>CANCEL</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div style={{ marginTop: '-4px' }} />

      {!selectedGroup && addedExercises.length > 0 && (grandTotal > 0 || showEstGrandTotal) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowClearConfirm(prev => prev === null ? 0 : null); }}
            style={{
              padding: '5px 14px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: 'rgba(0,0,0,0.06)',
              color: '#1a1a1a',
              fontSize: '0.7rem',
              fontWeight: 670,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: "'Archivo', sans-serif",
              lineHeight: '18px',
            }}
          >
            <span style={{ textTransform: 'none' }}>x</span> CLEAR
          </button>
          {showClearConfirm !== null && (
            <>
              <button type="button" onClick={() => { setAddedExercises([]); setShowClearConfirm(null); }} style={{ ...textTriggerStyle, padding: 0, margin: 0, border: 'none', background: 'none', font: 'inherit' }}>
                <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#1a1a1a', letterSpacing: '0.12em' }}>YES</span>
              </button>
              <button type="button" onClick={() => setShowClearConfirm(null)} style={{ ...textTriggerStyle, padding: 0, margin: 0, border: 'none', background: 'none', font: 'inherit' }}>
                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(26,26,26,0.75)', letterSpacing: '0.12em' }}>CANCEL</span>
              </button>
            </>
          )}
        </div>
      )}

      {(grandTotal > 0 || showEstGrandTotal) && (
        <div className="flex items-baseline justify-between gap-4 mb-6 mt-2 flex-wrap">
          <div className="flex items-baseline gap-2 flex-wrap min-w-0">
            {grandTotal > 0 ? (
              <>
                <span style={{ fontSize: '2.6rem', fontWeight: 900, lineHeight: 1, color: '#1a1a1a', letterSpacing: '-0.02em' }}>{grandTotal.toLocaleString()}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a1a1a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>KG</span>
              </>
            ) : showEstGrandTotal ? (
              <>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: EST_SLATE, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>EST.</span>
                <span style={{ fontSize: '2.6rem', fontWeight: 900, lineHeight: 1, color: EST_SLATE, letterSpacing: '-0.02em' }}>{estGrandTotal.toLocaleString()}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: EST_SLATE, letterSpacing: '0.12em', textTransform: 'uppercase' }}>KG</span>
              </>
            ) : null}
          </div>
          {addedExercises.length > 0 && (
            <button
              onClick={() => setShowEntryCard(true)}
              style={{
                background: 'none', border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: '50%', width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#1a1a1a', flexShrink: 0, transition: 'all 0.2s',
              }}
            >
              <ArrowLeftFromLine size={18} strokeWidth={1.5} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
        </div>
      )}

      {addedExercises.length > 0 && (
        <section className="mb-10">
          <div className="space-y-0">
            {[...addedExercises].sort((a, b) => {
              if (a.expanded !== b.expanded) return a.expanded ? -1 : 1;
              const aHasData = a.sets.some(s => s.weight !== '');
              const bHasData = b.sets.some(s => s.weight !== '');
              if (aHasData !== bHasData) return aHasData ? -1 : 1;
              return 0;
            }).map(ex => {
              const hasData = ex.sets.some(s => s.weight !== '');
              const mult = ex.exercise.multiplier ?? 1;
              const exTotal = calcExerciseTotal(ex.sets, mult);
              const estFromLast = ex.lastSets && ex.lastSets.length > 0 ? calcExerciseTotal(ex.lastSets, mult) : 0;
              const showEstHeader = exTotal === 0 && estFromLast > 0;
              const swipeOffset = swipeOffsets[ex.exercise.id] || 0;

              return (
                <ExerciseItem
                  key={ex.exercise.id}
                  ex={ex}
                  swipeOffset={swipeOffset}
                  hasData={hasData}
                  exTotal={exTotal}
                  estFromLast={estFromLast}
                  showEstHeader={showEstHeader}
                  toggleExpanded={toggleExpanded}
                  loadLastSession={loadLastSession}
                  adjustWeight={adjustWeight}
                  updateSet={updateSet}
                  addSet={addSet}
                  removeExercise={removeExercise}
                  toggleFail={toggleFail}
                  loadMaxSession={loadMaxSession}
                  toggleCopyFromLast={toggleCopyFromLast}
                  setSwipeOffsets={setSwipeOffsets}
                  onRemove={(id) => setAddedExercises(prev => prev.filter(e => e.exercise.id !== id))}
                  touchStartX={touchStartX}
                />
              );
            })}
          </div>

          <button
            onClick={handleLogAll}
            disabled={saving}
            className="w-full mt-8 py-4 rounded-full font-black uppercase tracking-widest text-sm active:scale-95 duration-150"
            style={{ backgroundColor: saveSuccess ? '#22c55e' : '#1a1a1a', color: '#ffffff', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Log Exercises'}
          </button>
        </section>
      )}

      <WeeklyVolumeSection />
      <RecentLogsSection refreshKey={refreshKey} />
      <section className="mb-4 mt-8">
        <WeeklyWeightsChart />
      </section>

      {/* Full-screen entry card overlay */}
      {showEntryCard && (
        <LogWeightsEntry
          addedExercises={addedExercises}
          onUpdateSet={updateSet}
          onAddSet={addSet}
          onToggleFail={toggleFail}
          onLoadMaxSession={loadMaxSession}
          onToggleCopyFromLast={toggleCopyFromLast}
          onRemoveExercise={removeExercise}
          onClose={() => setShowEntryCard(false)}
          todayLoggedTotal={todayTotal}
          onAddExercise={(exercise) => handleAddExercise(exercise)}
          exercisesByGroup={exercisesByGroup}
          onNavigate={onNavigate}
          onApplySavedTemplate={handleApplySavedWorkoutTemplate}
          onRandomList={handleRandomList}
          onLogAll={handleLogAll}
        />
      )}
    </div>
  );
};