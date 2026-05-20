import React from 'react';
import { AddedExercise, SetRow } from './LogWeightsEntry';

interface SummaryExerciseListProps {
  addedExercises: AddedExercise[];
  calcExerciseTotal: (sets: SetRow[], multiplier?: number) => number;
}

export const SummaryExerciseList: React.FC<SummaryExerciseListProps> = ({
  addedExercises,
  calcExerciseTotal,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {addedExercises.map((ex, idx) => {
        const mult = ex.exercise.multiplier ?? 1;
        const total = calcExerciseTotal(ex.sets, mult);
        const setsDone = ex.sets.filter(s => s.weight !== '').length;
        let lastW = 0, lastR = 0;
        for (let i = ex.sets.length - 1; i >= 0; i--) {
          const w = parseFloat(ex.sets[i].weight) || 0;
          if (w > 0) { lastW = w; lastR = ex.sets[i].reps; break; }
        }
        const isLast = idx === addedExercises.length - 1;

        let lastDisplay: React.ReactNode;
        if (lastW > 0) {
          lastDisplay = (
            <>
              <span style={{ fontSize: '16px', fontWeight: 300, letterSpacing: '-0.01em', color: '#1a1a1a' }}>{lastW.toLocaleString()}</span>
              <span style={{ fontSize: '9px', fontWeight: 400, color: 'rgba(26,26,26,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KG x</span>
              <span style={{ fontSize: '16px', fontWeight: 300, letterSpacing: '-0.01em', color: '#1a1a1a' }}>{lastR}</span>
              <span style={{ fontSize: '9px', fontWeight: 400, color: 'rgba(26,26,26,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>REPS</span>
            </>
          );
        } else {
          lastDisplay = <span style={{ fontSize: '16px', fontWeight: 300, letterSpacing: '-0.01em', color: '#1a1a1a' }}>—</span>;
        }

        return (
          <div key={ex.exercise.id} style={{ padding: '16px 0', borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '12px', fontWeight: 400, color: '#1a1a1a', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                {ex.exercise.exercise_name.toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                {!ex.logged && total > 0 ? (
                  <div style={{ padding: '4px 12px', borderRadius: '999px', background: 'linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.95) 100%)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', color: '#1a1a1a', boxShadow: '0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
                    NOT LOGGED
                  </div>
                ) : total > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 300, letterSpacing: '-0.01em', color: '#1a1a1a' }}>{total.toLocaleString()}</span>
                    <span style={{ fontSize: '9px', fontWeight: 400, color: 'rgba(26,26,26,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KG</span>
                  </div>
                ) : (
                  <div style={{ padding: '4px 12px', borderRadius: '999px', background: 'linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.95) 100%)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', color: '#1a1a1a', boxShadow: '0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
                    NO DATA
                  </div>
                )}
              </div>
            </div>

            {total > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', fontWeight: 300, letterSpacing: '-0.01em', color: '#1a1a1a' }}>{setsDone}</span>
                  <div style={{ fontSize: '9px', fontWeight: 300, color: 'rgba(26,26,26,0.6)', letterSpacing: '0.04em' }}>SETS</div>
                </div>
                <div style={{ width: '20px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>{lastDisplay}</div>
                  <div style={{ fontSize: '9px', fontWeight: 300, color: 'rgba(26,26,26,0.6)', letterSpacing: '0.04em' }}>LAST</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  {!ex.logged ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 300, letterSpacing: '-0.01em', color: '#1a1a1a' }}>{total.toLocaleString()}</span>
                      <span style={{ fontSize: '9px', fontWeight: 400, color: 'rgba(26,26,26,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KG</span>
                    </div>
                  ) : total > 0 && ex.pbThreshold > 0 && total > ex.pbThreshold && (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>PB</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {total === 0 && ex.lastSets && ex.lastSets.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '2.5px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', fontWeight: 300, letterSpacing: '-0.01em', color: '#94A3B8' }}>{calcExerciseTotal(ex.lastSets, mult).toLocaleString()}</span>
                  <div style={{ fontSize: '9px', fontWeight: 300, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.04em' }}>EST. KG</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
