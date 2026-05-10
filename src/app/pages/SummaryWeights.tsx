import React, { useState, useEffect } from 'react';
import { Page } from '../../types';
import LogWeightsEntry from '../components/LogWeightsEntry';
import { AddedExercise } from '../components/LogWeightsEntry';
import { Exercise, supabase, todayStr } from '../../lib/supabase';

interface SummaryWeightsProps {
  onNavigate: (page: Page, data?: any) => void;
  addedExercises: AddedExercise[];
  todayLoggedTotal: number;
  exercisesByGroup: Record<string, Exercise[]>;
  onUpdateSet: (exerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string | number) => void;
  onAddSet: (exerciseId: number) => void;
  onToggleFail: (exerciseId: number) => void;
  onLoadMaxSession: (exerciseId: number) => void;
  onToggleCopyFromLast: (exerciseId: number) => void;
  onRemoveExercise: (exerciseId: number) => void;
  onAddExercise: (exercise: Exercise) => void;
}

const SummaryWeights: React.FC<SummaryWeightsProps> = ({
  onNavigate,
  addedExercises,
  todayLoggedTotal,
  exercisesByGroup,
  // The following props are intentionally not used in summary mode
  onUpdateSet: _onUpdateSet,
  onAddSet: _onAddSet,
  onToggleFail: _onToggleFail,
  onLoadMaxSession: _onLoadMaxSession,
  onToggleCopyFromLast: _onToggleCopyFromLast,
  onRemoveExercise: _onRemoveExercise,
  onAddExercise: _onAddExercise,
}) => {
  const noop = () => {};

  const [loggedExercises, setLoggedExercises] = useState<AddedExercise[]>([]);

  useEffect(() => {
    const fetchLoggedExercises = async () => {
      const today = todayStr();
      const { data: todayData, error } = await supabase
        .from('workouts')
        .select('exercise_id, w1, r1, w2, r2, w3, r3, w4, r4, w5, r5, w6, r6, total_weight')
        .eq('date', today);
      if (error || !todayData) return;

      // Fetch historical max total per exercise (best before today)
      const { data: historicalData } = await supabase
        .from('workouts')
        .select('exercise_id, total_weight')
        .lt('date', today);
      const histMap = new Map<number, number>();
      if (historicalData) {
        for (const row of historicalData as any[]) {
          const id = row.exercise_id;
          const tot = Number(row.total_weight || 0);
          if (!histMap.has(id) || tot > histMap.get(id)!) {
            histMap.set(id, tot);
          }
        }
      }

      const allEx = Object.values(exercisesByGroup).flat() as Exercise[];
      const idToEx = new Map(allEx.map(ex => [ex.id, ex]));

      const result: AddedExercise[] = [];
      for (const row of todayData) {
        const ex = idToEx.get(row.exercise_id);
        if (!ex) continue;
        const sets: { weight: string; reps: number }[] = [];
        for (let i = 1; i <= 6; i++) {
          const w = (row as any)[`w${i}`];
          const r = (row as any)[`r${i}`];
          if (w != null && Number(w) > 0) {
            sets.push({ weight: String(Number(w)), reps: Number(r) || 10 });
          }
        }
        const total = sets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * s.reps * (ex.multiplier ?? 1), 0);
        result.push({
          exercise: ex,
          sets,
          expanded: false,
          logged: true,
          copied: false,
          loadedMax: false,
          lastSets: null,
          maxSets: null,
          fail: false,
          pbThreshold: histMap.get(row.exercise_id) || 0,
        });
      }
      setLoggedExercises(result);
    };

    if (Object.keys(exercisesByGroup).length > 0) {
      fetchLoggedExercises();
    }
  }, [exercisesByGroup]);

  const displayExercises = [...addedExercises, ...loggedExercises];

  return (
    <LogWeightsEntry
      addedExercises={displayExercises}
      onUpdateSet={noop}
      onAddSet={noop}
      onToggleFail={noop}
      onLoadMaxSession={noop}
      onToggleCopyFromLast={noop}
      onRemoveExercise={noop}
      onClose={() => onNavigate('weights', { showEntryCard: true, addedExercises, todayLoggedTotal, exercisesByGroup })}
      todayLoggedTotal={todayLoggedTotal}
      onAddExercise={noop}
      exercisesByGroup={exercisesByGroup}
      showDoubleArrow={false}
      showDailyTotalOnly={true}
    />
  );
};

export default SummaryWeights;
