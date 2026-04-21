import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Plus, Minus, Check, X, Save } from 'lucide-react';
import { Page } from '../../types';
import { supabase, Exercise, todayStr, getISOWeek, getDayName, weeksAgoMonday, recalculateDailyTotals } from '../../lib/supabase';
import WeeklyVolumeSection from '../components/WeeklyVolumeSection';
import RecentLogsSection from '../components/RecentLogsSection';
import WeeklyWeightsChart from '../components/WeeklyWeightsChart';

interface LogWeightsProps {
  onNavigate: (page: Page) => void;
  showWeeklySummary?: boolean;
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
  maxSets: SetRow[] | null;
  fail: boolean;
  pbThreshold: number;
}

const makeDefaultSets = (): SetRow[] =>
  Array.from({ length: 4 }, () => ({ weight: '', reps: 10 }));

const STORAGE_KEY = 'kine_logweights_v1';
/** Matches Log Calories empty-state / placeholder (slate cool grey) */
const EST_SLATE = '#94A3B8';

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

export const LogWeights: React.FC<LogWeightsProps> = ({ onNavigate, showWeeklySummary = false }) => {
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

  const handleApplySavedWorkoutTemplate = async () => {
    if (addedExercises.length > 0 || savedWorkoutIds.length === 0) return;
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
        return { ...e, sets: makeDefaultSets(), copied: false };
      }
      if (!e.lastSets || e.lastSets.length === 0) {
        return e;
      }
      return { ...e, sets: [...e.lastSets], copied: true };
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

  const loadMaxSession = async (id: number) => {
    const ex = addedExercises.find(e => e.exercise.id === id);
    if (!ex) return;

    let maxSets = ex.maxSets;

    // If maxSets wasn't loaded (e.g. stale localStorage), fetch it now
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
      return { ...e, sets: [...maxSets], maxSets, expanded: true };
    }));
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
      setRefreshKey(k => k + 1); // signal RecentLogsSection to re-fetch
      setSaveSuccess(true);
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
  const showEstGrandTotal = addedExercises.length > 0 && grandTotal === 0 && estGrandTotal > 0;

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

    exercises.forEach((ex, _i) => {
      const t2 = ex.type2 ?? '';
      const alreadyAdded = !!addedExercises.find(e => e.exercise.id === ex.id);

      if (t2 !== lastType2) {
        lastType2 = t2;
        const label = TYPE2_LABELS[t2] || t2;
        items.push(
          <div key={`header-${t2}`} style={{
            borderTop: items.length > 0 ? '1px solid rgba(255,255,255,0.35)' : 'none',
            padding: '10px 16px 6px 16px',
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
          onClick={() => handleAddExercise(ex)}
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 'none',
            backgroundColor: alreadyAdded ? 'rgba(255,255,255,0.04)' : 'transparent',
            cursor: 'pointer',
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
              backgroundColor: alreadyAdded ? '#ef4444' : '#ffffff',
              color: alreadyAdded ? '#ffffff' : '#1a1a1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {alreadyAdded ? <X size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
          </div>
        </div>
      );
    });

    return items;
  };

  return (
    <div>
      <nav className="flex gap-8 items-end" style={{ marginBottom: (selectedGroup || showWeeklySummary) ? '0' : '3rem', maxHeight: (selectedGroup || showWeeklySummary) ? '0' : '80px', overflow: 'hidden', opacity: (selectedGroup || showWeeklySummary) ? 0 : 1, transition: 'all 0.35s ease' }}>
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

      {/* Weekly volume display — collapses when group selected */}
      <div style={{
        maxHeight: selectedGroup ? '0px' : '160px',
        opacity: selectedGroup ? 0 : 1,
        overflow: 'hidden',
        transition: 'max-height 0.35s ease, opacity 0.25s ease, margin 0.35s ease',
        marginBottom: selectedGroup ? '0px' : '2rem',
      }}>
      <div className="flex items-start">
        {/* Big weekly total on left */}
        <div className="text-[3.25rem] font-black leading-none tracking-tighter text-white flex-shrink-0">
          {fmtVol(thisWeekTotal)}
          {lastWeekTotal > 0 && (
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginTop: '6px', letterSpacing: '-0.01em', lineHeight: 1 }}>
              LAST WEEK {Math.round(lastWeekTotal).toLocaleString()} KG
            </div>
          )}
        </div>
        {/* Right section: labels + KG TODAY + bar */}
        <div className="flex flex-col ml-4 pt-1 flex-1 min-w-0">
          {/* Top row: label + KG TODAY */}
          <div className="flex items-start justify-between">
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2.5px', color: '#ffffff' }}>
              VOLUME (KG)
            </div>
            {todayTotal > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginLeft: '12px', flexShrink: 0 }}>
                <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em', lineHeight: 1 }}>{Math.round(todayTotal).toLocaleString()}</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KG</span>
              </div>
            )}
          </div>
          {/* Bottom row: inline progress bar */}
          {lastWeekTotal > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
              {/* Progress bar */}
              <div style={{
                flex: 1,
                height: '8px',
                backgroundColor: 'rgba(255,255,255,0.22)',
                borderRadius: '999px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  right: 0, top: 0, bottom: 0,
                  width: `${Math.min(100, (todayTotal / 25000) * 100)}%`,
                  background: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0.45))',
                  borderRadius: '999px',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Today's total — visible when group selected */}
      {selectedGroup && todayTotal > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {Math.round(todayTotal).toLocaleString()}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              KG TODAY
            </span>
          </div>
        </div>
      )}

      <section style={{ marginBottom: selectedGroup ? '40px' : '3rem', transition: 'margin 0.35s ease' }}>
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
                  backgroundColor: selectedGroup === group ? '#ffffff' : '#000000',
                  border: '2px solid #ffffff',
                  boxShadow: selectedGroup === group ? '0 0 16px rgba(255,255,255,0.5)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {selectedGroup === group ? (
                    <Check size={24} color="#000000" strokeWidth={3} />
                  ) : (
                    <img src={`/icons/${group}.svg`} alt={group} style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div onClick={() => setExerciseOpen(o => !o)} style={textTriggerStyle}>
                <span style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Choose Exercise</span>
                <ChevronDown size={14} style={{ color: '#ffffff', transform: exerciseOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {addedExercises.length === 0 && savedWorkoutIds.length > 0 && (
                  <button
                    type="button"
                    disabled={applyingTemplate || Object.values(exercisesByGroup).flat().length === 0}
                    title="Add saved exercises"
                    onClick={e => { e.stopPropagation(); void handleApplySavedWorkoutTemplate(); }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      color: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: applyingTemplate || Object.values(exercisesByGroup).flat().length === 0 ? 'default' : 'pointer',
                      opacity: applyingTemplate ? 0.55 : 1,
                    }}
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                )}
                {exerciseOpen && (
                  <button type="button" onClick={() => setExerciseOpen(false)} style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.35)', padding: '4px' }}>
                    <X size={16} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
             {exerciseOpen && (
               <div style={{ ...dropdownStyle, top: 'calc(100% + 16px)', left: '-16px', right: '-16px', maxHeight: '65vh', overflowY: 'auto' }}>
                 {renderExerciseDropdown()}
               </div>
             )}
             
{(selectedGroup && addedExercises.length > 1) && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleSaveWorkoutTemplate}
                      style={{
                        ...textTriggerStyle,
                        padding: 0,
                        margin: 0,
                        border: 'none',
                        background: 'none',
                        font: 'inherit',
                        color: EST_SLATE,
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: EST_SLATE }}>SAVE WORKOUT</span>
                      <Save size={13} strokeWidth={2.2} style={{ color: EST_SLATE }} />
                    </button>
                    {templateSaveFlash && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#22c55e', letterSpacing: '0.08em' }}>Saved</span>
                    )}
                  </div>

                  {!showClearConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(0)}
                      style={{
                        ...textTriggerStyle,
                        padding: 0,
                        margin: 0,
                        border: 'none',
                        background: 'none',
                        font: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,80,80,0.55)' }}>CLEAR ALL</span>
                      <X size={13} strokeWidth={2.2} style={{ color: 'rgba(255,80,80,0.55)' }} />
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}>Clear all?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAddedExercises([]);
                          setShowClearConfirm(null);
                        }}
                        style={{ ...textTriggerStyle, padding: 0, margin: 0, border: 'none', background: 'none', font: 'inherit' }}
                      >
                        <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#22c55e' }}>YES</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(null)}
                        style={{ ...textTriggerStyle, padding: 0, margin: 0, border: 'none', background: 'none', font: 'inherit' }}
                      >
                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,80,80,0.55)' }}>CANCEL</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
           </div>
         )}
       </section>

<div style={{ marginTop: '-4px' }} />
        
         {!selectedGroup && addedExercises.length > 1 && !showClearConfirm && (grandTotal > 0 || showEstGrandTotal) && (
           <button
             type="button"
             onClick={() => setShowClearConfirm(0)}
             style={{ ...textTriggerStyle, padding: 0, margin: 0, border: 'none', background: 'none', font: 'inherit', marginBottom: '8px' }}
           >
             <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,80,80,0.55)' }}>CLEAR ALL</span>
             <X size={13} strokeWidth={2.2} style={{ color: 'rgba(255,80,80,0.55)' }} />
           </button>
         )}
         {!selectedGroup && showClearConfirm !== null && addedExercises.length > 1 && (
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}>Clear all?</span>
            <button
              type="button"
              onClick={() => {
                setAddedExercises([]);
                setShowClearConfirm(null);
              }}
              style={{ ...textTriggerStyle, padding: 0, margin: 0, border: 'none', background: 'none', font: 'inherit' }}
            >
              <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#22c55e' }}>YES</span>
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(null)}
              style={{ ...textTriggerStyle, padding: 0, margin: 0, border: 'none', background: 'none', font: 'inherit' }}
            >
              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,80,80,0.55)' }}>CANCEL</span>
            </button>
          </div>
        )}

        {(grandTotal > 0 || showEstGrandTotal) && (
         <div className="flex items-baseline justify-between gap-4 mb-6 mt-2 flex-wrap">
           <div className="flex items-baseline gap-2 flex-wrap min-w-0">
             {grandTotal > 0 ? (
               <>
                 <span style={{ fontSize: '2.6rem', fontWeight: 900, lineHeight: 1, color: '#ffffff', letterSpacing: '-0.02em' }}>{grandTotal.toLocaleString()}</span>
                 <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>KG</span>
               </>
             ) : showEstGrandTotal ? (
               <>
                 <span style={{ fontSize: '1.05rem', fontWeight: 800, color: EST_SLATE, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>EST.</span>
                 <span style={{ fontSize: '2.6rem', fontWeight: 900, lineHeight: 1, color: EST_SLATE, letterSpacing: '-0.02em' }}>{estGrandTotal.toLocaleString()}</span>
                 <span style={{ fontSize: '0.75rem', fontWeight: 700, color: EST_SLATE, letterSpacing: '0.12em', textTransform: 'uppercase' }}>KG</span>
               </>
             ) : null}
           </div>
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
              const lastSummary = ex.lastSets && ex.lastSets.length > 0
                ? `Last: ${ex.lastSets.length} sets — ${ex.lastSets[0].weight}kg × ${ex.lastSets[0].reps}`
                : 'No previous data';
              const hasData = ex.sets.some(s => s.weight !== '');
              const mult = ex.exercise.multiplier ?? 1;
              const exTotal = calcExerciseTotal(ex.sets, mult);
              const estFromLast =
                ex.lastSets && ex.lastSets.length > 0 ? calcExerciseTotal(ex.lastSets, mult) : 0;
              const showEstHeader = exTotal === 0 && estFromLast > 0;

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div>
                          <p className="font-bold text-sm text-white">
                            {ex.exercise.exercise_name.charAt(0).toUpperCase() + ex.exercise.exercise_name.slice(1).toLowerCase()}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {ex.expanded && ex.exercise.info_notes ? ex.exercise.info_notes : lastSummary}
                          </p>
                        </div>
                        {!ex.expanded && exTotal > 0 && (ex.pbThreshold ?? 0) > 0 && exTotal > (ex.pbThreshold ?? 0) && (
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#000000', letterSpacing: '0.05em' }}>PB</span>
                          </div>
                        )}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {ex.expanded ? <ChevronUp size={20} /> : <ChevronRight size={20} />}
                      </div>
                    </div>
                  </div>

                  {ex.expanded && (
                    <div className="pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            {exTotal > 0 && (
                              <>
                                <span className="font-black" style={{ fontSize: '1.5rem', color: '#ffffff', lineHeight: 1 }}>{exTotal.toLocaleString()}</span>
                                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ffffff' }}>KG</span>
                              </>
                            )}
                            {showEstHeader && (
                              <>
                                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: EST_SLATE }}>EST.</span>
                                <span className="font-black" style={{ fontSize: '1.5rem', color: EST_SLATE, lineHeight: 1 }}>{estFromLast.toLocaleString()}</span>
                                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: EST_SLATE }}>KG</span>
                              </>
                            )}
                          </div>
                          {exTotal > 0 && (ex.pbThreshold ?? 0) > 0 && exTotal > (ex.pbThreshold ?? 0) && (
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              backgroundColor: '#ffffff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#000000', letterSpacing: '0.05em' }}>PB</span>
                            </div>
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
                         const rowTotal = w * set.reps * mult;
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
                        <button
                          onClick={(e) => { e.stopPropagation(); loadMaxSession(ex.exercise.id); }}
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{
                            padding: '3px 12px',
                            borderRadius: '999px',
                            border: '1px solid rgba(255,255,255,0.12)',
                            backgroundColor: 'transparent',
                            color: 'rgba(255,255,255,0.28)',
                            transition: 'all 0.2s',
                            letterSpacing: '0.1em',
                          }}
                        >
                          Max
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

      <section className="mb-4 mt-8">
        <WeeklyWeightsChart />
      </section>
    </div>
  );
};
