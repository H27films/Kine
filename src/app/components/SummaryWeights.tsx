import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Minus, Check, X, ChevronDown, ChevronLeft } from 'lucide-react';
import { Exercise } from '../../lib/supabase';
import { DoubleArrowIcon } from '../components/DoubleArrowIcon';

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
  loadedMax: boolean;
  lastSets: SetRow[] | null;
  maxSets: SetRow[] | null;
  fail: boolean;
  pbThreshold: number;
}

interface SummaryWeightsProps {
  addedExercises: AddedExercise[];
  onUpdateSet: (exerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string | number) => void;
  onAddSet: (exerciseId: number) => void;
  onToggleFail: (exerciseId: number) => void;
  onLoadMaxSession: (exerciseId: number) => void;
  onToggleCopyFromLast: (exerciseId: number) => void;
  onRemoveExercise: (exerciseId: number) => void;
  onClose: () => void;
  todayLoggedTotal: number;
  onAddExercise: (exercise: Exercise) => void;
  exercisesByGroup: Record<string, Exercise[]>;
}

const TYPE2_LABELS: Record<string, string> = {
  'BODY WEIGHT': 'Body Weight',
  'BAR': 'Bar',
  'DUMB BELL': 'Dumbbell',
  'MACHINE': 'Machine',
};

const makeDefaultSets = (): SetRow[] =>
  Array.from({ length: 4 }, () => ({ weight: '', reps: 10 }));

export const SummaryWeights: React.FC<SummaryWeightsProps> = ({
  addedExercises,
  onUpdateSet,
  onAddSet,
  onToggleFail,
  onLoadMaxSession,
  onToggleCopyFromLast,
  onRemoveExercise,
  onClose,
  todayLoggedTotal,
  onAddExercise,
  exercisesByGroup,
}) => {
  const [activeExIndex, setActiveExIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTodayTotal, setShowTodayTotal] = useState(false);
  const [adderOpen, setAdderOpen] = useState(false);
  const [adderGroup, setAdderGroup] = useState<string | null>(null);
  const adderRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const safeIndex = Math.min(activeExIndex, addedExercises.length - 1);
  const activeEx = addedExercises[safeIndex];
  const orderedExercises = addedExercises.length > 1
    ? [...addedExercises.slice(safeIndex), ...addedExercises.slice(0, safeIndex)]
    : addedExercises;

  const isAdderActive = adderOpen;
  const showingAdder = isAdderActive;
  const effectiveIndex = showingAdder ? -1 : safeIndex;
  const effectiveActiveEx = showingAdder ? null : activeEx;

  if (addedExercises.length === 0) return null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bottomRef.current && !bottomRef.current.contains(e.target as Node)) {
        setShowAdvanced(false);
      }
      if (adderRef.current && !adderRef.current.contains(e.target as Node)) {
        setAdderOpen(false);
        setAdderGroup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollLeft = 0;
    }
  }, [activeExIndex, adderOpen]);

  const calcExerciseTotal = (sets: SetRow[], multiplier: number = 1): number =>
    sets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * s.reps * multiplier, 0);

  const pendingTotal = addedExercises.reduce((acc, ex) => acc + calcExerciseTotal(ex.sets, ex.exercise.multiplier ?? 1), 0);
  const todayTotalSum = todayLoggedTotal + pendingTotal;

  const mult = activeEx.exercise.multiplier ?? 1;
  const exTotal = calcExerciseTotal(activeEx.sets, mult);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#f2f2f2',
        color: '#1a1a1a',
        fontFamily: "'Archivo', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header row: grand total (left) + progress bar + back arrow (right) */}
        <div
          onClick={() => setShowTodayTotal(!showTodayTotal)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px 10px',
            paddingTop: 'calc(18px + env(safe-area-inset-top))',
            cursor: 'pointer',
          }}
        >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, marginRight: '20px' }}>
          {showTodayTotal ? (
            <>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 350,
                  letterSpacing: '-0.02em',
                  color: '#1a1a1a',
                  lineHeight: 1,
                }}
              >
                /
              </span>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 350,
                  letterSpacing: '-0.02em',
                  color: '#1a1a1a',
                  lineHeight: 1,
                }}
              >
                {todayTotalSum.toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 400,
                  color: 'rgba(26,26,26,0.45)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                KG
              </span>
              {/* Progress bar */}
              <div style={{ height: '12px', flex: 1, backgroundColor: 'rgba(26,26,26,0.1)', borderRadius: '999px', overflow: 'hidden', padding: '2px' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min((todayTotalSum / 20000) * 100, 100)}%`,
                background: 'linear-gradient(to right, rgba(26,26,26,0.6), #1a1a1a)',
                borderRadius: '999px',
                transition: 'width 0.3s ease',
              }}
            />
              </div>
            </>
          ) : (
            <>
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: 350,
                  letterSpacing: '-0.02em',
                  color: '#1a1a1a',
                  lineHeight: 1,
                }}
              >
                {exTotal > 0 ? exTotal.toLocaleString() : '0'}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 400,
                  color: 'rgba(26,26,26,0.45)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                KG
              </span>
              {exTotal > 0 && activeEx.pbThreshold > 0 && exTotal > activeEx.pbThreshold && (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginLeft: '4px',
                  }}
                >
                  <span style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>PB</span>
                </div>
              )}
            </>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1a1a1a' }}
        >
          <ArrowLeft size={26} strokeWidth={1.8} />
        </button>
      </div>

      {/* Exercise tabs — text only, no boxes */}
      <div
        ref={tabScrollRef}
        style={{
          display: 'flex',
          gap: '18px',
          padding: '6px 20px 12px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          alignItems: 'baseline',
        }}
      >
        {orderedExercises.map((ex, i) => {
          const isActive = i === 0;
          const hasData = ex.sets.some(s => s.weight !== '');
          return (
            <button
              key={ex.exercise.id}
              onClick={() => {
                const idxInOriginal = addedExercises.findIndex(e => e.exercise.id === ex.exercise.id);
                setActiveExIndex(idxInOriginal);
              }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive
                  ? '1.5px solid #333333'
                  : hasData
                    ? '1px solid rgba(26,26,26,0.12)'
                    : 'none',
                padding: '4px 0',
                cursor: 'pointer',
                flexShrink: 0,
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
      </div>

      {/* Scrollable set rows area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 20px',
      }}>
        {activeEx.sets.map((set, idx) => {
          const showSeparator = idx > 0;
          const w = parseFloat(set.weight) || 0;
          const rowTotal = w * set.reps * mult;
          const hasData = set.weight !== '';
          return (
            <div key={idx}>
              {showSeparator && (
                <div style={{ height: '0.5px', backgroundColor: 'rgba(0,0,0,0.18)', marginTop: '17px', marginBottom: '9px' }} />
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flexShrink: 0, marginRight: '16px' }}>
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: 330,
                      letterSpacing: '-0.01em',
                      color: '#333333',
                      lineHeight: 1,
                      marginRight: '4px',
                    }}
                  >
                    SET
                  </span>
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: 400,
                      letterSpacing: '0.05em',
                      color: '#000000',
                      lineHeight: 1,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div style={{ marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                     <span
                       style={{
                         fontSize: '22px',
                         fontWeight: 300,
                         letterSpacing: '-0.01em',
                         color: '#1a1a1a',
                         lineHeight: 1,
                       }}
                     >
                       {rowTotal > 0 ? rowTotal.toLocaleString() : ''}
                     </span>
                     {rowTotal > 0 && (
                       <span
                         style={{
                           fontSize: '9px',
                           fontWeight: 400,
                           color: 'rgba(26,26,26,0.4)',
                           letterSpacing: '0.04em',
                         }}
                       >
                         KG
                       </span>
                     )}
                   </div>
                </div>

                <div style={{ flex: 1, maxWidth: '220px' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '2px', lineHeight: '18px' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 400,
                          color: 'rgba(0,0,0,0.45)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        WEIGHT
                      </span>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 400,
                          color: 'rgba(0,0,0,0.45)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        REPS
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'row',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        height: 48,
                        pointerEvents: 'none',
                      }}
                    >
                      <div style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.25)', fontSize: '15px', fontWeight: 300, flexShrink: 0 }}>
                        −
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={set.weight}
                        placeholder="—"
                        readOnly
                        style={{
                          flex: 1,
                          minWidth: 0,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          textAlign: 'center',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: hasData ? '#1a1a1a' : 'rgba(0,0,0,0.25)',
                          height: 48,
                          padding: 0,
                          MozAppearance: 'textfield',
                          pointerEvents: 'none',
                        }}
                      />
                      <div style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.25)', fontSize: '15px', fontWeight: 300, flexShrink: 0 }}>
                        +
                      </div>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'row',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        height: 48,
                        pointerEvents: 'none',
                      }}
                    >
                      <div style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.25)', fontSize: '15px', fontWeight: 300, flexShrink: 0 }}>
                        −
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={set.reps}
                        readOnly
                        style={{
                          flex: 1,
                          minWidth: 0,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          textAlign: 'center',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#1a1a1a',
                          height: 48,
                          padding: 0,
                          MozAppearance: 'textfield',
                          pointerEvents: 'none',
                        }}
                      />
                      <div style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.25)', fontSize: '15px', fontWeight: 300, flexShrink: 0 }}>
                        +
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom area */}
      {showAdvanced ? (
        <div
          ref={bottomRef}
          style={{
            padding: '12px 20px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => onToggleCopyFromLast(activeEx.exercise.id)}
            disabled={!activeEx.lastSets || activeEx.lastSets.length === 0}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.55)',
              background: activeEx.copied ? undefined : 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
              backgroundColor: activeEx.copied ? 'rgba(0,0,0,0.06)' : undefined,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              cursor: activeEx.lastSets && activeEx.lastSets.length > 0 ? 'pointer' : 'default',
              color: activeEx.copied ? '#1a1a1a' : 'rgba(0,0,0,0.5)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              opacity: activeEx.lastSets && activeEx.lastSets.length > 0 ? 1 : 0.4,
            }}
          >
            {activeEx.copied ? 'REVERT' : 'LAST'}
          </button>

          <button
            onClick={() => onLoadMaxSession(activeEx.exercise.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.55)',
              background: activeEx.loadedMax ? undefined : 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
              backgroundColor: activeEx.loadedMax ? 'rgba(0,0,0,0.06)' : undefined,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              cursor: 'pointer',
              color: activeEx.loadedMax ? '#1a1a1a' : 'rgba(0,0,0,0.5)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.04em',
            }}
          >
            {activeEx.loadedMax ? 'DEFAULT' : 'MAX'}
          </button>

          <button
            onClick={() => onRemoveExercise(activeEx.exercise.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.55)',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              cursor: 'pointer',
              color: 'rgba(0,0,0,0.5)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Minus size={12} /> EXE
          </button>
        </div>
      ) : (
        <div
          onClick={() => setShowAdvanced(true)}
          style={{
            padding: '10px 20px',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              color: '#1a1a1a',
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.04em',
            }}
          >
            / ADVANCED
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 350,
                letterSpacing: '-0.02em',
                color: '#1a1a1a',
                lineHeight: 1,
              }}
            >
              {addedExercises.reduce((acc, ex) => acc + calcExerciseTotal(ex.sets, ex.exercise.multiplier ?? 1), 0).toLocaleString()}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 400,
                color: 'rgba(26,26,26,0.45)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              KG
            </span>
          </div>
        </div>
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

export default SummaryWeights;
