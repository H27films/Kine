import React from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
}

interface SelectionBarProps {
  selected: StravaActivity[];
  onClear: () => void;
  onJoinSuccess: (keptId: number, removedIds: number[], merged: StravaActivity) => void;
}

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

type ConfirmState = 'none' | 'join' | 'workouts';

const SelectionBar: React.FC<SelectionBarProps> = ({ selected, onClear, onJoinSuccess }) => {
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState('');
  const [confirming, setConfirming] = React.useState<ConfirmState>('none');
  const joinable = canJoin(selected);

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
    backgroundColor: 'rgba(0,0,0,0.2)',
    color: 'rgba(255,255,255,0.2)',
    cursor: 'not-allowed',
    border: '1px solid rgba(255,255,255,0.05)',
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
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '14px 20px',
      paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
      display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between',
      animation: 'slideUpBar 0.2s ease',
    }}>

      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
      {/* Count */}
      <span style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
        color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase',
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
          <button onClick={() => setConfirming('none')} style={cancelBtn}>
            CANCEL
          </button>
        </>
      ) : confirming === 'workouts' ? (
        <>
          <button onClick={() => { setConfirming('none'); }} style={confirmBtn}>
            CONFIRM
          </button>
          <button onClick={() => setConfirming('none')} style={cancelBtn}>
            CANCEL
          </button>
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
            onClick={() => setConfirming('workouts')}
            style={blackBtn}
          >
            + WORKOUTS
          </button>
        </>
      )}

</div>

{/* Close */}
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