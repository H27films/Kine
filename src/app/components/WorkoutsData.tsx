import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { supabase, getISOWeek } from '../../lib/supabase';

interface WorkoutRow {
  id: number;
  date: string;
  type: string;
  exercise_id: number | null;
  exercise_name: string;
  km: number | null;
  calories: number | null;
  food_rating: string | null;
  bodyweight: number | null;
  body_fat_percent: number | null;
  muscle_mass: number | null;
  time: string | null;
  total_cardio: number | null;
  total_weight: number | null;
  new_entry: string | null;
}

interface WorkoutsDataProps {
  onClose: () => void;
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const FOOD_EXERCISE_ID = 89;
const CALORIES_EXERCISE_ID = 90;
const TRACKER_EXERCISE_ID = 82;

const WorkoutsData: React.FC<WorkoutsDataProps> = ({ onClose }) => {
  const [rows, setRows] = useState<WorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<number, { date: string; km: string; calories: string; food_rating: string }>>({});
  const [deletingConfirmId, setDeletingConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [weekFilter, setWeekFilter] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);

  // Calculate date 5 weeks ago for filtering
  const fiveWeeksAgo = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 35);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const minDate = fiveWeeksAgo();
      const { data } = await supabase
        .from('workouts')
        .select(`
          id, date, type, exercise_id, km, calories, food_rating,
          bodyweight, body_fat_percent, muscle_mass, time,
          total_cardio, total_weight, new_entry,
          exercises:exercise_id(exercise_name)
        `)
        .in('type', ['CARDIO', 'MEASUREMENT'])
        .gte('date', minDate)
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .limit(500);

      if (data) {
        const mapped = (data as any[]).map(r => ({
          id: r.id,
          date: r.date,
          type: r.type,
          exercise_id: r.exercise_id,
          exercise_name: r.exercises?.exercise_name || 'Unknown',
          km: r.km,
          calories: r.calories,
          food_rating: r.food_rating,
          bodyweight: r.bodyweight,
          body_fat_percent: r.body_fat_percent,
          muscle_mass: r.muscle_mass,
          time: r.time,
          total_cardio: r.total_cardio,
          total_weight: r.total_weight,
          new_entry: r.new_entry,
        }));
        // Within same date: CARDIO (except TRACKER) → MEASUREMENT → FOOD → CALORIES → TRACKER
        mapped.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          const order = (r: typeof a) => {
            if (r.exercise_id === TRACKER_EXERCISE_ID) return 4;
            if (r.type === 'CARDIO') return 0;
            if (r.exercise_id === FOOD_EXERCISE_ID) return 1;
            if (r.exercise_id === CALORIES_EXERCISE_ID) return 2;
            return 0.5; // other MEASUREMENTs between CARDIO and FOOD
          };
          const oa = order(a);
          const ob = order(b);
          if (oa !== ob) return oa - ob;
          return b.id - a.id;
        });
        setRows(mapped);
      }
      setLoading(false);
    };
    load();
  }, []);

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
    const edits: Record<number, { date: string; km: string; calories: string; food_rating: string }> = {};
    rows.filter(r => selectedIds.includes(r.id)).forEach(r => {
      edits[r.id] = {
        date: r.date,
        km: r.km != null ? String(r.km) : '',
        calories: r.calories != null ? String(r.calories) : '',
        food_rating: r.food_rating || '',
      };
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

  const handleEditChange = (id: number, field: string, value: string) => {
    setEditValues(prev => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const handleDeleteRow = async (id: number) => {
    setDeletingId(id);
    try {
      await supabase.from('workouts').delete().eq('id', id);
      setRows(prev => prev.filter(r => r.id !== id));
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
        const ev = editValues[id];
        const updateData: Record<string, any> = { date: ev.date };
        const row = rows.find(r => r.id === id);
        if (!row) continue;

        if (row.exercise_id === CALORIES_EXERCISE_ID) {
          updateData.calories = ev.calories ? parseInt(ev.calories) : null;
        } else if (row.exercise_id === FOOD_EXERCISE_ID) {
          updateData.food_rating = ev.food_rating || null;
        } else {
          updateData.km = ev.km ? parseFloat(ev.km) : null;
        }

        const { error } = await supabase.from('workouts').update(updateData).eq('id', id);
        if (error) throw error;
      }
      // Reload data
      const minDate = fiveWeeksAgo();
      const { data } = await supabase
        .from('workouts')
        .select(`
          id, date, type, exercise_id, km, calories, food_rating,
          bodyweight, body_fat_percent, muscle_mass, time,
          total_cardio, total_weight, new_entry,
          exercises:exercise_id(exercise_name)
        `)
        .in('type', ['CARDIO', 'MEASUREMENT'])
        .gte('date', minDate)
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .limit(500);

      if (data) {
        const mapped = (data as any[]).map(r => ({
          id: r.id,
          date: r.date,
          type: r.type,
          exercise_id: r.exercise_id,
          exercise_name: r.exercises?.exercise_name || 'Unknown',
          km: r.km,
          calories: r.calories,
          food_rating: r.food_rating,
          bodyweight: r.bodyweight,
          body_fat_percent: r.body_fat_percent,
          muscle_mass: r.muscle_mass,
          time: r.time,
          total_cardio: r.total_cardio,
          total_weight: r.total_weight,
          new_entry: r.new_entry,
        }));
        mapped.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          const order = (r: typeof a) => {
            if (r.exercise_id === TRACKER_EXERCISE_ID) return 4;
            if (r.type === 'CARDIO') return 0;
            if (r.exercise_id === FOOD_EXERCISE_ID) return 1;
            if (r.exercise_id === CALORIES_EXERCISE_ID) return 2;
            return 0.5;
          };
          const oa = order(a);
          const ob = order(b);
          if (oa !== ob) return oa - ob;
          return b.id - a.id;
        });
        setRows(mapped);
      }
      cancelEditMode();
    } catch (e: any) {
      console.error('Save failed:', e.message);
    } finally {
      setSavingIds(new Set());
    }
  };

  const getPrimaryValue = (row: WorkoutRow): { value: string; label: string } | null => {
    if (row.exercise_id === CALORIES_EXERCISE_ID) {
      return row.calories != null ? { value: String(row.calories), label: 'KCAL' } : null;
    }
    if (row.exercise_id === FOOD_EXERCISE_ID) {
      return row.food_rating ? { value: row.food_rating.toUpperCase(), label: '' } : null;
    }
    if (row.km != null) {
      return { value: String(row.km), label: 'KM' };
    }
    return null;
  };

  const selectedRows = rows.filter(r => selectedIds.includes(r.id));

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: '#f2f2f2',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'JetBrains Mono', monospace",
        animation: 'wsSlideUp 0.25s ease',
      }}
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
          Workouts Data
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(26,26,26,0.45)', letterSpacing: '0.1em' }}>
            {(() => {
              const dates = new Set(rows.map(r => r.date));
              return dates.size;
            })()} DAYS
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#1a1a1a' }}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Select / action bar */}
      <div style={{
        display: 'flex', gap: '8px', padding: '12px 20px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }} onClick={() => setFilterOpen(false)}>
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
          {selectMode && selectedIds.length > 0 ? 'DESELECT' : 'SELECT'}
        </button>
        {selectMode && (
          <button
            onClick={() => setSelectedIds(rows.map(r => r.id))}
            style={{
              padding: '6px 14px', borderRadius: '999px',
              backgroundColor: selectedIds.length === rows.length ? '#1a1a1a' : 'rgba(0,0,0,0.06)',
              color: selectedIds.length === rows.length ? '#f2f2f2' : '#1a1a1a',
              border: 'none', cursor: 'pointer',
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ALL
          </button>
        )}

        {/* Filter by week pill */}
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setFilterOpen(o => !o)}
            style={{
              padding: '6px 14px', borderRadius: '999px',
              backgroundColor: weekFilter !== null ? '#1a1a1a' : 'rgba(0,0,0,0.06)',
              color: weekFilter !== null ? '#f2f2f2' : '#1a1a1a',
              border: 'none', cursor: 'pointer',
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex', alignItems: 'center', gap: '5px',
            }}
          >
            {weekFilter !== null ? `W${weekFilter}` : 'WEEK'}
            <span style={{ fontSize: '8px', opacity: 0.7 }}>{filterOpen ? '▲' : '▼'}</span>
          </button>
          {filterOpen && (() => {
            const weekSet = new Set<number>();
            rows.forEach(r => {
              const d = new Date(r.date + 'T00:00:00');
              weekSet.add(getISOWeek(d));
            });
            const weeks = Array.from(weekSet).sort((a, b) => b - a);
            return (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
                backgroundColor: '#f2f2f2', borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.08)',
                overflow: 'hidden', minWidth: '100px',
              }}>
                <div
                  onClick={() => { setWeekFilter(null); setFilterOpen(false); }}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: weekFilter === null ? '#FC4C02' : '#1a1a1a',
                    backgroundColor: weekFilter === null ? 'rgba(0,0,0,0.04)' : 'transparent',
                    borderBottom: weeks.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  ALL WEEKS
                </div>
                {weeks.map((w, i) => (
                  <div
                    key={w}
                    onClick={() => { setWeekFilter(w); setFilterOpen(false); }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer',
                      fontSize: '11px', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: weekFilter === w ? '#FC4C02' : '#1a1a1a',
                      backgroundColor: weekFilter === w ? 'rgba(0,0,0,0.04)' : 'transparent',
                      borderBottom: i < weeks.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    W{w}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
        {/* Type filter pill */}
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { setTypeFilterOpen(o => !o); setFilterOpen(false); }}
            style={{
              padding: '6px 14px', borderRadius: '999px',
              backgroundColor: typeFilter !== null ? '#1a1a1a' : 'rgba(0,0,0,0.06)',
              color: typeFilter !== null ? '#f2f2f2' : '#1a1a1a',
              border: 'none', cursor: 'pointer',
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex', alignItems: 'center', gap: '5px',
            }}
          >
            {typeFilter || 'FILTER'}
            <span style={{ fontSize: '8px', opacity: 0.7 }}>{typeFilterOpen ? '▲' : '▼'}</span>
          </button>
          {typeFilterOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
              backgroundColor: '#f2f2f2', borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.08)',
              overflow: 'hidden', minWidth: '120px',
            }}>
              <div
                onClick={() => { setTypeFilter(null); setTypeFilterOpen(false); }}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: typeFilter === null ? '#FC4C02' : '#1a1a1a',
                  backgroundColor: typeFilter === null ? 'rgba(0,0,0,0.04)' : 'transparent',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                ALL TYPES
              </div>
              {['CARDIO', 'FOOD', 'CALORIES'].map((opt, i, arr) => (
                <div
                  key={opt}
                  onClick={() => { setTypeFilter(opt); setTypeFilterOpen(false); }}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: typeFilter === opt ? '#FC4C02' : '#1a1a1a',
                    backgroundColor: typeFilter === opt ? 'rgba(0,0,0,0.04)' : 'transparent',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

        {!selectMode && weekFilter !== null && (
          <div style={{ marginLeft: 'auto' }} />
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(26,26,26,0.35)', fontSize: '12px' }}>
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(26,26,26,0.35)', fontSize: '12px' }}>
            No data in last 5 weeks
          </div>
        ) : (
          (() => {
            let filteredRows = weekFilter !== null
              ? rows.filter(r => {
                  const d = new Date(r.date + 'T00:00:00');
                  return getISOWeek(d) === weekFilter;
                })
              : rows;
            if (typeFilter === 'CARDIO') {
              filteredRows = filteredRows.filter(r => r.type === 'CARDIO');
            } else if (typeFilter === 'FOOD') {
              filteredRows = filteredRows.filter(r => r.exercise_id === FOOD_EXERCISE_ID);
            } else if (typeFilter === 'CALORIES') {
              filteredRows = filteredRows.filter(r => r.exercise_id === CALORIES_EXERCISE_ID);
            }
            const grouped: { date: string; rows: WorkoutRow[] }[] = [];
            filteredRows.forEach(r => {
              const last = grouped[grouped.length - 1];
              if (last && last.date === r.date) {
                last.rows.push(r);
              } else {
                grouped.push({ date: r.date, rows: [r] });
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
                  <div style={{ paddingTop: '8px', paddingBottom: '6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em',
                      color: '#1a1a1a', textTransform: 'uppercase',
                    }}>
                      {(() => {
                        const d = new Date(group.date + 'T00:00:00');
                        const day = d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
                        const date = d.getDate();
                        const month = MONTH_NAMES[d.getMonth()];
                        return `${day} ${date} ${month}`;
                      })()}
                    </span>
                    <span style={{
                      fontSize: '14px', fontWeight: 500, letterSpacing: '0.08em',
                      color: '#1a1a1a', opacity: 0.75, textTransform: 'uppercase',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      W{getISOWeek(new Date(group.date + 'T00:00:00'))}
                    </span>
                  </div>

                  {group.rows.map((row, actIdx) => {
                    const isLastInGroup = actIdx === group.rows.length - 1;
                    const isEditing = editing && selectedIds.includes(row.id);
                    const editVal = editValues[row.id];
                    const isSaving = savingIds.has(row.id);
                    const isDeleting = deletingId === row.id;
                    const showDeleteConfirm = deletingConfirmId === row.id;
                    const primary = getPrimaryValue(row);
                    const isMeasurement = row.type === 'MEASUREMENT';
                    const isTrackerRow = row.exercise_id === TRACKER_EXERCISE_ID;
                    const isCaloriesRow = row.exercise_id === CALORIES_EXERCISE_ID;
                    const isFoodRow = row.exercise_id === FOOD_EXERCISE_ID;
                    const isHighlighted = isMeasurement || isTrackerRow;

                    return (
                      <React.Fragment key={row.id}>
                        <div
                          onClick={() => {
                            if (!selectMode) setSelectMode(true);
                            toggleSelect(row.id);
                          }}
                          style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                          padding: '12px 20px',
                          margin: '0 -20px',
                          backgroundColor: isHighlighted ? 'rgba(0,0,0,0.03)' : 'transparent',
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
                              marginRight: '12px', marginTop: '16px',
                              border: selectedIds.includes(row.id) ? 'none' : '1.5px solid rgba(26,26,26,0.25)',
                              backgroundColor: selectedIds.includes(row.id) ? '#1a1a1a' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {selectedIds.includes(row.id) && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                          )}

                          {/* Left: type + name (swapped: type on top, name larger below) */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Type label — top row, smaller, grey */}
                            <div style={{
                              fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em',
                              color: 'rgba(26,26,26,0.5)',
                              textTransform: 'uppercase',
                              marginBottom: '3px',
                            }}>
                              {row.type}
                            </div>

                            {/* Exercise name — bottom row, larger */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '13px', fontWeight: 700, color: '#1a1a1a',
                                letterSpacing: '0.02em', whiteSpace: 'nowrap',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                maxWidth: '160px',
                              }}>
                                {row.exercise_name}
                              </span>
                              {row.new_entry === 'New' && (() => {
                                const today = new Date();
                                const d = new Date(row.date + 'T00:00:00');
                                const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                                return diff >= 0 && diff <= 1;
                              })() && (
                                <span style={{
                                  fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em',
                                  color: '#f2f2f2', backgroundColor: '#1a1a1a',
                                  padding: '2px 6px', borderRadius: '999px',
                                  textTransform: 'uppercase', flexShrink: 0,
                                }}>
                                  NEW
                                </span>
                              )}
                              {row.new_entry === 'Edit' && (
                                <span style={{
                                  fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em',
                                  color: '#1a1a1a', backgroundColor: 'rgba(0,0,0,0.1)',
                                  padding: '2px 6px', borderRadius: '999px',
                                  textTransform: 'uppercase', flexShrink: 0,
                                }}>
                                  EDIT
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: value */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                            {row.time && (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '11px', fontWeight: 500, color: '#1a1a1a', letterSpacing: '0.02em' }}>
                                  {(() => {
                                    const parts = String(row.time).split(':');
                                    if (parts.length !== 3) return row.time;
                                    const h = parseInt(parts[0], 10);
                                    const m = parseInt(parts[1], 10);
                                    return `${h * 60 + m}:${parts[2]}`;
                                  })()}
                                </div>
                                <div style={{ fontSize: '8px', color: 'rgba(26,26,26,0.4)', letterSpacing: '0.1em' }}>TIME</div>
                              </div>
                            )}
                            {primary && (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                                  {primary.value}
                                </div>
                                {primary.label && (
                                  <div style={{ fontSize: '8px', color: 'rgba(26,26,26,0.4)', letterSpacing: '0.1em' }}>{primary.label}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Edit row */}
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
                              }}>
                                <input
                                  type="text"
                                  value={editVal.date}
                                  onChange={e => handleEditChange(row.id, 'date', e.target.value)}
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
                            {/* Value input - changes based on exercise type */}
                            {isCaloriesRow ? (
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.75)', letterSpacing: '0.1em', marginBottom: '6px' }}>CALORIES</div>
                                <div style={{
                                  padding: '8px 10px', borderRadius: '10px',
                                  background: 'rgba(255,255,255,0.55)',
                                  backdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(255,255,255,0.3)',
                                }}>
                                  <input
                                    type="number"
                                    value={editVal.calories}
                                    onChange={e => handleEditChange(row.id, 'calories', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                      width: '100%', border: 'none', outline: 'none',
                                      backgroundColor: 'transparent',
                                      fontSize: '12px', fontWeight: 500,
                                      fontFamily: "'JetBrains Mono', monospace",
                                      color: '#1a1a1a',
                                    }}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            ) : isFoodRow ? (
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.75)', letterSpacing: '0.1em', marginBottom: '6px' }}>FOOD RATING</div>
                                <div style={{
                                  display: 'flex', gap: '6px',
                                }}>
                                  {['BAD', 'OK', 'GOOD'].map(rating => (
                                    <button
                                      key={rating}
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleEditChange(row.id, 'food_rating', editVal.food_rating === rating ? '' : rating);
                                      }}
                                      style={{
                                        flex: 1, padding: '8px 0', borderRadius: '8px',
                                        border: editVal.food_rating === rating ? '2px solid #1a1a1a' : '1px solid rgba(0,0,0,0.12)',
                                        backgroundColor: editVal.food_rating === rating ? '#1a1a1a' : 'rgba(255,255,255,0.55)',
                                        color: editVal.food_rating === rating ? '#fff' : '#1a1a1a',
                                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {rating}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.75)', letterSpacing: '0.1em', marginBottom: '6px' }}>KM</div>
                                <div style={{
                                  padding: '8px 10px', borderRadius: '10px',
                                  background: 'rgba(255,255,255,0.55)',
                                  backdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(255,255,255,0.3)',
                                }}>
                                  <input
                                    type="number"
                                    value={editVal.km}
                                    onChange={e => handleEditChange(row.id, 'km', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    step="0.1"
                                    min="0"
                                    style={{
                                      width: '100%', border: 'none', outline: 'none',
                                      backgroundColor: 'transparent',
                                      fontSize: '12px', fontWeight: 500,
                                      fontFamily: "'JetBrains Mono', monospace",
                                      color: '#1a1a1a',
                                    }}
                                    placeholder="0.0"
                                  />
                                </div>
                              </div>
                            )}
                            {/* Delete */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ height: '16px' }} />
                              {showDeleteConfirm ? (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleDeleteRow(row.id); }}
                                    disabled={isDeleting}
                                    style={{
                                      padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                      backgroundColor: '#b02828', color: '#fff',
                                      fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
                                      fontFamily: "'JetBrains Mono', monospace",
                                    }}
                                  >
                                    {isDeleting ? '...' : 'DELETE'}
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); setDeletingConfirmId(null); }}
                                    style={{
                                      padding: '6px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
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
                                  onClick={e => { e.stopPropagation(); setDeletingConfirmId(row.id); }}
                                  style={{
                                    padding: '6px 12px', borderRadius: '8px',
                                    border: '1px solid rgba(176,40,40,0.3)', cursor: 'pointer',
                                    backgroundColor: 'rgba(176,40,40,0.06)', color: '#b02828',
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

       {/* Bottom action bar */}
       {selectMode && (
         <div style={{
           padding: '12px 20px',
           paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
           borderTop: '1px solid rgba(0,0,0,0.06)',
           display: 'flex', gap: '8px', alignItems: 'center',
           backgroundColor: '#f2f2f2',
         }}>
           {editing ? (
             <>
               <button
                 onClick={handleSaveAllEdits}
                 disabled={savingIds.size > 0}
                 style={{
                   padding: '8px 20px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                   backgroundColor: savingIds.size > 0 ? 'rgba(0,0,0,0.3)' : '#1a1a1a',
                   color: '#f2f2f2',
                   fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                   textTransform: 'uppercase',
                   fontFamily: "'JetBrains Mono', monospace",
                 }}
               >
                 {savingIds.size > 0 ? `SAVING ${savingIds.size}...` : 'SAVE ALL'}
               </button>
               <button
                 onClick={cancelEditMode}
                 style={{
                   padding: '8px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                   backgroundColor: 'rgba(0,0,0,0.06)', color: '#1a1a1a',
                   fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                   textTransform: 'uppercase',
                   fontFamily: "'JetBrains Mono', monospace",
                   marginLeft: 'auto',
                 }}
               >
                 CANCEL
               </button>
             </>
           ) : (
             <>
               <button
                 onClick={enterEditMode}
                 disabled={selectedIds.length === 0}
                 style={{
                   padding: '8px 20px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                   backgroundColor: selectedIds.length > 0 ? '#1a1a1a' : 'rgba(0,0,0,0.08)',
                   color: selectedIds.length > 0 ? '#f2f2f2' : 'rgba(26,26,26,0.4)',
                   fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                   textTransform: 'uppercase',
                   fontFamily: "'JetBrains Mono', monospace",
                 }}
               >
                 EDIT SELECTED
               </button>
               <button
                 onClick={clearSelection}
                 style={{
                   padding: '8px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                   backgroundColor: 'rgba(0,0,0,0.06)', color: '#1a1a1a',
                   fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                   textTransform: 'uppercase',
                   fontFamily: "'JetBrains Mono', monospace",
                   marginLeft: 'auto',
                 }}
               >
                 CLEAR
               </button>
             </>
           )}
         </div>
       )}

      <style>{`
        @keyframes wsSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default WorkoutsData;