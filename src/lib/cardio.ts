export const TRACKER_ID = 82;
export const ROW_ID = 83;
export const RUNNING_ID = 84;
export const WALKING_ID = 85;
export const CROSS_ID = 86;
export const CYCLE_ID = 87;

export const TOTAL_CARDIO_IDS = [TRACKER_ID, ROW_ID, CYCLE_ID] as const;
export const NO_TRACKER_CARDIO_IDS = [ROW_ID, RUNNING_ID, WALKING_ID, CROSS_ID, CYCLE_ID] as const;
export const ALL_CARDIO_IDS = [TRACKER_ID, ROW_ID, RUNNING_ID, WALKING_ID, CROSS_ID, CYCLE_ID] as const;

/**
 * Calculate Movement = TOTAL_CARDIO total_cardio (Tracker + Row + Cycle)
 * minus individual total_cardio from Row, Running, Walking, Cross Trainer, Cycle.
 *
 * Since Row and Cycle appear in both sets, this simplifies to:
 * Movement = Tracker.total_cardio - Running.total_cardio - Walking.total_cardio - Cross Trainer.total_cardio
 */
export function calcMovement(
  rows: { exercise_id: number; total_cardio: number }[]
): number {
  const totalCardioSum = rows
    .filter(r => TOTAL_CARDIO_IDS.includes(r.exercise_id as typeof TOTAL_CARDIO_IDS[number]))
    .reduce((s, r) => s + r.total_cardio, 0);

  const individualSum = rows
    .filter(r => NO_TRACKER_CARDIO_IDS.includes(r.exercise_id as typeof NO_TRACKER_CARDIO_IDS[number]))
    .reduce((s, r) => s + r.total_cardio, 0);

  return Math.max(0, totalCardioSum - individualSum);
}