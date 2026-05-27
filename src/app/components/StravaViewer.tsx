import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SelectionBar from './SelectionBar';

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

interface StravaViewerProps {
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  Run: '#FC4C02',
  Walk: '#1a1a1a',
  Ride: '#1a1a1a',
  Rowing: '#1a1a1a',
  WeightTraining: '#1a1a1a',
  Elliptical: '#1a1a1a',
  VirtualRide: '#1a1a1a',
  Hike: '#1a1a1a',
  CrossTrainer: '#1a1a1a',
};

const TYPE_LABELS: Record<string, string> = {
  Run: 'RUN',
  Walk: 'WALK',
  Ride: 'RIDE',
  Rowing: 'ROW',
  WeightTraining: 'WEIGHTS',
  Elliptical: 'ELLIPTICAL',
  VirtualRide: 'VIRTUAL RIDE',
  Hike: 'HIKE',
  CrossTrainer: 'CROSS TRAINER',
};

const EXERCISE_IDS: Record<string, number> = {
  Run: 84,
  Rowing: 83,
  Walk: 85,
  Ride: 87,
  VirtualRide: 87,
  CrossTrainer: 86,
};

const CALORIE_DERIVED_KM = new Set(['Rowing', 'Ride', 'VirtualRide']);

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const makeLogKey = (date: string, exerciseId: number, km: number | null): string =>
  `${date}-${exerciseId}-${km ?? 'null'}`;

const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length !== 3) return timeStr;
  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  const secs = parts[2];
  const totalMins = hours * 60 + mins;
  return `${totalMins}:${secs}`;
};

const StravaViewer: React.FC<StravaViewerProps> = ({ onClose }) => {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loggedKeys, setLoggedKeys] = useState<Set<string>>(new Set());

  const selectedActivities = activities.filter(a => selectedIds.includes(a.id));

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectMode(false);
  };

  const handleJoinSuccess = (keptId: number, removedIds: number[], merged: StravaActivity) => {
    setActivities(prev => {
      const without = prev.filter(a => !removedIds.includes(a.id));
      return without.map(a => a.id === keptId ? { ...a, ...merged } : a);
    });
    clearSelection();
  };

  const handleWorkoutsSuccess = (newKeys: Set<string>) => {
    setLoggedKeys(prev => new Set([...prev, ...newKeys]));
  };

  // Fetch activities + existing workouts logs in parallel
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [{ data: stravaData }, { data: workoutsData }] = await Promise.all([
        supabase.from('strava').select('*').order('date', { ascending: false }),
        supabase.from('workouts').select('date, exercise_id, km').eq('source', 'app'),
      ]);

      setActivities((stravaData as StravaActivity[]) || []);

      // Build logged keys from existing workouts rows
      const keys = new Set<string>();
      (workoutsData || []).forEach((w: { date: string; exercise_id: number; km: number | null }) => {
        keys.add(makeLogKey(w.date, w.exercise_id, w.km));
      });
      setLoggedKeys(keys);

      setLoading(false);
    };
    load();
  }, []);

  // Compute logged key for a given activity
  const getActivityLogKey = (a: StravaActivity): string | null => {
    const exercise_id = EXERCISE_IDS[a.type];
    if (!exercise_id) return null;
    const km = CALORIE_DERIVED_KM.has(a.type)
      ? (a.workout_calories ?? 0) / 50
      : (a.distance_km > 0 ? a.distance_km : null);
    return makeLogKey(a.date, exercise_id, km);
  };

  const isLogged = (a: StravaActivity): boolean => {
    const key = getActivityLogKey(a);
    return key ? loggedKeys.has(key) : false;
  };

  const handleTypeChange = async (activity: StravaActivity, newType: string) => {
    const newName = newType === 'CrossTrainer'
      ? activity.name.replace(/walk/gi, 'Cross Trainer')
      : activity.name.replace(/cross trainer/gi, 'Walk');
    const { error } = await supabase
      .from('strava')
      .update({ type: newType, name: newName })
      .eq('id', activity.id);
    if (!error) {
      setActivities(prev => prev.map(a =>
        a.id === activity.id ? { ...a, type: newType, name: newName } : a
      ));
    }
    setEditingId(null);
  };

  const filtered = filter === 'All'
    ? activities
    : activities.filter(a => a.type === filter);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: '#f2f2f2',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'JetBrains Mono', monospace",
        animation: 'slideUp 0.25s ease',
      }}
      onClick={() => setEditingId(null)}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <span style={{
          fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em',
          color: '#1a1a1a', textTransform: 'uppercase',
        }}>
          Strava Data
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(26,26,26,0.45)', letterSpacing: '0.1em' }}>
            {filtered.length} ACTIVITIES
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#1a1a1a' }}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{
        display: 'flex', gap: '8px', padding: '12px 20px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }} onClick={() => setFilterOpen(false)}>

        <button
          onClick={() => { setFilter('All'); setFilterOpen(false); }}
          style={{
            padding: '6px 14px', borderRadius: '999px',
            backgroundColor: filter === 'All' ? '#1a1a1a' : 'rgba(0,0,0,0.06)',
            color: filter === 'All' ? '#f2f2f2' : '#1a1a1a',
            border: 'none', cursor: 'pointer',
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ALL
        </button>

        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setFilterOpen(o => !o)}
            style={{
              padding: '6px 14px', borderRadius: '999px',
              backgroundColor: filter !== 'All' ? '#1a1a1a' : 'rgba(0,0,0,0.06)',
              color: filter !== 'All' ? '#f2f2f2' : '#1a1a1a',
              border: 'none', cursor: 'pointer',
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex', alignItems: 'center', gap: '5px',
            }}
          >
            {filter !== 'All' ? (TYPE_LABELS[filter] || filter) : 'FILTER'}
            <span style={{ fontSize: '8px', opacity: 0.7 }}>{filterOpen ? '▲' : '▼'}</span>
          </button>

          {filterOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
              backgroundColor: '#f2f2f2', borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.08)',
              overflow: 'hidden', minWidth: '150px',
            }}>
              {['Run', 'Walk', 'Ride', 'Rowing', 'WeightTraining', 'CrossTrainer'].map((opt, i, arr) => (
                <div
                  key={opt}
                  onClick={() => { setFilter(opt); setFilterOpen(false); }}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: filter === opt ? '#FC4C02' : '#1a1a1a',
                    backgroundColor: filter === opt ? 'rgba(0,0,0,0.04)' : 'transparent',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {TYPE_LABELS[opt]}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            if (selectMode && selectedIds.length > 0) {
              setSelectedIds([]);
            } else {
              setSelectMode(s => !s);
              setSelectedIds([]);
            }
          }}
          style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: '999px',
            backgroundColor: selectMode ? '#1a1a1a' : 'rgba(0,0,0,0.06)',
            color: selectMode ? '#f2f2f2' : '#1a1a1a',
            border: 'none', cursor: 'pointer',
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {selectMode && selectedIds.length > 0 ? 'DESELECT ALL' : 'SELECT'}
        </button>
      </div>

      {/* Activity list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(26,26,26,0.35)', fontSize: '12px' }}>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(26,26,26,0.35)', fontSize: '12px' }}>
            No activities
          </div>
        ) : (
          (() => {
            const grouped: { date: string; activities: StravaActivity[] }[] = [];
            filtered.forEach(a => {
              const last = grouped[grouped.length - 1];
              if (last && last.date === a.date) {
                last.activities.push(a);
              } else {
                grouped.push({ date: a.date, activities: [a] });
              }
            });
            return grouped.map((group, groupIdx) => {
              const isLastGroup = groupIdx === grouped.length - 1;
              const nextGroup = grouped[groupIdx + 1];
              const getWeek = (dateStr: string) => {
                const d = new Date(dateStr + 'T00:00:00');
                const day = d.getDay();
                const mondayBased = (day === 0 ? 6 : day - 1);
                const monday = new Date(d);
                monday.setDate(d.getDate() - mondayBased);
                return monday.toISOString().split('T')[0];
              };
              const isWeekBoundary = !isLastGroup && nextGroup &&
                getWeek(group.date) !== getWeek(nextGroup.date);

              return (
                <div key={group.date} style={{ marginBottom: '8px' }}>
                  {/* Date header */}
                  <div style={{ paddingTop: '16px', paddingBottom: '6px' }}>
                    <span style={{
                      fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em',
                      color: '#1a1a1a', textTransform: 'uppercase',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {(() => {
                        const d = new Date(group.date + 'T00:00:00');
                        const day = d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
                        const date = d.getDate();
                        const month = MONTH_NAMES[d.getMonth()];
                        return `${day} ${date} ${month}`;
                      })()}
                    </span>
                  </div>

                  {group.activities.map((a, actIdx) => {
                    const isLastInGroup = actIdx === group.activities.length - 1;
                    const logged = isLogged(a);

                    return (
                      <div
                        key={a.id}
                        onClick={() => selectMode && toggleSelect(a.id)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                          padding: '12px 0',
                          borderBottom: isLastInGroup && isWeekBoundary
                            ? '1.5px solid #1a1a1a'
                            : '1px solid rgba(0,0,0,0.06)',
                          cursor: selectMode ? 'pointer' : 'default',
                        }}
                      >
                        {/* Selection circle */}
                        {selectMode && (
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                            marginRight: '12px', marginTop: '22px',
                            border: selectedIds.includes(a.id) ? 'none' : '1.5px solid rgba(26,26,26,0.25)',
                            backgroundColor: selectedIds.includes(a.id) ? '#FC4C02' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {selectedIds.includes(a.id) && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        )}

                        {/* Left: name + type */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Name row with Logged pill */}
                          <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '9px', fontWeight: 500, color: '#1a1a1a',
                              letterSpacing: '0.02em', whiteSpace: 'nowrap',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              maxWidth: '160px',
                            }}>
                              {a.name}
                            </span>
                            {logged && (
                              <span style={{
                                fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em',
                                color: '#f2f2f2', backgroundColor: '#1a1a1a',
                                padding: '2px 6px', borderRadius: '999px',
                                textTransform: 'uppercase', flexShrink: 0,
                                fontFamily: "'JetBrains Mono', monospace",
                              }}>
                                LOGGED
                              </span>
                            )}
                          </div>

                          {/* Type label */}
                          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                            <div
                              onClick={() => a.type === 'Walk' ? setEditingId(editingId === a.id ? null : a.id) : undefined}
                              style={{
                                fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em',
                                color: TYPE_COLORS[a.type] || '#1a1a1a',
                                textTransform: 'uppercase',
                                cursor: a.type === 'Walk' ? 'pointer' : 'default',
                                textDecoration: a.type === 'Walk' ? 'underline dotted' : 'none',
                                textUnderlineOffset: '4px',
                                display: 'inline-block',
                              }}
                            >
                              {TYPE_LABELS[a.type] || a.type}
                            </div>

                            {editingId === a.id && (
                              <div style={{
                                position: 'absolute', top: '100%', left: 0, zIndex: 50,
                                backgroundColor: '#f2f2f2', borderRadius: '10px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                border: '1px solid rgba(0,0,0,0.08)',
                                overflow: 'hidden', minWidth: '140px',
                                marginTop: '4px',
                              }}>
                                {['Walk', 'CrossTrainer'].map((opt, i) => (
                                  <div
                                    key={opt}
                                    onClick={() => handleTypeChange(a, opt)}
                                    style={{
                                      padding: '10px 14px', cursor: 'pointer',
                                      fontSize: '11px', fontWeight: 700,
                                      letterSpacing: '0.08em', textTransform: 'uppercase',
                                      color: a.type === opt ? '#FC4C02' : '#1a1a1a',
                                      backgroundColor: a.type === opt ? 'rgba(0,0,0,0.04)' : 'transparent',
                                      borderBottom: i === 0 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                                      fontFamily: "'JetBrains Mono', monospace",
                                    }}
                                  >
                                    {TYPE_LABELS[opt]}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: stats */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                          {a.time_formatted && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', fontWeight: 500, color: '#1a1a1a', letterSpacing: '0.02em' }}>
                                {formatTime(a.time_formatted)}
                              </div>
                              <div style={{ fontSize: '8px', color: 'rgba(26,26,26,0.4)', letterSpacing: '0.1em' }}>TIME</div>
                            </div>
                          )}
                          {a.workout_calories && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                                {a.workout_calories}
                              </div>
                              <div style={{ fontSize: '8px', color: 'rgba(26,26,26,0.4)', letterSpacing: '0.1em' }}>KCAL</div>
                            </div>
                          )}
                          {a.distance_km > 0 && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                                {a.distance_km}
                              </div>
                              <div style={{ fontSize: '8px', color: 'rgba(26,26,26,0.4)', letterSpacing: '0.1em' }}>KM</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()
        )}
      </div>

      <SelectionBar
        selected={selectedActivities}
        onClear={clearSelection}
        onJoinSuccess={handleJoinSuccess}
        onWorkoutsSuccess={handleWorkoutsSuccess}
        onMarkLogged={(keys) => setLoggedKeys(keys)}
        loggedKeys={loggedKeys}
      />

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default StravaViewer;