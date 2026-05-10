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
}

const SummaryWeights: React.FC<SummaryWeightsProps> = ({
  onNavigate,
  addedExercises,
  todayLoggedTotal,
  exercisesByGroup,
}) => {  const [loggedExercises, setLoggedExercises] = useState<AddedExercise[]>([]);

  useEffect(() => {
    const fetchLoggedExercises = async () => {
      const today = todayStr();
      const { data: todayData, error } = await supabase
        .from('workouts')
        .select('exercise_id, w1, r1, w2, r2, w3, r3, w4, r4, w5, r5, w6, r6, total_weight')
        .eq('date', today);
      if (error || !todayData) return;

      type WorkoutRow = {
        exercise_id: number;
        w1?: number; r1?: number;
        w2?: number; r2?: number;
        w3?: number; r3?: number;
        w4?: number; r4?: number;
        w5?: number; r5?: number;
        w6?: number; r6?: number;
        total_weight?: number;
      };

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
      for (const row of todayData as WorkoutRow[]) {
        const ex = idToEx.get(row.exercise_id);
        if (!ex) continue;
        const sets: { weight: string; reps: number }[] = [];
        for (let i = 1; i <= 6; i++) {
          const w = row[`w${i}` as keyof WorkoutRow];
          const r = row[`r${i}` as keyof WorkoutRow];
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
      onClose={() => onNavigate('weights', { showEntryCard: true, addedExercises, todayLoggedTotal, exercisesByGroup })}
      todayLoggedTotal={todayLoggedTotal}
      exercisesByGroup={exercisesByGroup}
      showDoubleArrow={false}
      showDailyTotalOnly={true}
    />
  );
};

export default SummaryWeights;
