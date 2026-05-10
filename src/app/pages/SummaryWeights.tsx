import React from 'react';
import { Page } from '../../types';
import LogWeightsEntry from '../components/LogWeightsEntry';
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

  return (
    <LogWeightsEntry
      addedExercises={addedExercises}
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
