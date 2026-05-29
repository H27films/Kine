import React from 'react';
import { X } from 'lucide-react';
import { supabase, getISOWeek, getDayName } from '../../lib/supabase';

interface StravaActivity {
  id: number;
  activity_id: number;
  date: string;
  type: string;
  distance_km: number;
  name: string;
  time_formatted: string;
  workout_calories: number | null;
  duration_seconds: number | null;
  logged: boolean;
}

interface SelectionBarProps {
  selected: StravaActivity[];
  onClear: () => void;
  onJoinSuccess: (keptId: number, removedIds: number[], merged: StravaActivity) => void;
  onLoggedChange: (activityIds: number[]) => void;
  editing?: boolean;
  onEdit?: () => void;
  onSaveAll?: () => void;
  onCancelEdit?: () => void;
}

const EXERCISE_IDS: Record<string, number> = {
  Run: 84,
  Rowing: 83,
  Walk: 85,
  Ride: 87,
  VirtualRide: 87,
  CrossTrainer: 86,
};

const canJoin = (selected: StravaActivity[]): boolean => {
  if (selected.length < 2) return false;
  const types = new Set(selected.map(a => a.type));
  if (types.size > 1) return false;
  const type = selected[0].type;
  if (type !== 'Run' && type !== 'WeightTraining') return false;
  const dates = new Set(selected.map(a => a.date));
  if (dates.size > 1) return false;
  return true;
};

type ConfirmState = 'none' | 'join' | 'workouts' | 'logged';

const SelectionBar: React.FC<SelectionBarProps> = (props) => {
  const {
    selected,
    onClear,
    onJoinSuccess,
    onLoggedChange,
    editing = false,
    onEdit,
    onSaveAll,
    onCancelEdit,
  } = props;

  const [joining, setJoining] = React.useState(false);
  const [addingWorkouts, setAddingWorkouts] = React.useState(false);
  const [error, setError] = React.useState('');
  const [confirming, setConfirming] = React.useState<ConfirmState>('none');

  const joinable = canJoin(selected);

  // Activities that can be inserted into workouts: not WeightTraining, and not already logged
  const insertable = selected.filter(a => {
    if (a.type === 'WeightTraining') return false;
    const exercise_id = EXERCISE_IDS[a.type];
    if (!exercise_id) return false;
    return !a.logged;
  });

  const workoutsAllowed = selected.some(a => a.type !== 'WeightTraining');
  const loggable = insertable.length > 0;

  const handleJoin = async () => {
    setJoining(true);
    setError('');
    setConfirming('none');
    try {
      const sorted = [...selected].sort((a, b) => b.activity_id - a.activity_id);
      const keep = sorted[0];
      const rest = sorted.slice(1);

      const totalDistance = +selected.reduce((s, a) => s + (a.distance_km || 0), 0).toFixed(2);
      const totalDuration = selected.reduce((s, a) => s + (a.duration_seconds || 0), 0);
      const totalCalories = selected.reduce((s, a) => s + (a.workout_calories || 0), 0);
      const totalSecs = String(totalDuration % 60).padStart(2, '0');
      const totalMins = Math.floor(totalDuration / 60);
      const totalHours = Math.floor(totalMins / 60);
      const remMins = String(totalMins % 60).padStart(2, '0');
      const time_formatted = `${String(totalHours).padStart(2, '0')}:${remMins}:${totalSecs}`;

      const merged = {
        ...keep,
        distance_km: totalDistance,
        duration_seconds: totalDuration,
        workout_calories: totalCalories || null,
        time_formatted,
      };

      const { error: updateErr } = await supabase
        .from('strava')
        .update({
          distance_km: totalDistance,
          duration_seconds: totalDuration,
          workout_calories: totalCalories || null,
          time_formatted,
        })
        .eq('id', keep.id);

      if (updateErr) throw updateErr;

      const removeIds = rest.map(a => a.id);
      const { error: deleteErr } = await supabase
        .from('strava')
        .delete()
        .in('id', removeIds);

      if (deleteErr) throw deleteErr;

      onJoinSuccess(keep.id, removeIds, merged as StravaActivity);
    } catch (e: any) {
      setError('Join failed: ' + e.message);
    } finally {
      setJoining(false);
    }
  };

  const handleMarkLogged = async () => {
    setAddingWorkouts(true);
    setError('');
    setConfirming('none');
    try {
      const activityIds = selected.map(a => a.id);
      const { error: updateErr } = await supabase
        .from('strava')
        .update({ logged: true })
        .in('id', activityIds);

      if (updateErr) throw updateErr;

      onLoggedChange(activityIds);
      onClear();
    } catch (e: any) {
      setError('Mark logged failed: ' + e.message);
    } finally {
      setAddingWorkouts(false);
    }
  };

  const handleAddWorkouts = async () => {
    setAddingWorkouts(true);
    setError('');
    setConfirming('none');
    try {
      const uniqueExerciseIds = [...new Set(insertable.map(a => EXERCISE_IDS[a.type]).filter(Boolean))];
      const { data: exercises, error: exErr } = await supabase
        .from('exercises')
        .select('id, multiplier')
        .in('id', uniqueExerciseIds);

      if (exErr) throw exErr;

      const multiplierMap: Record<number, number> = {};
      (exercises || []).forEach(ex => { multiplierMap[ex.id] = ex.multiplier; });

      const rows = insertable.map(a => {
        const exercise_id = EXERCISE_IDS[a.type];
        const multiplier = multiplierMap[exercise_id] ?? 1;
        const km = a.distance_km > 0 ? a.distance_km : null;
        const total_cardio = km != null ? +(km * multiplier).toFixed(2) : null;
        const total_score_k = total_cardio != null ? +(total_cardio * 1000).toFixed(1) : null;

        const activityDate = new Date(a.date + 'T12:00:00+08:00');
        const week = getISOWeek(activityDate);
        const day = getDayName(activityDate);

        return {
          date: a.date,
          week,
          day,
          type: 'CARDIO',
          exercise_id,
          km,
          multiplier: multiplier ? +multiplier.toFixed(1) : null,
          total_cardio,
          total_score_k,
          workout_calories: a.workout_calories ?? null,
          time: a.time_formatted || null,
          source: 'Strava',
          new_entry: 'New',
        };
      });

      const { error: insertErr } = await supabase
        .from('workouts')
        .insert(rows);

      if (insertErr) throw insertErr;

      // Also set logged = true on these activity IDs in the strava table
      const activityIds = selected.map(a => a.id);
      const { error: updateErr } = await supabase
        .from('strava')
        .update({ logged: true })
        .in('id', activityIds);

      if (updateErr) throw updateErr;

      onLoggedChange(activityIds);
      onClear();
    } catch (e: any) {
      setError('Add workouts failed: ' + e.message);
    } finally {
      setAddingWorkouts(false);
    }
  };

  if (selected.length === 0) return null;

  const btnBase: React.CSSProperties = {
    flexShrink: 0, padding: '10px 16px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)',
    cursor: 'pointer',
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: "'JetBrains Mono', monospace",
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  };

  const blackBtn: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'rgba(0,0,0,0.8)',
    color: '#ffffff',
  };

  const disabledBtn: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'rgba(255,255,255,0.35)',
    color: 'rgba(0,0,0,0.25)',
    cursor: 'not-allowed',
    border: '1px solid rgba(255,255,255,0.5)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  };

  const confirmBtn: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'rgba(0,0,0,0.8)',
    color: '#fff',
    border: '1px solid rgba(0,0,0,0.1)',
  };

  const cancelBtn: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'rgba(0,0,0,0.06)',
    color: '#1a1a1a',
    border: 'none',
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000,
      background: 'rgba(240,240,240,0.75)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '14px 20px',
      paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
      display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between',
      animation: 'slideUpBar 0.2s ease',
    }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
          color: '#000000', textTransform: 'uppercase',
          fontFamily: "'JetBrains Mono', monospace",
          marginRight: '4px', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {selected.length} SELECTED
        </span>

        {confirming === 'join' ? (
          <>
            <button onClick={handleJoin} disabled={joining} style={confirmBtn}>
              {joining ? 'JOINING...' : 'CONFIRM JOIN'}
            </button>
            <button onClick={() => setConfirming('none')} style={cancelBtn}>CANCEL</button>
          </>
        ) : confirming === 'workouts' ? (
          <>
            <button onClick={handleAddWorkouts} disabled={addingWorkouts} style={confirmBtn}>
              {addingWorkouts ? 'ADDING...' : `CONFIRM ADD ${insertable.length}`}
            </button>
            <button onClick={() => setConfirming('none')} style={cancelBtn}>CANCEL</button>
          </>
        ) : confirming === 'logged' ? (
          <>
            <button onClick={handleMarkLogged} style={confirmBtn}>
              {`CONFIRM LOG ${selected.length}`}
            </button>
            <button onClick={() => setConfirming('none')} style={cancelBtn}>CANCEL</button>
          </>
         ) : editing ? (
           <>
             <button onClick={onSaveAll} style={confirmBtn}>
               SAVE ALL
             </button>
             <button onClick={onCancelEdit} style={cancelBtn}>CANCEL</button>
           </>
         ) : (
           <>
             <button
               onClick={() => joinable && setConfirming('join')}
               style={joinable ? blackBtn : disabledBtn}
             >
               JOIN
             </button>
             <button
               onClick={() => workoutsAllowed ? setConfirming('workouts') : undefined}
               style={workoutsAllowed ? blackBtn : disabledBtn}
             >
               + WORKOUTS
             </button>
             <button
               onClick={() => loggable && setConfirming('logged')}
               style={loggable ? blackBtn : disabledBtn}
             >
               LOGGED
             </button>
             <button
               onClick={() => onEdit?.()}
               style={blackBtn}
             >
               EDIT
             </button>
           </>
         )}
      </div>

      <button
        onClick={onClear}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px', color: '#1a1a1a', flexShrink: 0,
        }}
      >
        <X size={18} strokeWidth={1.8} />
      </button>

      {error && (
        <div style={{
          position: 'absolute', top: '-24px', left: '20px',
          fontSize: '10px', color: '#FC4C02',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes slideUpBar {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SelectionBar;