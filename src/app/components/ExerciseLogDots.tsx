import React, { useState, useEffect } from 'react';
import { supabase, Exercise, todayStr } from '../../lib/supabase';

interface Props {
  exercises: Exercise[];
  saveSuccess: boolean;
}

type IconKey = 'running' | 'rowing' | 'walking' | 'cycling' | 'crosstrainer';

const ICON_KEYS: IconKey[] = ['running', 'rowing', 'walking', 'cycling', 'crosstrainer'];
const MATCH_KEYWORDS: Record<IconKey, string> = {
  running: 'run',
  rowing: 'row',
  walking: 'walk',
  cycling: 'cycl',
  crosstrainer: 'cross',
};

interface Session {
  exercise_id: number;
  km: number;
}

const ExerciseLogDots: React.FC<Props> = ({ exercises, saveSuccess }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedKey, setExpandedKey] = useState<IconKey | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!exercises.length) return;
      const ids = exercises.map(e => e.id).filter(Boolean);
      const { data } = await supabase
        .from('workouts')
        .select('exercise_id, km')
        .eq('date', todayStr())
        .eq('type', 'CARDIO')
        .in('exercise_id', ids);
      if (data) setSessions(data as Session[]);
    };
    fetch();
  }, [exercises, saveSuccess]);

  // Map exercise_id → km list
  const kmByExId: Record<number, number[]> = {};
  sessions.forEach(s => {
    if (!kmByExId[s.exercise_id]) kmByExId[s.exercise_id] = [];
    kmByExId[s.exercise_id].push(Number(s.km));
  });

  // Map icon key → exercise + sessions
  const dataByKey: Partial<Record<IconKey, { ex: Exercise; kms: number[] }>> = {};
  ICON_KEYS.forEach(key => {
    const ex = exercises.find(e =>
      e.exercise_name?.toLowerCase().includes(MATCH_KEYWORDS[key])
    );
    if (ex && ex.id && kmByExId[ex.id]?.length) {
      dataByKey[key] = { ex, kms: kmByExId[ex.id] };
    }
  });

  const hasAny = Object.keys(dataByKey).length > 0;
  if (!hasAny) return null;

  // ── Expanded view ──
  if (expandedKey && dataByKey[expandedKey]) {
    const { ex, kms } = dataByKey[expandedKey]!;
    const total = kms.reduce((s, k) => s + k, 0);
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 12,
          gap: 14,
        }}
      >
        {/* Collapse button — larger filled circle */}
        <div
          onClick={() => setExpandedKey(null)}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'white',
            flexShrink: 0,
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(255,255,255,0.5)',
          }}
        />

        {/* Session details */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              marginBottom: 3,
            }}
          >
            {ex.exercise_name?.toUpperCase()}
          </div>

          {kms.map((km, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 4,
                lineHeight: 1.15,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.04em',
                }}
              >
                {km.toFixed(1)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.45)',
                  letterSpacing: '0.15em',
                }}
              >
                KM
              </span>
            </div>
          ))}

          {kms.length > 1 && (
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.35)',
                marginTop: 2,
                letterSpacing: '0.1em',
              }}
            >
              TOTAL {total.toFixed(1)} KM
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Compact dots row — matches ExerciseIconBar layout exactly ──
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        height: 14,
      }}
    >
      {ICON_KEYS.map(key => {
        const hasData = !!dataByKey[key];
        return (
          <div
            key={key}
            style={{
              flex: '0 0 44px',
              width: 44,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {hasData && (
              <div
                onClick={() => setExpandedKey(key)}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 0 6px rgba(255,255,255,0.75)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ExerciseLogDots;
