import React from 'react';
import { ChevronDown, ChevronLeft, Plus, X } from 'lucide-react';
import { Exercise } from '../../lib/supabase';
import { AddedExercise } from './LogWeightsEntry';

const TYPE2_LABELS: Record<string, string> = {
  'BODY WEIGHT': 'Body Weight',
  'BAR': 'Bar',
  'DUMB BELL': 'Dumbbell',
  'MACHINE': 'Machine',
};

interface ExerciseAdderProps {
  adderGroup: string | null;
  setAdderGroup: (group: string | null) => void;
  exercisesByGroup: Record<string, Exercise[]>;
  addedExercises: AddedExercise[];
  onAddExercise: (exercise: Exercise) => void;
}

export const ExerciseAdder: React.FC<ExerciseAdderProps> = ({
  adderGroup,
  setAdderGroup,
  exercisesByGroup,
  addedExercises,
  onAddExercise,
}) => {
  return (
    <div style={{ padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          backgroundColor: '#f2f2f2',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          fontFamily: "'Archivo', sans-serif",
          marginBottom: '12px',
        }}
      >
        {!adderGroup ? (
          ['Chest', 'Back', 'Legs'].map((group) => (
            <div
              key={group}
              onClick={() => setAdderGroup(group)}
              style={{
                padding: '12px 14px', cursor: 'pointer',
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
                color: '#1a1a1a', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
              role="button"
              tabIndex={0}
            >
              {group.toUpperCase()}
              <ChevronDown size={12} style={{ transform: 'rotate(-90deg)', color: 'rgba(0,0,0,0.25)' }} />
            </div>
          ))
        ) : (
          <div>
            <div
              onClick={() => setAdderGroup(null)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em',
                color: '#999', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: 'rgba(0,0,0,0.04)',
              }}
              role="button"
              tabIndex={0}
            >
              <ChevronLeft size={12} /> {adderGroup}
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {(exercisesByGroup[adderGroup] || []).map((ex, _ei, arr) => {
                const alreadyAdded = !!addedExercises.find(e => e.exercise.id === ex.id);
                const t2 = ex.type2 ?? '';
                const prevT2 = _ei > 0 ? arr[_ei - 1].type2 ?? '' : '';
                const showHeader = t2 !== '' && t2 !== prevT2;
                return (
                  <React.Fragment key={ex.id}>
                    {showHeader && (
                      <div style={{ borderTop: _ei > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none', padding: '10px 14px 4px 14px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.5)' }}>
                          {TYPE2_LABELS[t2] || t2}
                        </span>
                      </div>
                    )}
                    <div
                      onClick={() => onAddExercise(ex)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: alreadyAdded ? 'rgba(0,0,0,0.3)' : '#1a1a1a' }}>
                          {ex.exercise_name.charAt(0).toUpperCase() + ex.exercise_name.slice(1).toLowerCase()}
                        </span>
                        {ex.info_notes && (
                          <span style={{ fontSize: '9px', color: 'rgba(0,0,0,0.3)', display: 'block', marginTop: '1px' }}>
                            {ex.info_notes}
                          </span>
                        )}
                      </div>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        backgroundColor: alreadyAdded ? 'rgba(0,0,0,0.15)' : '#1a1a1a',
                        color: alreadyAdded ? '#666' : '#ffffff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {alreadyAdded ? <X size={11} strokeWidth={3} /> : <Plus size={11} strokeWidth={3} />}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
