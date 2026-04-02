import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Page } from '../../types';
import { supabase, Exercise, todayStr, getISOWeek, getDayName } from '../../lib/supabase';

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
  const [distance, setDistance] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [cardioExercises, setCardioExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const loadExercises = async () => {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .eq('type', 'CARDIO')
        .order('exercise_name');
      if (data) {
        const exercises = data as Exercise[];
        setCardioExercises(exercises);
        // Default to RUNNING if available
        const running = exercises.find(e => e.exercise_name === 'RUNNING');
        if (running) setSelectedExercise(running);
      }
    };
    loadExercises();
  }, []);

  const handleCommit = async () => {
    if (!selectedExercise || !distance) return;
    setSaving(true);
    setSaveError('');
    try {
      const km = parseFloat(distance) || 0;
      const totalCardio = +(km * Number(selectedExercise.multiplier)).toFixed(2);
      const timeStr = minutes || seconds ? `${(minutes || '0').padStart(2, '0')}:${(seconds || '0').padStart(2, '0')}:00` : null;

      const { error } = await supabase.from('workouts').insert({
        date: todayStr(),
        week: getISOWeek(),
        day: getDayName(),
        type: 'CARDIO',
        exercise_id: selectedExercise.id,
        km,
        total_cardio: totalCardio,
        multiplier: selectedExercise.multiplier,
        time: timeStr,
        new_entry: 'New',
        source: 'app',
      });

      if (error) throw error;

      setSaveSuccess(true);
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

      <header className="mb-10">
        <h1 className="text-[2rem] font-black tracking-tighter leading-none mb-2 text-white">LOG PERFORMANCE</h1>
        <p className="text-[0.75rem] uppercase tracking-[0.2em] font-medium" style={{ color: '#c6c6c6' }}>Cardio</p>
      </header>

      {/* Exercise Selector */}
      <section className="mb-10">
        <label className="text-[0.75rem] uppercase tracking-[0.3em] font-bold block mb-3" style={{ color: '#c6c6c6' }}>Exercise</label>
        <div className="relative">
          <button
            onClick={() => setExerciseOpen(o => !o)}
            className="flex items-center justify-between w-full py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
          >
            <span className="text-white font-bold text-lg">
              {selectedExercise ? selectedExercise.exercise_name : 'Select exercise...'}
            </span>
            <ChevronDown size={18} style={{ color: 'rgba(255,255,255,0.4)', transform: exerciseOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {exerciseOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, backgroundColor: '#222222', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', overflow: 'hidden', zIndex: 50, boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
              {cardioExercises.map((ex, i, arr) => (
                <div key={ex.id}
                  onClick={() => { setSelectedExercise(ex); setExerciseOpen(false); }}
                  style={{ padding: '14px 18px', cursor: 'pointer', color: selectedExercise?.id === ex.id ? '#ffffff' : '#aaaaaa', fontWeight: selectedExercise?.id === ex.id ? 700 : 400, fontSize: '0.875rem', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', backgroundColor: selectedExercise?.id === ex.id ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
                  <div>{ex.exercise_name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Multiplier: ×{ex.multiplier}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mb-16">
        <label className="text-[0.75rem] uppercase tracking-[0.3em] font-bold block mb-2" style={{ color: '#c6c6c6' }}>Distance</label>
        <div className="flex items-baseline gap-4">
          <input type="text" value={distance} onChange={e => setDistance(e.target.value)} placeholder="00.00"
            className="text-[4.5rem] font-black tracking-tighter text-white w-full p-0"
            style={{ backgroundColor: 'transparent', border: 'none' }} />
          <span className="text-[1.5rem] font-black tracking-tighter" style={{ color: '#c6c6c6' }}>KM</span>
        </div>
        {selectedExercise && distance && parseFloat(distance) > 0 && (
          <div className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Movement score: {(parseFloat(distance) * Number(selectedExercise.multiplier)).toFixed(2)} km
          </div>
        )}
        <div className="h-px w-full" style={{ backgroundColor: 'rgba(71,71,71,0.2)' }} />
      </section>

      <section className="mb-16">
        <label className="text-[0.75rem] uppercase tracking-[0.3em] font-bold block mb-2" style={{ color: '#c6c6c6' }}>Duration</label>
        <div className="flex items-baseline gap-4">
          <div className="flex items-baseline gap-2">
            <input type="text" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="00"
              className="text-[3.5rem] font-black tracking-tighter text-white w-20 text-right p-0"
              style={{ backgroundColor: 'transparent', border: 'none' }} />
            <span className="text-[0.75rem] uppercase tracking-widest font-bold" style={{ color: '#c6c6c6' }}>MIN</span>
          </div>
          <div className="flex items-baseline gap-2">
            <input type="text" value={seconds} onChange={e => setSeconds(e.target.value)} placeholder="00"
              className="text-[3.5rem] font-black tracking-tighter text-white w-20 text-right p-0"
              style={{ backgroundColor: 'transparent', border: 'none' }} />
            <span className="text-[0.75rem] uppercase tracking-widest font-bold" style={{ color: '#c6c6c6' }}>SEC</span>
          </div>
        </div>
        <div className="h-px w-full" style={{ backgroundColor: 'rgba(71,71,71,0.2)' }} />
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
        disabled={saving || !selectedExercise || !distance}
        className="w-full rounded-full py-5 text-[0.75rem] uppercase tracking-[0.4em] font-black active:scale-95 transition-all"
        style={{ backgroundColor: saveSuccess ? '#22c55e' : '#ffffff', color: '#000000', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', opacity: saving || !distance ? 0.6 : 1 }}>
        {saving ? 'Saving...' : saveSuccess ? '✓ Session Saved!' : 'Commit Session'}
      </button>
    </div>
  );
};
