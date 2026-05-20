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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
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

  // Click outside (on document) to collapse — only when something inside containerRef is NOT the target
  useEffect(() => {
    if (!expandedKey) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(t)) {
        setExpandedKey(null);
        setConfirmDeleteId(null);
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

  // Delete a session from Supabase
  const deleteSession = async (sessionId: number) => {
    await supabase
      .from('workouts')
      .delete()
      .eq('id', sessionId);
    setConfirmDeleteId(null);
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
        {/* Exercise name header — indented */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(26,26,26,0.8)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            marginBottom: 8,
            paddingLeft: 22,
            fontFamily: "'Archivo', sans-serif",
          }}
        >
          {ex.exercise_name?.toUpperCase()}
        </div>

        {/* Dot + entry boxes — each session on its own row, dots at left edge, cross at right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {kSessions.map((session) => {
            const editVal = editValues[session.id] ?? String(session.km);
            return (
              <div
                key={session.id}
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  lineHeight: 1.15,
                  position: 'relative',
                }}
              >
                <div
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
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    setConfirmDeleteId(null);
                  }}
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

                {/* Spacer to push cross to the right */}
                <div style={{ flex: 1 }} />

                {/* Cross button — always visible */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setConfirmDeleteId(prev => prev === session.id ? null : session.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    color: '#1a1a1a',
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>

                {/* Delete confirmation pill */}
                {confirmDeleteId === session.id && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.55)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        cursor: 'pointer',
                        color: '#1a1a1a',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                        fontFamily: "'Archivo', sans-serif",
                      }}
                    >
                      DELETE ENTRY
                    </button>
                  </div>
                )}
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
                onClick={() => setExpandedKey(key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  cursor: 'pointer',
                }}
              >
                {entry.sessions.length > 1 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      color: '#000000',
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