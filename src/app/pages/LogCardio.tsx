import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Page } from '../../types';
import { supabase, Exercise, todayStr, getISOWeek, getDayName, currentWeekMonday, recalculateDailyTotals } from '../../lib/supabase';

interface LogCardioProps {
  onNavigate: (page: Page) => void;
}

const tabs: { label: string; page: Page }[] = [
  { label: 'Weights', page: 'weights' },
  { label: 'Cardio', page: 'cardio' },
  { label: 'Calories', page: 'calories' },
];

const heartRateBars = [40, 55, 70, 85, 95, 90, 80, 65, 50, 45, 40, 35, 60, 85, 100];

export const LogCardio: React.FC<LogCardioProps> = ({ onNavigate }) => {
  const [trackerDistance, setTrackerDistance] = useState('');
  const [distance, setDistance] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  const [nonTrackerExercises, setNonTrackerExercises] = useState<Exercise[]>([]);
  const [trackerExercise, setTrackerExercise] = useState<Exercise | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [weeklyTotal, setWeeklyTotal] = useState<number>(0);

  useEffect(() => {
    const loadExercises = async () => {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .eq('type', 'CARDIO')
        .order('exercise_name');
      if (data) {
        const exercises = data as Exercise[];
        const tracker = exercises.find(e =>
          e.exercise_name?.toUpperCase() === 'TRACKER' ||
          e.exercise_name?.toUpperCase() === 'RUNNING'
        );
        if (tracker) setTrackerExercise(tracker);
        // Non-tracker exercises for the EXERCISE dropdown
        const others = exercises.filter(e =>
          e.exercise_name?.toUpperCase() !== 'TRACKER' &&
          e.exercise_name?.toUpperCase() !== 'RUNNING'
        );
        setNonTrackerExercises(others);
        if (others.length > 0) setSelectedExercise(others[0]);
      }
    };
    loadExercises();
  }, []);

  // Same IDs as Dashboard TOTAL_CARDIO_IDS: Tracker=82, Row=83, Cycle=87
  const TOTAL_CARDIO_IDS = [82, 83, 87];

  useEffect(() => {
    const loadWeeklyTotal = async () => {
      const thisMonday = currentWeekMonday();
      const { data } = await supabase
        .from('workouts')
        .select('total_cardio')
        .eq('type', 'CARDIO')
        .in('exercise_id', TOTAL_CARDIO_IDS)
        .gte('date', thisMonday);
      if (data) {
        const total = (data as any[]).reduce((sum, r) => sum + Number(r.total_cardio || 0), 0);
        setWeeklyTotal(+total.toFixed(2));
      }
    };
    loadWeeklyTotal();
  }, [saveSuccess]);

  const handleCommit = async () => {
    const hasTracker = trackerExercise && trackerDistance && parseFloat(trackerDistance) > 0;
    const hasExercise = selectedExercise && distance && parseFloat(distance) > 0;
    if (!hasTracker && !hasExercise) return;

    setSaving(true);
    setSaveError('');
    try {
      const today = todayStr();
      const week = getISOWeek();
      const day = getDayName();

      // Save TRACKER entry
      if (hasTracker && trackerExercise) {
        const km = parseFloat(trackerDistance);
        const totalCardio = +(km * Number(trackerExercise.multiplier)).toFixed(2);
        const { error } = await supabase.from('workouts').insert({
          date: today, week, day, type: 'CARDIO',
          exercise_id: trackerExercise.id,
          km, total_cardio: totalCardio,
          multiplier: trackerExercise.multiplier,
          total_score_k: Math.round(totalCardio * 1000),
          new_entry: 'New', source: 'app',
        });
        if (error) throw error;
      }

      // Save EXERCISE entry
      if (hasExercise && selectedExercise) {
        const km = parseFloat(distance);
        const totalCardio = +(km * Number(selectedExercise.multiplier)).toFixed(2);
        const timeStr = minutes || seconds
          ? `${(minutes || '0').padStart(2, '0')}:${(seconds || '0').padStart(2, '0')}:00`
          : null;
        const { error } = await supabase.from('workouts').insert({
          date: today, week, day, type: 'CARDIO',
          exercise_id: selectedExercise.id,
          km, total_cardio: totalCardio,
          multiplier: selectedExercise.multiplier,
          time: timeStr,
          total_score_k: Math.round(totalCardio * 1000),
          new_entry: 'New', source: 'app',
        });
        if (error) throw error;
      }

      await recalculateDailyTotals(today);
      setSaveSuccess(true);
      setTrackerDistance('');
      setDistance('');
      setMinutes('');
      setSeconds('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    color: '#c6c6c6',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3em',
    fontWeight: 700,
  };

  const separatorStyle = {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(71,71,71,0.35)',
    marginTop: 8,
  };

  const hasAnyInput =
    (trackerDistance && parseFloat(trackerDistance) > 0) ||
    (distance && parseFloat(distance) > 0);

  return (
    <div>
      <nav className="flex gap-8 mb-12 items-end">
        {tabs.map(tab => {
          const isActive = tab.page === 'cardio';
          return (
            <button key={tab.page} onClick={() => onNavigate(tab.page)} className="flex flex-col items-center" style={{ filter: isActive ? 'none' : 'blur(0.4px)' }}>
              <span className="uppercase tracking-widest transition-all"
                style={{ color: isActive ? '#ffffff' : 'rgba(226,226,226,0.65)', fontWeight: isActive ? 900 : 400, fontSize: isActive ? '0.875rem' : '0.65rem', letterSpacing: '0.15em' }}>
                {tab.label}
              </span>
              {isActive && <div className="h-1 w-1 rounded-full mt-1" style={{ backgroundColor: '#ffffff' }} />}
            </button>
          );
        })}
      </nav>

      {/* Header: TRACKER + weekly total */}
      <header className="mb-3">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h1 className="text-[2rem] font-black tracking-tighter leading-none text-white">TRACKER</h1>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', paddingBottom: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {weeklyTotal.toFixed(1)}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>km this week</span>
          </div>
        </div>
      </header>

      {/* TRACKER distance input */}
      <section className="mb-8">
        <div className="flex items-baseline gap-3">
          <input
            type="text"
            value={trackerDistance}
            onChange={e => setTrackerDistance(e.target.value)}
            placeholder="0.0"
            className="text-[2.5rem] font-black tracking-tighter text-white w-full p-0"
            style={{ backgroundColor: 'transparent', border: 'none' }}
          />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#c6c6c6', letterSpacing: '0.05em' }}>KM</span>
        </div>
        <div style={separatorStyle} />
      </section>

      {/* EXERCISE section */}
      <section className="mb-8">
        {/* EXERCISE label */}
        <label style={{ ...labelStyle, display: 'block', marginBottom: 20 }}>Exercise</label>

        {/* Exercise type dropdown */}
        <div className="relative mb-6">
          <button
            onClick={() => setExerciseOpen(o => !o)}
            className="flex items-center justify-between w-full"
            style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 0' }}
          >
            <span>{selectedExercise?.exercise_name || 'Select type'}</span>
            <ChevronDown size={16} style={{ transform: exerciseOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.5)' }} />
          </button>
          <div style={separatorStyle} />

          {exerciseOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              backgroundColor: '#000000', borderRadius: 0,
              overflow: 'hidden', zIndex: 50,
              boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
            }}>
              {nonTrackerExercises.map((ex, i, arr) => (
                <div key={ex.id}
                  onClick={() => { setSelectedExercise(ex); setExerciseOpen(false); }}
                  style={{
                    padding: '14px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    color: '#ffffff',
                    fontWeight: selectedExercise?.id === ex.id ? 700 : 400,
                    fontSize: '1rem',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    backgroundColor: selectedExercise?.id === ex.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                  }}>
                  <span>{ex.exercise_name}</span>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    backgroundColor: selectedExercise?.id === ex.id ? '#ffffff' : 'rgba(255,255,255,0.15)',
                    color: selectedExercise?.id === ex.id ? '#000000' : '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1 }}>+</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distance */}
        <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Distance</label>
        <div className="flex items-baseline gap-4">
          <input
            type="text"
            value={distance}
            onChange={e => setDistance(e.target.value)}
            placeholder="0.0"
            className="text-[3.5rem] font-black tracking-tighter text-white w-full p-0"
            style={{ backgroundColor: 'transparent', border: 'none' }}
          />
          <span className="text-[1.5rem] font-black tracking-tighter" style={{ color: '#c6c6c6' }}>KM</span>
        </div>
        <div style={separatorStyle} />
      </section>

      {/* Duration */}
      <section className="mb-16">
        <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Duration</label>
        <div className="flex items-baseline gap-4">
          <div className="flex items-baseline gap-2">
            <input type="text" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="00"
              className="text-[3.5rem] font-black tracking-tighter text-white w-20 text-right p-0"
              style={{ backgroundColor: 'transparent', border: 'none' }} />
            <span style={{ ...labelStyle }}>MIN</span>
          </div>
          <div className="flex items-baseline gap-2">
            <input type="text" value={seconds} onChange={e => setSeconds(e.target.value)} placeholder="00"
              className="text-[3.5rem] font-black tracking-tighter text-white w-20 text-right p-0"
              style={{ backgroundColor: 'transparent', border: 'none' }} />
            <span style={{ ...labelStyle }}>SEC</span>
          </div>
        </div>
        <div style={separatorStyle} />
      </section>

      <section className="mb-20">
        <div className="p-8 rounded-xl relative overflow-hidden" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="relative z-10">
            <h3 className="text-[0.75rem] uppercase tracking-widest text-white font-bold mb-8">HEART RATE TELEMETRY</h3>
            <div className="flex items-end gap-1 h-32">
              {heartRateBars.map((h, i) => (
                <div key={i} className="w-2 rounded-t-full" style={{ height: `${h}%`, backgroundColor: h >= 80 ? '#ffffff' : h >= 50 ? `rgba(255,255,255,${h / 150})` : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.05, background: 'radial-gradient(circle at top right, white, transparent, transparent)' }} />
        </div>
      </section>

      {saveError && <p className="text-red-400 text-sm mb-4 text-center">{saveError}</p>}

      <button
        onClick={handleCommit}
        disabled={saving || !hasAnyInput}
        className="w-full rounded-full py-5 text-[0.75rem] uppercase tracking-[0.4em] font-black active:scale-95 transition-all"
        style={{ backgroundColor: saveSuccess ? '#22c55e' : '#ffffff', color: '#000000', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', opacity: saving || !hasAnyInput ? 0.6 : 1 }}>
        {saving ? 'Saving...' : saveSuccess ? '✓ Session Saved!' : 'Log Session'}
      </button>
    </div>
  );
};
