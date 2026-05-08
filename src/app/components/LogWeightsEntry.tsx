import React, { useState } from 'react';
import { ArrowLeft, Plus, Minus, Check } from 'lucide-react';
import { Exercise } from '../../lib/supabase';

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

interface LogWeightsEntryProps {
  addedExercises: AddedExercise[];
  onUpdateSet: (exerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string | number) => void;
  onAddSet: (exerciseId: number) => void;
  onToggleFail: (exerciseId: number) => void;
  onLoadMaxSession: (exerciseId: number) => void;
  onToggleCopyFromLast: (exerciseId: number) => void;
  onClose: () => void;
}

const TYPE2_ORDER: Record<string, number> = {
  'BODY WEIGHT': 0,
  'BAR': 1,
  'DUMB BELL': 2,
  'MACHINE': 3,
};

const LogWeightsEntry: React.FC<LogWeightsEntryProps> = ({
  addedExercises,
  onUpdateSet,
  onAddSet,
  onToggleFail,
  onLoadMaxSession,
  onToggleCopyFromLast,
  onClose,
}) => {
  const [activeExIndex, setActiveExIndex] = useState(0);
  const safeIndex = Math.min(activeExIndex, addedExercises.length - 1);
  const activeEx = addedExercises[safeIndex];

  if (addedExercises.length === 0) return null;

  const calcExerciseTotal = (sets: SetRow[], multiplier: number = 1): number =>
    sets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * s.reps * multiplier, 0);

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
        fontFamily: "'JetBrains Mono', monospace",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header row: back arrow + KINÉ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 20px 10px',
          paddingTop: 'calc(18px + env(safe-area-inset-top))',
        }}
      >
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1a1a1a' }}
        >
          <ArrowLeft size={26} strokeWidth={1.8} />
        </button>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 530,
            fontFamily: "'Archivo', sans-serif",
            fontStretch: '200%',
            letterSpacing: '0.8em',
            color: '#1a1a1a',
            textTransform: 'uppercase',
            opacity: 0.7,
          }}
        >
          KINÉ
        </span>
      </div>

      {/* Exercise tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 20px 12px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {addedExercises.map((ex, i) => {
          const isActive = i === safeIndex;
          const hasData = ex.sets.some(s => s.weight !== '');
          return (
            <button
              key={ex.exercise.id}
              onClick={() => setActiveExIndex(i)}
              style={{
                padding: '10px 18px',
                borderRadius: '999px',
                border: isActive ? 'none' : '1px solid rgba(0,0,0,0.10)',
                backgroundColor: isActive ? '#1a1a1a' : 'transparent',
                color: isActive ? '#ffffff' : '#1a1a1a',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{ex.exercise.exercise_name.charAt(0).toUpperCase() + ex.exercise.exercise_name.slice(1).toLowerCase()}</span>
              {hasData && <Check size={12} strokeWidth={3} color={isActive ? '#ffffff' : '#22c55e'} />}
            </button>
          );
        })}
      </div>

      {/* Scrollable set rows area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {activeEx.sets.map((set, idx) => {
          const w = parseFloat(set.weight) || 0;
          const rowTotal = w * set.reps * mult;
          const hasData = set.weight !== '';
          return (
            <div key={idx} style={{ marginBottom: '18px' }}>
              {/* SET label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                }}
              >
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#1a1a1a',
                  }}
                >
                  SET {idx + 1}
                </span>
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    color: '#1a1a1a',
                    lineHeight: 1,
                  }}
                >
                  {rowTotal > 0 ? rowTotal.toLocaleString() : '—'}
                </span>
              </div>

              {/* Weight row */}
              <div style={{ marginBottom: '14px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'rgba(0,0,0,0.45)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    display: 'block',
                  }}
                >
                  Weight (kg)
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.07)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => {
                      const cur = parseFloat(set.weight) || 0;
                      const next = Math.max(0, Math.round((cur - 1) * 10) / 10);
                      onUpdateSet(activeEx.exercise.id, idx, 'weight', next === 0 ? '' : String(next));
                    }}
                    style={{
                      padding: '14px 16px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(0,0,0,0.35)',
                      fontSize: '18px',
                      fontWeight: 300,
                      lineHeight: 1,
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={set.weight}
                    placeholder="—"
                    onChange={e => onUpdateSet(activeEx.exercise.id, idx, 'weight', e.target.value)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      textAlign: 'center',
                      fontSize: '24px',
                      fontWeight: 600,
                      color: hasData ? '#1a1a1a' : 'rgba(0,0,0,0.25)',
                      padding: '12px 4px',
                      MozAppearance: 'textfield',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                  <button
                    onClick={() => {
                      const cur = parseFloat(set.weight) || 0;
                      const next = Math.round((cur + 1) * 10) / 10;
                      onUpdateSet(activeEx.exercise.id, idx, 'weight', String(next));
                    }}
                    style={{
                      padding: '14px 16px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(0,0,0,0.35)',
                      fontSize: '18px',
                      fontWeight: 300,
                      lineHeight: 1,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Reps row */}
              <div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'rgba(0,0,0,0.45)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    display: 'block',
                  }}
                >
                  Reps
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.07)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => onUpdateSet(activeEx.exercise.id, idx, 'reps', Math.max(1, set.reps - 1))}
                    style={{
                      padding: '14px 16px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(0,0,0,0.35)',
                      fontSize: '18px',
                      fontWeight: 300,
                      lineHeight: 1,
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 1;
                      onUpdateSet(activeEx.exercise.id, idx, 'reps', Math.max(1, val));
                    }}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      textAlign: 'center',
                      fontSize: '24px',
                      fontWeight: 600,
                      color: '#1a1a1a',
                      padding: '12px 4px',
                      MozAppearance: 'textfield',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                  <button
                    onClick={() => onUpdateSet(activeEx.exercise.id, idx, 'reps', set.reps + 1)}
                    style={{
                      padding: '14px 16px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(0,0,0,0.35)',
                      fontSize: '18px',
                      fontWeight: 300,
                      lineHeight: 1,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar: add set + actions */}
      <div
        style={{
          padding: '12px 20px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Add set button */}
        {activeEx.sets.length < 6 && (
          <button
            onClick={() => onAddSet(activeEx.exercise.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '10px',
              border: '1px dashed rgba(0,0,0,0.15)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: '#1a1a1a',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Plus size={14} />
            Add Set
          </button>
        )}

        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Copy from last */}
          <button
            onClick={() => onToggleCopyFromLast(activeEx.exercise.id)}
            disabled={!activeEx.lastSets || activeEx.lastSets.length === 0}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.10)',
              backgroundColor: activeEx.copied ? 'rgba(0,0,0,0.06)' : 'transparent',
              cursor: activeEx.lastSets && activeEx.lastSets.length > 0 ? 'pointer' : 'default',
              color: activeEx.copied ? '#1a1a1a' : 'rgba(0,0,0,0.5)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              opacity: activeEx.lastSets && activeEx.lastSets.length > 0 ? 1 : 0.4,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {activeEx.copied ? 'REVERT' : 'COPY LAST'}
          </button>

          {/* Max */}
          <button
            onClick={() => onLoadMaxSession(activeEx.exercise.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.10)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'rgba(0,0,0,0.5)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            MAX
          </button>

          {/* Fail */}
          <button
            onClick={() => onToggleFail(activeEx.exercise.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: activeEx.fail ? '1px solid rgba(255,80,80,0.5)' : '1px solid rgba(0,0,0,0.10)',
              backgroundColor: activeEx.fail ? 'rgba(255,80,80,0.08)' : 'transparent',
              cursor: 'pointer',
              color: activeEx.fail ? '#ff5050' : 'rgba(0,0,0,0.5)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            FAIL
          </button>

          {/* PB badge if applicable */}
          {exTotal > 0 && activeEx.pbThreshold > 0 && exTotal > activeEx.pbThreshold && (
            <div
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#1a1a1a',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              PB
            </div>
          )}
        </div>
      </div>

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