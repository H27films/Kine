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
  logged: boolean;
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

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<number, { date: string; distance_km: number }>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [deletingConfirmId, setDeletingConfirmId] = useState<number | null>(null);

  const selectedActivities = activities.filter(a => selectedIds.includes(a.id));

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectMode(false);
    setEditing(false);
    setEditValues({});
    setDeletingConfirmId(null);
    setDeletingId(null);
  };

  const enterEditMode = () => {
    const edits: Record<number, { date: string; distance_km: number }> = {};
    selectedActivities.forEach(a => {
      edits[a.id] = { date: a.date, distance_km: a.distance_km };
    });
    setEditValues(edits);
    setEditing(true);
    setDeletingConfirmId(null);
    setDeletingId(null);
  };

  const cancelEditMode = () => {
    setEditing(false);
    setEditValues({});
    setDeletingConfirmId(null);
    setDeletingId(null);
  };

  const handleEditChange = (id: number, field: 'date' | 'distance_km', value: string) => {
    setEditValues(prev => {
      const current = prev[id];
      if (!current) return prev;
      if (field === 'date') {
        return { ...prev, [id]: { ...current, date: value } };
      }
      const parsed = parseFloat(value);
      return { ...prev, [id]: { ...current, distance_km: isNaN(parsed) ? 0 : parsed } };
    });
  };

  const handleDeleteActivity = async (id: number) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('strava').delete().eq('id', id);
      if (error) throw error;
      setActivities(prev => prev.filter(a => a.id !== id));
      setSelectedIds(prev => prev.filter(x => x !== id));
      setDeletingConfirmId(null);
      setEditValues(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e: any) {
      console.error('Delete failed:', e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveAllEdits = async () => {
    const ids = Object.keys(editValues).map(Number);
    if (ids.length === 0) return;

    setSavingIds(new Set(ids));
    try {
      for (const id of ids) {
        const { date, distance_km } = editValues[id];
        const { error } = await supabase
          .from('strava')
          .update({ date, distance_km })
          .eq('id', id);
        if (error) throw error;
        setActivities(prev => {
          const updated = prev.map(a =>
            a.id === id ? { ...a, date, distance_km } : a
          );
          return updated.sort((a, b) => b.date.localeCompare(a.date));
        });
      }
      cancelEditMode();
    } catch (e: any) {
      console.error('Save failed:', e.message);
    } finally {
      setSavingIds(new Set());
    }
  };

  const handleJoinSuccess = (keptId: number, removedIds: number[], merged: StravaActivity) => {
    setActivities(prev => {
      const without = prev.filter(a => !removedIds.includes(a.id));
      return without.map(a => a.id === keptId ? { ...a, ...merged } : a);
    });
    clearSelection();
  };

  const handleLoggedChange = (activityIds: number[]) => {
    setActivities(prev => prev.map(a =>
      activityIds.includes(a.id) ? { ...a, logged: true } : a
    ));
  };

  // Fetch activities
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: stravaData } = await supabase
        .from('strava')
        .select('*')
        .order('date', { ascending: false });

      setActivities((stravaData as StravaActivity[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const isLogged = (a: StravaActivity): boolean => a.logged === true;

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

  const totalKm = filter === 'WeightTraining'
    ? 0
    : filtered.reduce((sum, a) => sum + (a.distance_km > 0 ? a.distance_km : 0), 0);

  const avgCalories = filter === 'WeightTraining' && filtered.length > 0
    ? Math.round(filtered.reduce((sum, a) => sum + (a.workout_calories ?? 0), 0) / filtered.length)
    : 0;

  const totalDays = (() => {
    if (activities.length === 0) return 0;
    const dates = activities.map(a => new Date(a.date + 'T00:00:00').getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    return Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1;
  })();

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
            {totalDays} DAYS / {filtered.length} ACTIVITIES
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

        {/* Filter-sensitive sum pill: KM for most types, avg calories for WeightTraining */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '6px 14px', borderRadius: '999px',
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, color: '#1a1a1a',
            letterSpacing: '0.02em', fontFamily: "'JetBrains Mono', monospace",
          }}>
            {filter === 'WeightTraining' ? avgCalories : totalKm.toFixed(2)}
          </span>
          <span style={{
            fontSize: '8px', color: 'rgba(26,26,26,0.4)', letterSpacing: '0.1em',
            fontWeight: 700,
          }}>
            {filter === 'WeightTraining' ? 'KCAL (AVG)' : 'KM'}
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              padding: '6px 14px', borderRadius: '999px',
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
          {selectMode && (
            <button
              onClick={() => setSelectedIds(filtered.map(a => a.id))}
              style={{
                padding: '6px 14px', borderRadius: '999px',
                backgroundColor: selectedIds.length === filtered.length ? '#1a1a1a' : 'rgba(0,0,0,0.06)',
                color: selectedIds.length === filtered.length ? '#f2f2f2' : '#1a1a1a',
                border: 'none', cursor: 'pointer',
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              ALL
            </button>
          )}
        </div>
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
                    const isEditing = editing && selectedIds.includes(a.id);
                    const editVal = editValues[a.id];
                    const isSaving = savingIds.has(a.id);
                    const isDeleting = deletingId === a.id;
                    const showDeleteConfirm = deletingConfirmId === a.id;

                    return (
                      <React.Fragment key={a.id}>
                      <div
                        onClick={() => {
                          if (!selectMode) setSelectMode(true);
                          toggleSelect(a.id);
                        }}
                        style={{
                          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                          padding: '12px 0',
                          borderBottom: isEditing
                            ? 'none'
                            : isLastInGroup && isWeekBoundary
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
                          <div style={{ position: 'relative' }}>
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
                          {(a.distance_km > 0 || a.type === 'Rowing') && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                                {a.distance_km > 0 ? a.distance_km : ((a.workout_calories ?? 0) / 50).toFixed(2)}
                              </div>
                              <div style={{ fontSize: '8px', color: 'rgba(26,26,26,0.4)', letterSpacing: '0.1em' }}>KM</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded edit row (3rd line) */}
                      {isEditing && editVal && (
                        <div style={{
                          padding: '10px 0 14px 0',
                          display: 'flex', alignItems: 'center', gap: '12px',
                          borderBottom: isLastInGroup && isWeekBoundary
                            ? '1.5px solid #1a1a1a'
                            : '1px solid rgba(0,0,0,0.06)',
                        }}>
                          {/* Date input */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.75)', letterSpacing: '0.1em', marginBottom: '6px' }}>DATE</div>
                            <div style={{
                              padding: '8px 10px', borderRadius: '10px',
                              background: 'rgba(255,255,255,0.55)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255,255,255,0.3)',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                            }}>
                              <input
                                type="text"
                                value={editVal.date}
                                onChange={e => handleEditChange(a.id, 'date', e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{
                                  width: '100%', border: 'none', outline: 'none',
                                  backgroundColor: 'transparent',
                                  fontSize: '12px', fontWeight: 500,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  color: '#1a1a1a',
                                }}
                                placeholder="YYYY-MM-DD"
                              />
                            </div>
                          </div>
                          {/* Distance input */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.75)', letterSpacing: '0.1em', marginBottom: '6px' }}>KM</div>
                            <div style={{
                              padding: '8px 10px', borderRadius: '10px',
                              background: 'rgba(255,255,255,0.55)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255,255,255,0.3)',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                            }}>
                              <input
                                type="number"
                                value={editVal.distance_km}
                                onChange={e => handleEditChange(a.id, 'distance_km', e.target.value)}
                                onClick={e => e.stopPropagation()}
                                step="0.01"
                                min="0"
                                style={{
                                  width: '100%', border: 'none', outline: 'none',
                                  backgroundColor: 'transparent',
                                  fontSize: '12px', fontWeight: 500,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  color: '#1a1a1a',
                                }}
                              />
                            </div>
                          </div>
                          {/* Delete button with confirmation */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ height: '16px' }} /> {/* spacer to align with label above inputs */}
                            {showDeleteConfirm ? (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                  onClick={e => { e.stopPropagation(); handleDeleteActivity(a.id); }}
                                  disabled={isDeleting}
                                  style={{
                                    padding: '6px 12px', borderRadius: '8px',
                                    border: 'none', cursor: 'pointer',
                                    backgroundColor: '#FC4C02', color: '#fff',
                                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
                                    fontFamily: "'JetBrains Mono', monospace",
                                  }}
                                >
                                  {isDeleting ? '...' : 'DELETE'}
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setDeletingConfirmId(null); }}
                                  style={{
                                    padding: '6px 8px', borderRadius: '8px',
                                    border: 'none', cursor: 'pointer',
                                    backgroundColor: 'rgba(0,0,0,0.06)', color: '#1a1a1a',
                                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
                                    fontFamily: "'JetBrains Mono', monospace",
                                  }}
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); setDeletingConfirmId(a.id); }}
                                style={{
                                  padding: '6px 12px', borderRadius: '8px',
                                  border: '1px solid rgba(252,76,2,0.3)', cursor: 'pointer',
                                  backgroundColor: 'rgba(252,76,2,0.06)', color: '#FC4C02',
                                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
                                  textTransform: 'uppercase',
                                  fontFamily: "'JetBrains Mono', monospace",
                                }}
                              >
                                DELETE
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      </React.Fragment>
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
        onLoggedChange={handleLoggedChange}
        editing={editing}
        onEdit={enterEditMode}
        onSaveAll={handleSaveAllEdits}
        onCancelEdit={cancelEditMode}
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