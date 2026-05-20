import React from 'react';
import { SetRow } from './LogWeightsEntry';

interface SetInputRowProps {
  set: SetRow;
  idx: number;
  mult: number;
  exerciseId: number;
  onUpdateSet: (exerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string | number) => void;
}

export const SetInputRow: React.FC<SetInputRowProps> = ({
  set,
  idx,
  mult,
  exerciseId,
  onUpdateSet,
}) => {
  const w = parseFloat(set.weight) || 0;
  const rowTotal = w * set.reps * mult;
  const hasData = set.weight !== '';
  const showSeparator = idx > 0;

  return (
    <div>
      {showSeparator && (
        <div style={{ height: '0.5px', backgroundColor: 'rgba(0,0,0,0.18)', marginTop: '17px', marginBottom: '9px' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flexShrink: 0, marginRight: '16px' }}>
          <span style={{ fontSize: '18px', fontWeight: 330, letterSpacing: '-0.01em', color: '#333333', lineHeight: 1, marginRight: '4px' }}>SET</span>
          <span style={{ fontSize: '18px', fontWeight: 400, letterSpacing: '0.05em', color: '#000000', lineHeight: 1 }}>{idx + 1}</span>
          <div style={{ marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '3px' }}>
            <span style={{ fontSize: '22px', fontWeight: 300, letterSpacing: '-0.01em', color: '#1a1a1a', lineHeight: 1 }}>
              {rowTotal > 0 ? rowTotal.toLocaleString() : ''}
            </span>
            {rowTotal > 0 && (
              <span style={{ fontSize: '9px', fontWeight: 400, color: 'rgba(26,26,26,0.4)', letterSpacing: '0.04em' }}>KG</span>
            )}
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: '220px' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '2px', lineHeight: '18px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 400, color: 'rgba(0,0,0,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>WEIGHT</span>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 400, color: 'rgba(0,0,0,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>REPS</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {/* Weight input */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.04)', overflow: 'hidden', height: 48 }}>
              <div
                onClick={() => {
                  const cur = parseFloat(set.weight) || 0;
                  const next = Math.max(0, Math.round((cur - 1) * 10) / 10);
                  onUpdateSet(exerciseId, idx, 'weight', next === 0 ? '' : String(next));
                }}
                style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.35)', fontSize: '15px', fontWeight: 300, flexShrink: 0 }}
              >−</div>
              <input
                type="number" inputMode="decimal" value={set.weight} placeholder="—"
                onChange={e => onUpdateSet(exerciseId, idx, 'weight', e.target.value)}
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: hasData ? '#1a1a1a' : 'rgba(0,0,0,0.25)', height: 48, padding: 0, MozAppearance: 'textfield' }}
              />
              <div
                onClick={() => {
                  const cur = parseFloat(set.weight) || 0;
                  const next = Math.round((cur + 1) * 10) / 10;
                  onUpdateSet(exerciseId, idx, 'weight', String(next));
                }}
                style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.35)', fontSize: '15px', fontWeight: 300, flexShrink: 0 }}
              >+</div>
            </div>
            {/* Reps input */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.04)', overflow: 'hidden', height: 48 }}>
              <div
                onClick={() => onUpdateSet(exerciseId, idx, 'reps', Math.max(1, set.reps - 1))}
                style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.35)', fontSize: '15px', fontWeight: 300, flexShrink: 0 }}
              >−</div>
              <input
                type="number" inputMode="numeric" value={set.reps}
                onChange={e => { const val = parseInt(e.target.value) || 1; onUpdateSet(exerciseId, idx, 'reps', Math.max(1, val)); }}
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: '#1a1a1a', height: 48, padding: 0, MozAppearance: 'textfield' }}
              />
              <div
                onClick={() => onUpdateSet(exerciseId, idx, 'reps', set.reps + 1)}
                style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.35)', fontSize: '15px', fontWeight: 300, flexShrink: 0 }}
              >+</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
