import React, { useState } from 'react';
import { Dumbbell, ChevronDown, Minus, Plus, Clock } from 'lucide-react';
import { Page } from '../../types';

interface LogWeightsProps {
  onNavigate: (page: Page) => void;
}

const tabs: { label: string; page: Page }[] = [
  { label: 'Weights', page: 'weights' },
  { label: 'Cardio', page: 'cardio' },
  { label: 'Calories', page: 'calories' },
];

const exercisesByGroup: Record<string, string[]> = {
  chest: ['Bench Press', 'Incline Press', 'Dumbbell Flyes', 'Cable Crossover', 'Chest Dips', 'Push-ups'],
  back: ['Deadlift', 'Pull-ups', 'Bent-over Row', 'Lat Pulldown', 'Seated Row', 'Face Pull'],
  legs: ['Squat', 'Leg Press', 'Romanian Deadlift', 'Lunges', 'Leg Curl', 'Leg Extension', 'Calf Raises'],
};

const recentLogs = [
  { name: 'Dumbbell Flyes', sets: 3, reps: 12, weight: 24.5 },
  { name: 'Incline Press', sets: 4, reps: 10, weight: 80.0 },
  { name: 'Cable Crossover', sets: 3, reps: 15, weight: 15.0 },
];

export const LogWeights: React.FC<LogWeightsProps> = ({ onNavigate }) => {
  const [reps, setReps] = useState(12);
  const [weight, setWeight] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [activeExercise, setActiveExercise] = useState('');

  const handleAddExercise = () => {
    if (selectedExercise) {
      setActiveExercise(selectedExercise);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <nav className="flex gap-8 mb-12 items-end">
        {tabs.map((tab) => {
          const isActive = tab.page === 'weights';
          return (
            <button key={tab.page} onClick={() => onNavigate(tab.page)} className="flex flex-col items-center" style={{ filter: isActive ? 'none' : 'blur(0.4px)' }}>
              <span
                className="uppercase tracking-widest transition-all"
                style={{
                  color: isActive ? '#ffffff' : 'rgba(226,226,226,0.65)',
                  fontWeight: isActive ? 900 : 400,
                  fontSize: isActive ? '0.875rem' : '0.65rem',
                  letterSpacing: '0.15em',
                }}
              >
                {tab.label}
              </span>
              {isActive && <div className="h-1 w-1 rounded-full mt-1" style={{ backgroundColor: '#ffffff' }} />}
            </button>
          );
        })}
      </nav>

      {/* Target Section */}
      <section className="mb-10">
        <div className="flex items-baseline gap-4 mb-5">
          <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white">Target</h2>
        </div>

        {/* Muscle Group Dropdown */}
        <div className="mb-3">
          <label className="block text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: '#c6c6c6' }}>Select Muscle Group</label>
          <div className="relative">
            <select
              value={selectedGroup}
              onChange={(e) => { setSelectedGroup(e.target.value); setSelectedExercise(''); setActiveExercise(''); }}
              className="w-full appearance-none px-5 py-4 rounded-xl font-bold uppercase tracking-widest text-sm cursor-pointer"
              style={{
                backgroundColor: '#1b1b1b',
                border: '1px solid rgba(255,255,255,0.08)',
                color: selectedGroup ? '#ffffff' : '#666666',
                outline: 'none',
              }}
            >
              <option value="" disabled>Choose group...</option>
              <option value="chest">Chest</option>
              <option value="back">Back</option>
              <option value="legs">Legs</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#c6c6c6' }} />
          </div>
        </div>

        {/* Exercise Dropdown — shown once group selected */}
        {selectedGroup && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: '#c6c6c6' }}>Select Exercise</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="w-full appearance-none px-5 py-4 rounded-xl font-bold uppercase tracking-widest text-sm cursor-pointer"
                  style={{
                    backgroundColor: '#1b1b1b',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: selectedExercise ? '#ffffff' : '#666666',
                    outline: 'none',
                  }}
                >
                  <option value="" disabled>Choose exercise...</option>
                  {exercisesByGroup[selectedGroup].map((ex) => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#c6c6c6' }} />
              </div>
              {/* + button */}
              <button
                onClick={handleAddExercise}
                disabled={!selectedExercise}
                className="flex items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 active:scale-90 duration-150 transition-all"
                style={{
                  backgroundColor: selectedExercise ? '#ffffff' : '#2a2a2a',
                  color: selectedExercise ? '#1a1c1c' : '#555555',
                }}
              >
                <Plus size={22} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Entry Area */}
      <section className="mb-12 p-8 rounded-xl" style={{ backgroundColor: '#0e0e0e', border: '1px solid rgba(71,71,71,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: '#c6c6c6' }}>
            {activeExercise ? `New Entry: ${activeExercise}` : 'New Entry'}
          </h3>
          {!activeExercise && (
            <p className="text-sm" style={{ color: '#444444' }}>Select an exercise above and tap + to begin</p>
          )}
          {activeExercise && (
            <>
              <div className="flex items-baseline gap-2">
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="00"
                  className="text-6xl font-black tracking-tighter text-white w-32 p-0"
                  style={{ backgroundColor: 'transparent', border: 'none', color: '#ffffff', outline: 'none' }}
                />
                <span className="text-xl font-bold uppercase tracking-widest" style={{ color: '#c6c6c6' }}>KG</span>
              </div>
              <div className="flex items-center justify-between gap-6 mt-6">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#c6c6c6' }}>Repetitions</label>
                  <div className="flex items-center justify-between rounded-full px-4 py-2" style={{ backgroundColor: '#1b1b1b' }}>
                    <button onClick={() => setReps(Math.max(1, reps - 1))} className="hover:text-white transition-colors" style={{ color: '#c6c6c6' }}><Minus size={18} /></button>
                    <span className="text-xl font-black text-white">{reps}</span>
                    <button onClick={() => setReps(reps + 1)} className="hover:text-white transition-colors" style={{ color: '#c6c6c6' }}><Plus size={18} /></button>
                  </div>
                </div>
                <button className="font-black uppercase tracking-widest text-xs px-8 py-4 rounded-full mt-6 active:scale-90 duration-150" style={{ backgroundColor: '#ffffff', color: '#1a1c1c', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}>Log Set</button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Recent Logs */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black tracking-tight uppercase text-white">Recent Logs</h2>
          <Clock size={18} style={{ color: '#c6c6c6' }} />
        </div>
        <div className="space-y-4">
          {recentLogs.map((log, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg transition-colors" style={{ backgroundColor: '#1b1b1b' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#353535' }}><Dumbbell size={18} color="white" /></div>
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
