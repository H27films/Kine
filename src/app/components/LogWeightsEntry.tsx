import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { supabase, Exercise } from '../../lib/supabase';
import { Page } from '../../types';
import { DoubleArrowIcon } from '../components/DoubleArrowIcon';
import { ExerciseAdder } from './ExerciseAdder';
import { SetInputRow } from './SetInputRow';
import { SummaryExerciseList } from './SummaryExerciseList';
import { WeightsBottomBar } from './WeightsBottomBar';

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

interface LogWeightsEntryProps {
  addedExercises: AddedExercise[];
  onUpdateSet?: (exerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string | number) => void;
  onAddSet?: (exerciseId: number) => void;
  onToggleFail?: (exerciseId: number) => void;
  onLoadMaxSession?: (exerciseId: number) => void;
  onToggleCopyFromLast?: (exerciseId: number) => void;
  onRemoveExercise?: (exerciseId: number) => void;
  onClose: () => void;
  todayLoggedTotal: number;
  onAddExercise?: (exercise: Exercise) => void;
  exercisesByGroup: Record<string, Exercise[]>;
  onNavigate?: (page: Page, data?: any) => void;
  showDoubleArrow?: boolean;
  showDailyTotalOnly?: boolean;
  onApplySavedTemplate?: () => void;
  onRandomList?: (group?: string) => void;
  onLogAll?: () => void;
}

const LogWeightsEntry: React.FC<LogWeightsEntryProps> = ({
  addedExercises,
  onUpdateSet = () => {},
  onAddSet = () => {},
  onToggleFail = () => {},
  onLoadMaxSession = () => {},
  onToggleCopyFromLast = () => {},
  onRemoveExercise = () => {},
  onClose,
  todayLoggedTotal,
  onAddExercise = () => {},
  exercisesByGroup,
  onNavigate,
  showDoubleArrow = true,
  showDailyTotalOnly = false,
  onApplySavedTemplate = () => {},
  onRandomList = () => {},
  onLogAll = () => {},
}) => {
  const [activeExIndex, setActiveExIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTodayTotal, setShowTodayTotal] = useState(false);
  const [adderOpen, setAdderOpen] = useState(false);
  const [adderGroup, setAdderGroup] = useState<string | null>(null);
  const [randomListExpanded, setRandomListExpanded] = useState(false);
  const randomListRef = useRef<HTMLDivElement>(null);
  const [showExerciseInfo, setShowExerciseInfo] = useState(false);
  const [logConfirm, setLogConfirm] = useState(false);
  const logConfirmRef = useRef(false);
  const [logging, setLogging] = useState(false);
  const [estTotal, setEstTotal] = useState<number | null>(null);
  const adderRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const setLogConfirmSynced = (val: boolean) => {
    logConfirmRef.current = val;
    setLogConfirm(val);
  };

  const safeIndex = Math.min(activeExIndex, Math.max(0, addedExercises.length - 1));
  const activeEx = addedExercises[safeIndex] ?? null;

  const orderedExercises = addedExercises.length > 1
    ? [...addedExercises.slice(safeIndex), ...addedExercises.slice(0, safeIndex)]
    : addedExercises;

  useEffect(() => {
    if (addedExercises.length === 0 && !adderOpen) {
      setAdderOpen(true);
      setAdderGroup(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bottomRef.current && !bottomRef.current.contains(e.target as Node)) {
        setShowAdvanced(false);
        if (!logging) setLogConfirmSynced(false);
      }
      if (adderRef.current && !adderRef.current.contains(e.target as Node)) {
        setAdderOpen(false);
        setAdderGroup(null);
        if (!logging) setLogConfirmSynced(false);
      }
      if (randomListExpanded && randomListRef.current && !randomListRef.current.contains(e.target as Node)) {
        setRandomListExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [addedExercises.length, logging, randomListExpanded]);

  useEffect(() => {
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollLeft = 0;
    }
  }, [activeExIndex, adderOpen]);

  useEffect(() => {
    if (addedExercises.length === 0) { setEstTotal(null); return; }
    const fetchEst = async () => {
      const ids = addedExercises.map(ex => ex.exercise.id);
      let total = 0;
      await Promise.all(ids.map(async (id) => {
        const { data } = await supabase
          .from('workouts')
          .select('total_weight')
          .eq('exercise_id', id)
          .not('total_weight', 'is', null)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.total_weight) total += Number(data.total_weight);
      }));
      setEstTotal(total);
    };
    fetchEst();
  }, [addedExercises.map(e => e.exercise.id).join(',')]);

  const calcExerciseTotal = (sets: SetRow[], multiplier: number = 1): number =>
    sets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * s.reps * multiplier, 0);

  const pendingTotal = addedExercises.reduce((acc, ex) => acc + calcExerciseTotal(ex.sets, ex.exercise.multiplier ?? 1), 0);
  const todayTotalSum = showDailyTotalOnly ? pendingTotal : todayLoggedTotal + pendingTotal;

  const mult = activeEx?.exercise?.multiplier ?? 1;
  const exTotal = activeEx ? calcExerciseTotal(activeEx.sets, mult) : 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: '#f2f2f2', color: '#1a1a1a',
        fontFamily: "'Archivo', sans-serif",
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        onClick={showDailyTotalOnly ? undefined : () => setShowTodayTotal(!showTodayTotal)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 10px',
          paddingTop: 'calc(18px + env(safe-area-inset-top))',
          cursor: showDailyTotalOnly ? 'default' : 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, marginRight: '20px' }}>
          {showDailyTotalOnly || showTodayTotal ? (
            <>
              <span style={{ fontSize: '22px', fontWeight: 350, letterSpacing: '-0.02em', color: '#1a1a1a', lineHeight: 1 }}>/</span>
              <span style={{ fontSize: '22px', fontWeight: 350, letterSpacing: '-0.02em', color: '#1a1a1a', lineHeight: 1 }}>
                {todayTotalSum.toLocaleString()}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 400, color: 'rgba(26,26,26,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KG</span>
              <div style={{ height: '12px', flex: 1, backgroundColor: 'rgba(26,26,26,0.1)', borderRadius: '999px', overflow: 'hidden', padding: '2px' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((todayTotalSum / 20000) * 100, 100)}%`,
                  background: 'linear-gradient(to right, rgba(26,26,26,0.6), #1a1a1a)',
                  borderRadius: '999px', transition: 'width 0.3s ease',
                }} />
              </div>
            </>
          ) : (
            <>
              <span style={{ fontSize: '28px', fontWeight: 350, letterSpacing: '-0.02em', color: '#1a1a1a', lineHeight: 1 }}>
                {activeEx ? (exTotal > 0 ? exTotal.toLocaleString() : '0') : '0'}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 400, color: 'rgba(26,26,26,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KG</span>
              {activeEx && exTotal > 0 && activeEx.pbThreshold > 0 && exTotal > activeEx.pbThreshold && (
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '4px' }}>
                  <span style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>PB</span>
                </div>
              )}
            </>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1a1a1a' }}>
          <ArrowLeft size={26} strokeWidth={1.8} />
        </button>
      </div>

      {/* Exercise tabs */}
      <div
        ref={tabScrollRef}
        style={{
          display: 'flex', gap: '18px', padding: '6px 20px 12px',
          overflowX: 'auto', whiteSpace: 'nowrap',
          scrollbarWidth: 'none', msOverflowStyle: 'none', alignItems: 'baseline',
        }}
      >
        {showDailyTotalOnly ? (
          <span style={{ fontSize: '17px', fontWeight: 400, color: '#1a1a1a', letterSpacing: '0.02em', borderBottom: '1.5px solid #333333', padding: '4px 0', flexShrink: 0 }}>
            SUMMARY
          </span>
        ) : (
          <>
            {adderOpen ? (
              <>
                <span style={{ fontSize: '17px', fontWeight: 400, color: '#1a1a1a', letterSpacing: '0.02em', borderBottom: '1.5px solid #333333', padding: '4px 0', flexShrink: 0 }}>
                  + EXERCISE
                </span>
                {orderedExercises.map((ex) => {
                  const hasData = ex.sets.some(s => s.weight !== '');
                  return (
                    <button
                      key={ex.exercise.id}
                      onClick={() => {
                        const idxInOriginal = addedExercises.findIndex(e => e.exercise.id === ex.exercise.id);
                        setActiveExIndex(idxInOriginal);
                        setAdderOpen(false);
                        setAdderGroup(null);
                      }}
                      style={{
                        background: 'none', border: 'none',
                        borderBottom: hasData ? '1px solid rgba(26,26,26,0.12)' : 'none',
                        padding: '4px 0', cursor: 'pointer', flexShrink: 0,
                        transition: 'all 0.2s ease', fontSize: '11px', fontWeight: 300,
                        color: 'rgba(26,26,26,0.35)', filter: 'blur(3px)', letterSpacing: '0.02em',
                      }}
                    >
                      {ex.exercise.exercise_name.toUpperCase()}
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {orderedExercises.map((ex, i) => {
                  const isActive = i === 0;
                  const hasData = ex.sets.some(s => s.weight !== '');
                  return (
                    <button
                      key={ex.exercise.id}
                      onClick={() => {
                        const idxInOriginal = addedExercises.findIndex(e => e.exercise.id === ex.exercise.id);
                        if (idxInOriginal === activeExIndex) {
                          setShowExerciseInfo(!showExerciseInfo);
                        } else {
                          setActiveExIndex(idxInOriginal);
                          setShowExerciseInfo(false);
                        }
                      }}
                      style={{
                        background: 'none', border: 'none',
                        borderBottom: isActive ? '1.5px solid #333333' : hasData ? '1px solid rgba(26,26,26,0.12)' : 'none',
                        padding: '4px 0', cursor: 'pointer', flexShrink: 0,
                        transition: 'all 0.2s ease',
                        fontSize: isActive ? '17px' : '11px',
                        fontWeight: isActive ? 400 : 300,
                        color: isActive ? '#1a1a1a' : 'rgba(26,26,26,0.35)',
                        filter: isActive ? 'none' : 'blur(0.5px)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {ex.exercise.exercise_name.toUpperCase()}
                    </button>
                  );
                })}
                {(addedExercises.length > 0 || !adderOpen) && (
                  <button
                    onClick={() => { setAdderOpen(true); setAdderGroup(null); }}
                    style={{
                      background: 'none', border: 'none', padding: '4px 0',
                      cursor: 'pointer', fontSize: '16px', fontWeight: 400,
                      color: '#1a1a1a', letterSpacing: '0.02em', filter: 'none',
                      borderBottom: addedExercises.length === 0 ? '1.5px solid #333333' : 'none',
                      marginBottom: addedExercises.length === 0 ? '2px' : '0',
                    }}
                  >
                    + ADD
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Adder dropdown */}
      <div ref={adderRef}>
        {adderOpen && !showDailyTotalOnly && (
          <ExerciseAdder
            adderGroup={adderGroup}
            setAdderGroup={setAdderGroup}
            exercisesByGroup={exercisesByGroup}
            addedExercises={addedExercises}
            onAddExercise={onAddExercise}
          />
        )}
      </div>

      {/* Exercise info row */}
      {showExerciseInfo && activeEx && (
        <div style={{
          padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)',
          fontSize: '14px', fontWeight: 400, color: '#333333',
          letterSpacing: '0.02em', textTransform: 'capitalize',
          fontFamily: "'Archivo', sans-serif",
        }}>
          {activeEx.exercise.info_notes || 'No Information'}
        </div>
      )}

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '0 20px',
        filter: adderOpen ? 'blur(3px)' : 'none',
        opacity: adderOpen ? 0.3 : 1,
        transition: 'filter 0.25s ease, opacity 0.25s ease',
        pointerEvents: adderOpen ? 'none' : 'auto',
      }}>
        {showDailyTotalOnly ? (
          <SummaryExerciseList
            addedExercises={addedExercises}
            calcExerciseTotal={calcExerciseTotal}
          />
        ) : activeEx ? (
          <>
            {activeEx.sets.map((set, idx) => (
              <SetInputRow
                key={idx}
                set={set}
                idx={idx}
                mult={mult}
                exerciseId={activeEx.exercise.id}
                onUpdateSet={onUpdateSet}
              />
            ))}

            {/* Add set / fail / copy */}
            {activeEx.sets.length < 6 && (
              <>
                <div style={{ height: '0.5px', backgroundColor: 'rgba(0,0,0,0.18)', marginTop: '17px', marginBottom: '9px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '6px', paddingBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div
                        onClick={() => onToggleFail(activeEx.exercise.id)}
                        style={{
                          cursor: 'pointer', userSelect: 'none',
                          padding: '8px 16px', borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.55)',
                          background: activeEx.fail ? '#1a1a1a' : 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
                          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                          fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em',
                          color: activeEx.fail ? '#ffffff' : 'rgba(0,0,0,0.5)',
                        }}
                      >
                        {activeEx.fail ? 'FAILED' : '+ FAIL'}
                      </div>
                    {!showAdvanced && (
                      <div
                        onClick={() => { if (activeEx.lastSets && activeEx.lastSets.length > 0) onToggleCopyFromLast(activeEx.exercise.id); }}
                        style={{
                          cursor: activeEx.lastSets && activeEx.lastSets.length > 0 ? 'pointer' : 'default',
                          opacity: activeEx.lastSets && activeEx.lastSets.length > 0 ? 0.9 : 0.3,
                          transition: 'opacity 0.2s', display: 'flex', alignItems: 'center',
                        }}
                      >
                        {activeEx.copied ? <X size={20} color="#1a1a1a" strokeWidth={1.5} /> : <Plus size={20} color="#1a1a1a" strokeWidth={1.5} />}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div
                      onClick={() => onAddSet(activeEx.exercise.id)}
                      style={{
                        cursor: 'pointer', userSelect: 'none',
                        padding: '8px 16px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.55)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em',
                        color: 'rgba(0,0,0,0.5)',
                      }}
                    >
                      + SET
                    </div>
                    {!showAdvanced && showDoubleArrow && (
                      <button
                        onClick={() => onNavigate && onNavigate('summary-weights', { addedExercises, todayLoggedTotal, exercisesByGroup })}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        aria-label="Summary"
                      >
                        <DoubleArrowIcon size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: '40px' }}>
            {/* Centered empty state content */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px' }}>
              {exercisesByGroup && Object.keys(exercisesByGroup).length > 0 ? (
                <div ref={randomListRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  {!randomListExpanded && (
                    <button
                      onClick={onApplySavedTemplate}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Plus size={16} color="#ffffff" strokeWidth={2.5} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a', letterSpacing: '0.02em' }}>ADD SAVED LIST</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (randomListExpanded) { onRandomList(); setRandomListExpanded(false); }
                      else setRandomListExpanded(true);
                    }}
                    style={{
                      display: 'flex', flexDirection: randomListExpanded ? 'column' : 'row',
                      alignItems: 'center', gap: randomListExpanded ? '6px' : '8px',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    <div style={{ width: randomListExpanded ? 40 : 32, height: randomListExpanded ? 40 : 32, borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width={randomListExpanded ? 18 : 16} height={randomListExpanded ? 18 : 16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 3 21 3 21 8" />
                        <line x1="4" y1="20" x2="21" y2="3" />
                        <polyline points="21 16 21 21 16 21" />
                        <line x1="15" y1="15" x2="21" y2="21" />
                        <line x1="4" y1="4" x2="9" y2="9" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a', letterSpacing: '0.02em' }}>RANDOM LIST</span>
                  </button>
                  {randomListExpanded && (
                    <div style={{ display: 'flex', gap: '28px', marginTop: '8px', justifyContent: 'center' }}>
                      {['Chest', 'Back'].map(group => (
                        <button
                          key={group}
                          onClick={() => { onRandomList(group); setRandomListExpanded(false); }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <div style={{
                            width: 48, height: 48, borderRadius: '50%', backgroundColor: 'transparent',
                            border: '1px solid rgba(0,0,0,0.12)',
                            background: 'radial-gradient(circle at 30% 30%, rgba(26,26,26,0.12) 0%, rgba(26,26,26,0.05) 30%, transparent 70%)',
                            boxShadow: '0 0 8px rgba(0,0,0,0.06), 0 0 16px rgba(0,0,0,0.04), 0 0 26px rgba(0,0,0,0.02), 4px 6px 20px rgba(0,0,0,0.10), inset 2px 2px 12px rgba(255,255,255,0.25), inset -2px -2px 10px rgba(255,255,255,0.03)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                          }}>
                            <img src={`/icons/${group}.svg`} alt={group} style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#1a1a1a' }}>{group}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: 'rgba(26,26,26,0.35)', letterSpacing: '0.04em' }}>No exercises available</span>
              )}
            </div>

            {/* Double arrow button — only when no exercises added */}
            {!adderOpen && showDoubleArrow && addedExercises.length === 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 0 20px 20px' }}>
                <button
                  onClick={() => onNavigate && onNavigate('summary-weights', { addedExercises, todayLoggedTotal, exercisesByGroup })}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: '4px' }}
                  aria-label="Summary"
                >
                  <DoubleArrowIcon size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {!showDailyTotalOnly && (
        <WeightsBottomBar
          showAdvanced={showAdvanced}
          activeEx={activeEx}
          logConfirm={logConfirm}
          logging={logging}
          showDoubleArrow={showDoubleArrow}
          addedExercises={addedExercises}
          todayLoggedTotal={todayLoggedTotal}
          exercisesByGroup={exercisesByGroup}
          calcExerciseTotal={calcExerciseTotal}
          onToggleCopyFromLast={onToggleCopyFromLast}
          onLoadMaxSession={onLoadMaxSession}
          onRemoveExercise={onRemoveExercise}
          onLogAll={onLogAll}
          onNavigate={onNavigate}
          onShowAdvanced={() => setShowAdvanced(true)}
          setLogConfirmSynced={setLogConfirmSynced}
          setLogging={setLogging}
          bottomRef={bottomRef}
          estTotal={estTotal}
        />
      )}

      <style>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default LogWeightsEntry;