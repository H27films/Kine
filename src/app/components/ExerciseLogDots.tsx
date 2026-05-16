import React, { useState, useEffect, useRef } from 'react';
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
  id: number;
  exercise_id: number;
  km: number;
}

const ExerciseLogDots: React.FC<Props> = ({ exercises, saveSuccess }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedKey, setExpandedKey] = useState<IconKey | null>(null);
  const [editValues, setEditValues] = useState<Record<number, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    if (!exercises.length) return;
    const ids = exercises.map(e => e.id).filter(Boolean);
    const { data } = await supabase
      .from('workouts')
      .select('id, exercise_id, km')
      .eq('date', todayStr())
      .eq('type', 'CARDIO')
      .in('exercise_id', ids);
    if (data) setSessions(data as Session[]);
  };

  useEffect(() => {
    fetchSessions();
  }, [exercises, saveSuccess]);

  // Click outside to collapse
  useEffect(() => {
    if (!expandedKey) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpandedKey(null);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [expandedKey]);

  // Save edited KM to Supabase
  const saveKm = async (sessionId: number, newKmStr: string) => {
    const newKm = parseFloat(newKmStr);
    if (isNaN(newKm) || newKm <= 0) return;
    await supabase
      .from('workouts')
      .update({ km: newKm, total_cardio: newKm })
      .eq('id', sessionId);
    await fetchSessions();
  };

  // Map exercise_id → sessions
  const sessionsByExId: Record<number, Session[]> = {};
  sessions.forEach(s => {
    if (!sessionsByExId[s.exercise_id]) sessionsByExId[s.exercise_id] = [];
    sessionsByExId[s.exercise_id].push(s);
  });

  // Map icon key → exercise + sessions
  const dataByKey: Partial<Record<IconKey, { ex: Exercise; sessions: Session[] }>> = {};
  ICON_KEYS.forEach(key => {
    const ex = exercises.find(e =>
      e.exercise_name?.toLowerCase().includes(MATCH_KEYWORDS[key])
    );
    if (ex && ex.id && sessionsByExId[ex.id]?.length) {
      dataByKey[key] = { ex, sessions: sessionsByExId[ex.id] };
    }
  });

  const hasAny = Object.keys(dataByKey).length > 0;
  if (!hasAny) return null;

  // ── Expanded view ──
  if (expandedKey && dataByKey[expandedKey]) {
    const { ex, sessions: kSessions } = dataByKey[expandedKey]!;
    const total = kSessions.reduce((s, k) => s + Number(k.km), 0);

    return (
      <div
        ref={containerRef}
        style={{
          marginBottom: 12,
        }}
      >
        {/* Exercise name header — full width, above the rows */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(26,26,26,0.8)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            marginBottom: 6,
            fontFamily: "'Archivo', sans-serif",
          }}
        >
          {ex.exercise_name?.toUpperCase()}
        </div>

        {/* Dot + entry boxes — each session on its own row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 20 }}>
          {kSessions.map((session) => {
            const editVal = editValues[session.id] ?? String(session.km);
            return (
              <div
                key={session.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  lineHeight: 1.15,
                }}
              >
                <div
                  onClick={() => setExpandedKey(null)}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: '#1a1a1a',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={editVal}
                  onChange={e =>
                    setEditValues(prev => ({ ...prev, [session.id]: e.target.value }))
                  }
                  onBlur={e => saveKm(session.id, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: 'rgba(26,26,26,0.8)',
                    letterSpacing: '-0.04em',
                    background: 'rgba(0,0,0,0.04)',
                    borderRadius: 8,
                    padding: '4px 8px',
                    border: 'none',
                    outline: 'none',
                    width: '5ch',
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield',
                    fontFamily: "'Archivo', sans-serif",
                  } as React.CSSProperties}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(26,26,26,0.45)',
                    letterSpacing: '0.15em',
                    fontFamily: "'Archivo', sans-serif",
                  }}
                >
                  KM
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Compact dots row — matches ExerciseIconBar space-between layout ──
  // Each slot can have multiple dots (one per session) stacked vertically
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 14,
        minHeight: 24,
      }}
    >
      {ICON_KEYS.map(key => {
        const entry = dataByKey[key];
        return (
          <div
            key={key}
            style={{
              flex: '0 0 44px',
              width: 44,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {entry && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedKey(key)}
              >
                {entry.sessions.length > 1 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: '0.15em',
                      color: '#ffffff',
                      lineHeight: 1,
                      fontFamily: "'Archivo', sans-serif",
                    }}
                  >
                    {entry.sessions.length}
                  </span>
                )}
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#1a1a1a',
                    boxShadow: '0 0 8px rgba(0,0,0,0.2)',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ExerciseLogDots;
