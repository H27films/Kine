import React, { useState } from 'react';
import { Minus } from 'lucide-react';
import { DoubleArrowIcon } from '../components/DoubleArrowIcon';
import { AddedExercise } from './LogWeightsEntry';
import { Page } from '../../types';

interface WeightsBottomBarProps {
  showAdvanced: boolean;
  activeEx: AddedExercise | null;
  logConfirm: boolean;
  logging: boolean;
  showDoubleArrow: boolean;
  addedExercises: AddedExercise[];
  todayLoggedTotal: number;
  exercisesByGroup: Record<string, any>;
  calcExerciseTotal: (sets: any[], multiplier?: number) => number;
  onToggleCopyFromLast: (exerciseId: number) => void;
  onLoadMaxSession: (exerciseId: number) => void;
  onRemoveExercise: (exerciseId: number) => void;
  onLogAll: () => void;
  onNavigate?: (page: Page, data?: any) => void;
  onShowAdvanced: () => void;
  setLogConfirmSynced: (val: boolean) => void;
  setLogging: (val: boolean) => void;
  bottomRef: React.RefObject<HTMLDivElement>;
  estTotal: number | null;
}

export const WeightsBottomBar: React.FC<WeightsBottomBarProps> = ({
  showAdvanced,
  activeEx,
  logConfirm,
  logging,
  showDoubleArrow,
  addedExercises,
  todayLoggedTotal,
  exercisesByGroup,
  calcExerciseTotal,
  onToggleCopyFromLast,
  onLoadMaxSession,
  onRemoveExercise,
  onLogAll,
  onNavigate,
  onShowAdvanced,
  setLogConfirmSynced,
  setLogging,
  bottomRef,
  estTotal,
}) => {
  const [showEst, setShowEst] = useState(false);

  if (showAdvanced && activeEx) {
    return (
      <div
        ref={bottomRef}
        style={{
          padding: '12px 20px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', gap: '8px', flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => onToggleCopyFromLast(activeEx.exercise.id)}
          disabled={!activeEx.lastSets || activeEx.lastSets.length === 0}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.55)',
            background: activeEx.copied ? undefined : 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
            backgroundColor: activeEx.copied ? 'rgba(0,0,0,0.06)' : undefined,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            cursor: activeEx.lastSets && activeEx.lastSets.length > 0 ? 'pointer' : 'default',
            color: activeEx.copied ? '#1a1a1a' : 'rgba(0,0,0,0.5)',
            fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em',
            opacity: activeEx.lastSets && activeEx.lastSets.length > 0 ? 1 : 0.4,
          }}
        >
          {activeEx.copied ? 'REVERT' : 'LAST'}
        </button>

        <button
          onClick={() => onLoadMaxSession(activeEx.exercise.id)}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.55)',
            background: activeEx.loadedMax ? undefined : 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
            backgroundColor: activeEx.loadedMax ? 'rgba(0,0,0,0.06)' : undefined,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            cursor: 'pointer',
            color: activeEx.loadedMax ? '#1a1a1a' : 'rgba(0,0,0,0.5)',
            fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em',
          }}
        >
          {activeEx.loadedMax ? 'DEFAULT' : 'MAX'}
        </button>

        <button
          onClick={() => onRemoveExercise(activeEx.exercise.id)}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.55)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            cursor: 'pointer', color: 'rgba(0,0,0,0.5)',
            fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          <Minus size={12} /> EXE
        </button>

        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={async () => {
            if (!logConfirm) {
              setLogConfirmSynced(true);
            } else {
              setLogging(true);
              try {
                await onLogAll();
              } finally {
                setLogging(false);
                setLogConfirmSynced(false);
              }
            }
          }}
          disabled={logging}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid rgba(0,0,0,0.3)',
            backgroundColor: logConfirm ? '#ffffff' : '#000000',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            cursor: logging ? 'default' : 'pointer',
            color: logConfirm ? '#000000' : '#ffffff',
            fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em',
            opacity: logging ? 0.7 : 1,
          }}
        >
          {logging ? 'LOGGING...' : logConfirm ? 'CONFIRM' : 'LOG'}
        </button>

        {showDoubleArrow && (
          <button
            onClick={() => onNavigate && onNavigate('summary-weights', { addedExercises, todayLoggedTotal, exercisesByGroup })}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            aria-label="Summary"
          >
            <DoubleArrowIcon size={18} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '10px 20px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}
    >
      <span
        onClick={onShowAdvanced}
        style={{ color: '#1a1a1a', fontSize: '12px', fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer' }}
      >/ ADVANCED</span>
      <div
        onClick={() => setShowEst(v => !v)}
        style={{ display: 'flex', alignItems: 'baseline', gap: '4px', cursor: 'pointer' }}
      >
        {showEst && (
  <span style={{ fontSize: '15px', fontWeight: 350, color: 'rgba(26,26,26,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '4px' }}>
    EST.
  </span>
)}
<span style={{ fontSize: '18px', fontWeight: 350, letterSpacing: '-0.02em', color: showEst ? 'rgba(26,26,26,0.65)' : '#1a1a1a', lineHeight: 1 }}>
  {showEst
    ? (estTotal ?? 0).toLocaleString()
    : addedExercises.reduce((acc, ex) => acc + calcExerciseTotal(ex.sets, ex.exercise.multiplier ?? 1), 0).toLocaleString()
  }
</span>
        <span style={{ fontSize: '10px', fontWeight: 400, color: 'rgba(26,26,26,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KG</span>
      </div>
    </div>
  );
};