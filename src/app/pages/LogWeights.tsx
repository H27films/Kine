import React, { useState, useRef, useEffect } from 'react';
import { Dumbbell, ChevronDown, ChevronRight, Minus, Plus, Clock, Check } from 'lucide-react';
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
  Chest: ['Bench Press', 'Incline Press', 'Dumbbell Flyes', 'Cable Crossover', 'Chest Dips', 'Push-ups'],
  Back: ['Deadlift', 'Pull-ups', 'Bent-over Row', 'Lat Pulldown', 'Seated Row', 'Face Pull'],
  Legs: ['Squat', 'Leg Press', 'Romanian Deadlift', 'Lunges', 'Leg Curl', 'Leg Extension', 'Calf Raises'],
};

const lastTimeData: Record<string, { weight: number; reps: number }> = {
  'Bench Press':     { weight: 80,   reps: 10 },
  'Incline Press':   { weight: 70,   reps: 10 },
  'Dumbbell Flyes':  { weight: 24.5, reps: 12 },
  'Cable Crossover': { weight: 15,   reps: 15 },
  'Chest Dips':      { weight: 0,    reps: 12 },
  'Push-ups':        { weight: 0,    reps: 20 },
  'Deadlift':        { weight: 120,  reps: 5  },
  'Pull-ups':        { weight: 0,    reps: 8  },
  'Bent-over Row':   { weight: 70,   reps: 8  },
  'Lat Pulldown':    { weight: 60,   reps: 12 },
  'Seated Row':      { weight: 55,   reps: 12 },
  'Face Pull':       { weight: 20,   reps: 15 },
  'Squat':           { weight: 100,  reps: 8  },
  'Leg Press':       { weight: 140,  reps: 10 },
  'Romanian Deadlift': { weight: 80, reps: 8  },
  'Lunges':          { weight: 30,   reps: 12 },
  'Leg Curl':        { weight: 45,   reps: 12 },
  'Leg Extension':   { weight: 50,   reps: 12 },
  'Calf Raises':     { weight: 60,   reps: 20 },
};

const recentLogs = [
  { name: 'Dumbbell Flyes', sets: 3, reps: 12, weight: 24.5 },
  { name: 'Incline Press',  sets: 4, reps: 10, weight: 80.0 },
  { name: 'Cable Crossover',sets: 3, reps: 15, weight: 15.0 },
];

interface AddedExercise {
  name: string;
  weight: string;
  reps: number;
  expanded: boolean;
  logged: boolean;
}

export const LogWeights: React.FC<LogWeightsProps> = ({ onNavigate }) => {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupOpen, setGroupOpen] = useState(false);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [addedExercises, setAddedExercises] = useState<AddedExercise[]>([]);

  const groupRef = useRef<HTMLDivElement>(null);
  const exerciseRef = useRef<HTMLDivElement>(null);

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

  const handleAddExercise = (name: string) => {
    if (!addedExercises.find(e => e.name === name)) {
      setAddedExercises(prev => [...prev, { name, weight: '', reps: 12, expanded: false, logged: false }]);
    }
  };

  const toggleExpanded = (name: string) => {
    setAddedExercises(prev => prev.map(e => e.name === name ? { ...e, expanded: !e.expanded } : e));
  };

  const updateExercise = (name: string, field: 'weight' | 'reps', value: string | number) => {
    setAddedExercises(prev => prev.map(e => e.name === name ? { ...e, [field]: value } : e));
  };

  const handleLogSet = (name: string) => {
    setAddedExercises(prev => prev.map(e => e.name === name ? { ...e, logged: true, expanded: false } : e));
  };

  const dropdownBoxStyle: React.CSSProperties = {
    backgroundColor: '#1b1b1b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    color: '#ffffff',
    userSelect: 'none',
  };

  const dropdownListStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    backgroundColor: '#222222',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '14px',
    overflow: 'hidden',
    zIndex: 50,
    boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
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

      {/* Muscle Group + Exercise Selection */}
      <section className="mb-8">
        {/* Muscle Group Dropdown */}
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '0.05em' }}>Select Muscle Group</p>
          <div ref={groupRef} className="relative">
            <div style={dropdownBoxStyle} onClick={() => setGroupOpen(o => !o)}>
              <span className="text-sm font-bold" style={{ color: selectedGroup ? '#ffffff' : '#555555' }}>
                {selectedGroup || 'Choose group...'}
              </span>
              <ChevronDown size={16} style={{ color: '#888', transform: groupOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>
            {groupOpen && (
              <div style={dropdownListStyle}>
                {Object.keys(exercisesByGroup).map((group, i, arr) => (
                  <div
                    key={group}
                    onClick={() => handleSelectGroup(group)}
                    style={{
                      padding: '14px 18px',
                      cursor: 'pointer',
                      color: selectedGroup === group ? '#ffffff' : '#aaaaaa',
                      fontWeight: selectedGroup === group ? 700 : 400,
                      fontSize: '0.875rem',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      backgroundColor: selectedGroup === group ? 'rgba(255,255,255,0.06)' : 'transparent',
                    }}
                  >
                    {group}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Exercise Dropdown */}
        {selectedGroup && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '0.05em' }}>Select Exercise</p>
            <div ref={exerciseRef} className="relative">
              <div style={dropdownBoxStyle} onClick={() => setExerciseOpen(o => !o)}>
                <span className="text-sm" style={{ color: '#555555' }}>Choose exercise...</span>
                <ChevronDown size={16} style={{ color: '#888', transform: exerciseOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              {exerciseOpen && (
                <div style={dropdownListStyle}>
                  {exercisesByGroup[selectedGroup].map((ex, i, arr) => {
                    const alreadyAdded = !!addedExercises.find(e => e.name === ex);
                    return (
                      <div
                        key={ex}
                        style={{
                          padding: '12px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          backgroundColor: alreadyAdded ? 'rgba(255,255,255,0.04)' : 'transparent',
                        }}
                      >
                        <span style={{ color: alreadyAdded ? '#666' : '#cccccc', fontSize: '0.875rem' }}>{ex}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddExercise(ex); }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: alreadyAdded ? '#2a2a2a' : '#ffffff',
                            color: alreadyAdded ? '#444' : '#1a1a1a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            cursor: alreadyAdded ? 'default' : 'pointer',
                            border: 'none',
                          }}
                          disabled={alreadyAdded}
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Exercise List */}
      {addedExercises.length > 0 && (
        <section className="mb-10">
          <div className="space-y-0">
            {addedExercises.map((ex, i) => {
              const last = lastTimeData[ex.name];
              const lastText = last
                ? last.weight > 0
                  ? `Last time: ${last.weight}kg × ${last.reps} reps`
                  : `Last time: ${last.reps} reps`
                : 'No previous data';

              return (
                <div key={ex.name}>
                  {/* Row */}
                  <div
                    className="flex items-center gap-4 py-4"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* Tick circle */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: ex.logged ? 'none' : '2px solid rgba(255,255,255,0.2)',
                        backgroundColor: ex.logged ? '#ffffff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.25s',
                      }}
                    >
                      {ex.logged && <Check size={16} color="#1a1a1a" strokeWidth={3} />}
                    </div>

                    {/* Name + last time */}
                    <div className="flex-grow">
                      <p className="font-bold text-sm text-white">{ex.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{lastText}</p>
                    </div>

                    {/* Chevron */}
                    <button
                      onClick={() => toggleExpanded(ex.name)}
                      style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}
                    >
                      <ChevronRight
                        size={20}
                        style={{
                          transform: ex.expanded ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </button>
                  </div>

                  {/* Expanded entry panel */}
                  {ex.expanded && (
                    <div
                      className="py-6 px-2"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {/* Weight */}
                      <div className="flex items-baseline gap-2 mb-6">
                        <input
                          type="number"
                          value={ex.weight}
                          onChange={(e) => updateExercise(ex.name, 'weight', e.target.value)}
                          placeholder="00"
                          className="text-6xl font-black tracking-tighter text-white"
                          style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', width: '7rem', color: '#ffffff' }}
                        />
                        <span className="text-xl font-bold uppercase tracking-widest" style={{ color: '#c6c6c6' }}>KG</span>
                      </div>

                      {/* Reps + Log Set */}
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#888' }}>Repetitions</label>
                          <div className="flex items-center justify-between rounded-full px-4 py-3" style={{ backgroundColor: '#1b1b1b' }}>
                            <button onClick={() => updateExercise(ex.name, 'reps', Math.max(1, ex.reps - 1))} style={{ color: '#c6c6c6' }}><Minus size={18} /></button>
                            <span className="text-xl font-black text-white">{ex.reps}</span>
                            <button onClick={() => updateExercise(ex.name, 'reps', ex.reps + 1)} style={{ color: '#c6c6c6' }}><Plus size={18} /></button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleLogSet(ex.name)}
                          className="font-black uppercase tracking-widest text-xs px-6 py-4 rounded-full mt-6 active:scale-90 duration-150"
                          style={{ backgroundColor: '#ffffff', color: '#1a1c1c', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}
                        >
                          Log Set
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Logs */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black tracking-tight uppercase text-white">Recent Logs</h2>
          <Clock size={18} style={{ color: '#c6c6c6' }} />
        </div>
        <div className="space-y-4">
          {recentLogs.map((log, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: '#1b1b1b' }}>
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
