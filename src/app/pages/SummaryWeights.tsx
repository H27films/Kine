import React from 'react';
import { Page } from '../types';
import { LogWeightsEntry } from '../components/LogWeightsEntry';
import { AddedExercise } from '../components/LogWeightsEntry';
import { Exercise } from '../../lib/supabase';

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
}) => {
  const noop = () => {};

  return (
    <LogWeightsEntry
      addedExercises={addedExercises}
      onUpdateSet={noop}
      onAddSet={noop}
      onToggleFail={noop}
      onLoadMaxSession={noop}
      onToggleCopyFromLast={noop}
      onRemoveExercise={noop}
      onClose={() => onNavigate('weights')}
      todayLoggedTotal={todayLoggedTotal}
      onAddExercise={noop}
      exercisesByGroup={exercisesByGroup}
      showDoubleArrow={false}
    />
  );
};

export default SummaryWeights;
