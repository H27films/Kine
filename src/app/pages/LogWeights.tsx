import React, { useState, useRef, useEffect } from 'react';
import { Dumbbell, ChevronDown, ChevronRight, ChevronUp, Plus, Minus, Clock, Check, X, Calendar } from 'lucide-react';
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
  'Bench Press':       { weight: 80,   reps: 10 },
  'Incline Press':     { weight: 70,   reps: 10 },
  'Dumbbell Flyes':    { weight: 24.5, reps: 12 },
  'Cable Crossover':   { weight: 15,   reps: 15 },
  'Chest Dips':        { weight: 0,    reps: 12 },
  'Push-ups':          { weight: 0,    reps: 20 },
  'Deadlift':          { weight: 120,  reps: 5  },
  'Pull-ups':          { weight: 0,    reps: 8  },
  'Bent-over Row':     { weight: 70,   reps: 8  },
  'Lat Pulldown':      { weight: 60,   reps: 12 },
  'Seated Row':        { weight: 55,   reps: 12 },
  'Face Pull':         { weight: 20,   reps: 15 },
  'Squat':             { weight: 100,  reps: 8  },
  'Leg Press':         { weight: 140,  reps: 10 },
  'Romanian Deadlift': { weight: 80,   reps: 8  },
  'Lunges':            { weight: 30,   reps: 12 },
  'Leg Curl':          { weight: 45,   reps: 12 },
  'Leg Extension':     { weight: 50,   reps: 12 },
  'Calf Raises':       { weight: 60,   reps: 20 },
};

const recentLogs = [
  { name: 'Dumbbell Flyes',  sets: 3, reps: 12, weight: 24.5 },
  { name: 'Incline Press',   sets: 4, reps: 10, weight: 80.0 },
  { name: 'Cable Crossover', sets: 3, reps: 15, weight: 15.0 },
];

const weeklyData = [
  { group: 'Chest', total: 4200,  lastWeek: 3800 },
  { group: 'Back',  total: 6800,  lastWeek: 7100 },
  { group: 'Legs',  total: 8100,  lastWeek: 6200 },
];

const WEEKLY_MAX = 30000;

interface SetRow {
  weight: string;
  reps: number;
}

interface AddedExercise {
  name: string;
  sets: SetRow[];
  expanded: boolean;
  logged: boolean;
  copied: boolean;
}

const makeDefaultSets = (): SetRow[] =>
  Array.from({ length: 4 }, () => ({ weight: '', reps: 10 }));

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

  const cancelSelection = () => {
    setSelectedGroup('');
    setGroupOpen(false);
    setExerciseOpen(false);
    // addedExercises intentionally kept
  };

  const handleAddExercise = (name: string) => {
    if (!addedExercises.find(e => e.name === name)) {
      setAddedExercises(prev => [...prev, {
        name,
        sets: makeDefaultSets(),
        expanded: false,
        logged: false,
        copied: false,
      }]);
    }
  };

  const toggleExpanded = (name: string) => {
    setAddedExercises(prev =>
      prev.map(e => e.name === name ? { ...e, expanded: !e.expanded } : e)
    );
  };

  const updateSet = (exName: string, setIdx: number, field: 'weight' | 'reps', value: string | number) => {
    setAddedExercises(prev =>
      prev.map(e => {
        if (e.name !== exName) return e;
        const sets = e.sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s);
        return { ...e, sets };
      })
    );
  };

  const addSet = (exName: string) => {
    setAddedExercises(prev =>
      prev.map(e => {
        if (e.name !== exName || e.sets.length >= 6) return e;
        return { ...e, sets: [...e.sets, { weight: '', reps: 10 }] };
      })
    );
  };

  const toggleCopyFromLast = (exName: string) => {
    const ex = addedExercises.find(e => e.name === exName);
    if (!ex) return;

    if (ex.copied) {
      setAddedExercises(prev =>
        prev.map(e =>
          e.name !== exName ? e : {
            ...e,
            copied: false,
            sets: makeDefaultSets(),
          }
        )
      );
    } else {
      const last = lastTimeData[exName];
      if (!last) return;
      setAddedExercises(prev =>
        prev.map(e => {
          if (e.name !== exName) return e;
          const sets = e.sets.map(() => ({
            weight: last.weight > 0 ? String(last.weight) : '',
            reps: last.reps,
          }));
          return { ...e, sets, copied: true };
        })
      );
    }
  };

  const handleLogAll = () => {
    setAddedExercises(prev =>
      prev.map(e => ({ ...e, logged: true, expanded: false }))
    );
  };

  const calcExerciseTotal = (sets: SetRow[]): number =>
    sets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * s.reps, 0);

  const grandTotal = addedExercises.reduce((acc, ex) => acc + calcExerciseTotal(ex.sets), 0);

  // Whether the muscle group selector is in its "active" (small) state
  const selectorActive = groupOpen || !!selectedGroup;

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

  const textTriggerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    userSelect: 'none',
  };

  // Shared label style — used for both RECENT LOGS and WEEKLY
  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '1.15rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    textTransform: 'uppercase',
    color: '#ffffff',
    marginBottom: '1.25rem',
  };

  return (
    <div>
      {/* Tab Nav */}
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
      <section className="mb-12">
        {/* Muscle Group */}
        <div ref={groupRef} className="relative mb-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div onClick={() => setGroupOpen(o => !o)} style={textTriggerStyle}>
              <span
                style={{
                  color: '#ffffff',
                  fontSize: selectorActive ? '0.875rem' : '2rem',
                  fontWeight: selectorActive ? 700 : 900,
                  letterSpacing: selectorActive ? '0.03em' : '-0.05em',
                  transition: 'font-size 0.2s ease, letter-spacing 0.2s ease',
                  lineHeight: 1.1,
                  textTransform: 'uppercase',
                }}
              >
                {selectedGroup || (selectorActive ? 'Select Muscle Group' : 'Select')}
              </span>
              <ChevronDown
                size={selectorActive ? 14 : 20}
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  transform: groupOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                }}
              />
            </div>

            {/* X cancel — only when group is selected */}
            {selectedGroup && (
              <button
                onClick={cancelSelection}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.35)',
                  padding: '4px',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
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

        {/* Exercise Dropdown */}
        {selectedGroup && (
          <div ref={exerciseRef} className="relative">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div onClick={() => setExerciseOpen(o => !o)} style={textTriggerStyle}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', fontWeight: 500, letterSpacing: '0.03em' }}>
                  Choose exercise...
                </span>
                <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)', transform: exerciseOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {/* X on exercise row — closes exercise picker only */}
              {exerciseOpen && (
                <button
                  onClick={() => setExerciseOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.35)',
                    padding: '4px',
                    flexShrink: 0,
                    marginLeft: '8px',
                  }}
                >
                  <X size={16} strokeWidth={2} />
                </button>
              )}
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
                          width: 28, height: 28, borderRadius: '50%',
                          backgroundColor: alreadyAdded ? '#2a2a2a' : '#ffffff',
                          color: alreadyAdded ? '#444' : '#1a1a1a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
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
        )}
      </section>

      {/* Grand Total */}
      {addedExercises.length > 0 && grandTotal > 0 && (
        <div className="flex items-baseline gap-2 mb-6 mt-2">
          <span style={{ fontSize: '2.6rem', fontWeight: 900, lineHeight: 1, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {grandTotal.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            KG
          </span>
        </div>
      )}

      {/* Exercise List */}
      {addedExercises.length > 0 && (
        <section className="mb-10">
          <div className="space-y-0">
            {addedExercises.map((ex) => {
              const last = lastTimeData[ex.name];
              const lastText = last
                ? last.weight > 0 ? `Last time: ${last.weight}kg × ${last.reps} reps` : `Last time: ${last.reps} reps`
                : 'No previous data';
              const hasData = ex.sets.some(s => s.weight !== '');
              const exTotal = calcExerciseTotal(ex.sets);

              return (
                <div key={ex.name}>
                  {/* Exercise Row */}
                  <div
                    className="flex items-center gap-4 py-4"
                    style={{ borderBottom: ex.expanded ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {/* Tick circle */}
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: hasData || ex.logged ? 'none' : '2px solid rgba(255,255,255,0.2)',
                        backgroundColor: hasData || ex.logged ? '#ffffff' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.25s',
                      }}
                    >
                      {(hasData || ex.logged) && <Check size={14} color="#1a1a1a" strokeWidth={3} />}
                    </div>

                    {/* Name + last time */}
                    <div className="flex-grow">
                      <p className="font-bold text-sm text-white">{ex.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{lastText}</p>
                    </div>

                    {/* Chevron */}
                    <button onClick={() => toggleExpanded(ex.name)} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                      {ex.expanded ? <ChevronUp size={20} /> : <ChevronRight size={20} />}
                    </button>
                  </div>

                  {/* Expanded set panel */}
                  {ex.expanded && (
                    <div className="pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {/* TOP ROW: total (left) + copy toggle (right) */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-baseline gap-1">
                          {exTotal > 0 && (
                            <>
                              <span className="font-black" style={{ fontSize: '1.5rem', color: '#ffffff', lineHeight: 1 }}>
                                {exTotal.toLocaleString()}
                              </span>
                              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ffffff' }}>KG</span>
                            </>
                          )}
                        </div>

                        {/* + / − toggle button */}
                        <button
                          onClick={() => toggleCopyFromLast(ex.name)}
                          title={ex.copied ? 'Clear entries' : 'Copy from last session'}
                          style={{
                            width: 30, height: 30, borderRadius: '50%',
                            backgroundColor: ex.copied ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                            border: ex.copied ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: ex.copied ? '#ffffff' : 'rgba(255,255,255,0.55)',
                            cursor: 'pointer', flexShrink: 0,
                            transition: 'all 0.2s',
                          }}
                        >
                          {ex.copied
                            ? <Minus size={14} strokeWidth={2.5} />
                            : <Plus size={14} strokeWidth={2.5} />
                          }
                        </button>
                      </div>

                      {/* Column headers */}
                      <div className="grid mb-2" style={{ gridTemplateColumns: '1.8rem 1fr 1fr 1fr', gap: '0.5rem' }}>
                        <div />
                        <p className="text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>kg</p>
                        <p className="text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>reps</p>
                        <p className="text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>total</p>
                      </div>

                      {/* Set rows */}
                      {ex.sets.map((set, idx) => {
                        const w = parseFloat(set.weight) || 0;
                        const rowTotal = w * set.reps;
                        const rowHasData = set.weight !== '';
                        const numColor = rowHasData ? '#ffffff' : 'rgba(255,255,255,0.25)';
                        return (
                          <div key={idx} className="grid items-center mb-2" style={{ gridTemplateColumns: '1.8rem 1fr 1fr 1fr', gap: '0.5rem' }}>
                            <p className="font-black" style={{ fontSize: '1rem', color: numColor, lineHeight: 1, textAlign: 'center', transition: 'color 0.2s' }}>
                              {idx + 1}
                            </p>
                            <input
                              type="number"
                              value={set.weight}
                              onChange={e => updateSet(ex.name, idx, 'weight', e.target.value)}
                              placeholder="—"
                              className="text-center font-bold rounded-lg py-2"
                              style={{
                                backgroundColor: '#1b1b1b', border: '1px solid rgba(255,255,255,0.07)',
                                outline: 'none', width: '100%', fontSize: '0.875rem',
                                color: rowHasData ? '#ffffff' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s',
                              }}
                            />
                            <div
                              className="flex items-center justify-between rounded-lg py-2 px-2"
                              style={{ backgroundColor: '#1b1b1b', border: '1px solid rgba(255,255,255,0.07)' }}
                            >
                              <button onClick={() => updateSet(ex.name, idx, 'reps', Math.max(1, set.reps - 1))} style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>−</button>
                              <span className="font-bold" style={{ fontSize: '0.875rem', color: rowHasData ? '#ffffff' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}>{set.reps}</span>
                              <button onClick={() => updateSet(ex.name, idx, 'reps', set.reps + 1)} style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>+</button>
                            </div>
                            <p className="text-center font-bold" style={{ fontSize: '0.875rem', color: '#ffffff', transition: 'color 0.2s' }}>
                              {rowTotal > 0 ? rowTotal : ''}
                            </p>
                          </div>
                        );
                      })}

                      {/* + Set */}
                      <div className="flex items-center mt-4">
                        {ex.sets.length < 6 && (
                          <button
                            onClick={() => addSet(ex.name)}
                            className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
                            style={{ color: 'rgba(255,255,255,0.35)' }}
                          >
                            <Plus size={13} />
                            <span>Set</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Log Exercises button */}
          <button
            onClick={handleLogAll}
            className="w-full mt-8 py-4 rounded-full font-black uppercase tracking-widest text-sm active:scale-95 duration-150"
            style={{ backgroundColor: '#ffffff', color: '#1a1c1c', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}
          >
            Log Exercises
          </button>
        </section>
      )}

      {/* WEEKLY Section */}
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
                      Last week: {lastWeek.toLocaleString()}kg
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {total.toLocaleString()}
                    </span>
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

      {/* Recent Logs */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <p style={sectionLabelStyle}>Recent Logs</p>
          <Clock size={15} style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.25rem' }} />
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
