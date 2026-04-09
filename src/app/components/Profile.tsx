import React, { useState, useEffect } from 'react';
import { User, Download, RefreshCw, BarChart3, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Page } from '../../types';
import { supabase } from '../../lib/supabase';

interface Exercise {
  id: number;
  exercise_name: string;
  type: string;
  multiplier: number;
  info_notes: string | null;
  type2: string | null;
}

interface ProfileProps {
  onNavigate: (page: Page) => void;
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
};

export const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const [exportCount, setExportCount] = useState<number | null>(null);
  const [exportDates, setExportDates] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState('');

  // Exercise management
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [groupedExercises, setGroupedExercises] = useState<Record<string, Exercise[]>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExercise, setNewExercise] = useState({
    exercise_name: '',
    type: 'CHEST',
    type2: 'BAR',
    multiplier: 1,
    info_notes: '',
  });
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState('');

  const loadData = async () => {
    const { data } = await supabase
      .from('workouts')
      .select('date')
      .in('new_entry', ['New', 'Edit'])
      .order('date');

    if (data) {
      setExportCount(data.length);
      const distinct = [...new Set((data as any[]).map(r => r.date as string))].sort();
      setExportDates(distinct);
    } else {
      setExportCount(0);
      setExportDates([]);
    }
  };

  useEffect(() => { loadData(); }, []);

  const loadExercises = async () => {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('type')
      .order('exercise_name');
    if (data) {
      setExercises(data as Exercise[]);
      const grouped: Record<string, Exercise[]> = {};
      for (const ex of data as Exercise[]) {
        if (!grouped[ex.type]) grouped[ex.type] = [];
        grouped[ex.type].push(ex);
      }
      setGroupedExercises(grouped);
    }
  };

  useEffect(() => { loadExercises(); }, []);

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    setExportDone(false);
    try {
      const { data, error: err } = await supabase
        .from('workouts')
        .select('*, exercises(exercise_name)')
        .or("new_entry.ilike.new,new_entry.ilike.edit")
        .order('date');

      if (err) throw err;
      if (!data || data.length === 0) {
        setExportError('No new entries to export.');
        setExporting(false);
        return;
      }

      const XLSX = await import('xlsx');

      const rows = (data as any[]).map(r => {
        // Normalise time: old format was mm:ss:00, new is 00:mm:ss
        // Always output as 00:mm:ss (hh:mm:ss) so Excel reads it correctly
        let time = r.time ?? '';
        if (time) {
          const parts = time.split(':');
          if (parts.length === 3 && parts[0] !== '00') {
            // Old format mm:ss:00 → convert to 00:mm:ss
            time = `00:${parts[0]}:${parts[1]}`;
          }
        }
        return {
          DATE: r.date ? new Date(r.date + 'T12:00:00Z') : '',
          EXERCISE: r.exercises?.exercise_name ?? '',
          KM: r.km ?? '',
          CALORIES: r.calories ?? '',
          FOOD: r.food_rating ? String(r.food_rating).toUpperCase() : '',
          W1: r.w1 ?? '', R1: r.r1 ?? '',
          W2: r.w2 ?? '', R2: r.r2 ?? '',
          W3: r.w3 ?? '', R3: r.r3 ?? '',
          W4: r.w4 ?? '', R4: r.r4 ?? '',
          W5: r.w5 ?? '', R5: r.r5 ?? '',
          W6: r.w6 ?? '', R6: r.r6 ?? '',
          FAIL: r.fail ? String(r.fail).toUpperCase() : '',
          WEIGHT: r.bodyweight ?? '',
          'BODY FAT %': r.body_fat_percent ?? '',
          'MUSCLE MASS': r.muscle_mass ?? '',
          TIME: time,
          NEW_ENTRY: r.new_entry ?? '',
        };
      });

      const newRows = rows.filter(r => String(r.NEW_ENTRY).toLowerCase() === 'new');
      const editRows = rows.filter(r => String(r.NEW_ENTRY).toLowerCase() === 'edit');

      const applyDateFormat = (ws: any) => {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: 0 });
          if (ws[addr]) { ws[addr].z = 'DD/MM/YYYY'; ws[addr].t = 'n'; }
        }
      };

      const wb = XLSX.utils.book_new();

      if (newRows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(newRows, { cellDates: true });
        applyDateFormat(ws);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      }

      if (editRows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(editRows, { cellDates: true });
        applyDateFormat(ws);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet2');
      }
      XLSX.writeFile(wb, 'ImportKineData.xlsx');

      // Mark all exported rows as 'Exported'
      const ids = (data as any[]).map(r => r.id).filter(Boolean);
      if (ids.length > 0) {
        await supabase
          .from('workouts')
          .update({ new_entry: 'Exported' })
          .in('id', ids)
          .or("new_entry.ilike.new,new_entry.ilike.edit");
      }

      await loadData();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (e: any) {
      setExportError(e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const hasRows = (exportCount ?? 0) > 0;

  const handleAddExercise = async () => {
    if (!newExercise.exercise_name.trim()) {
      setAddError('Exercise name is required');
      return;
    }
    setAddError('');
    const { error } = await supabase
      .from('exercises')
      .insert([{
        exercise_name: newExercise.exercise_name.trim().toUpperCase(),
        type: newExercise.type,
        type2: newExercise.type2,
        multiplier: newExercise.multiplier,
        info_notes: newExercise.info_notes.trim() || null,
      }]);
    if (error) {
      setAddError(error.message);
      return;
    }
    setAddSuccess(true);
    setNewExercise({ exercise_name: '', type: 'CHEST', type2: 'BAR', multiplier: 1, info_notes: '' });
    setTimeout(() => setAddSuccess(false), 2000);
    await loadExercises();
  };

  const handleDeleteExercise = async (id: number) => {
    if (!confirm('Delete this exercise? This cannot be undone.')) return;
    await supabase.from('exercises').delete().eq('id', id);
    await loadExercises();
  };

  const toggleGroup = (type: string) => {
    setCollapsedGroups(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="space-y-6">
      {/* Athlete section */}
      <div className="flex flex-col items-center py-8">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <User size={40} color="#666" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">ATHLETE</h2>
        <p className="text-sm" style={{ color: '#666' }}>Member since 2026</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest active:scale-[0.97] transition-all"
          style={{ backgroundColor: '#1a1a1a', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          ↻ REFRESH
        </button>
      </div>

      {/* Export Data */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p style={{
          fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em',
          color: '#ffffff', textTransform: 'uppercase', marginBottom: '16px',
        }}>
          Export Data
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span style={{
              fontSize: '2.5rem', fontWeight: 900, lineHeight: 1,
              letterSpacing: '-0.03em',
              color: hasRows ? '#ffffff' : 'rgba(255,255,255,0.15)',
            }}>
              {exportCount ?? '—'}
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              new rows
            </span>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || !hasRows}
            className="flex items-center gap-2 font-black uppercase tracking-widest text-xs active:scale-95 duration-150"
            style={{
              padding: '10px 20px',
              borderRadius: '999px',
              backgroundColor: exportDone ? '#22c55e' : (hasRows ? '#ffffff' : '#1f1f1f'),
              color: exportDone ? '#fff' : (hasRows ? '#1a1a1a' : 'rgba(255,255,255,0.2)'),
              cursor: hasRows ? 'pointer' : 'default',
              transition: 'all 0.2s',
              boxShadow: hasRows ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
            }}
          >
            {exporting
              ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : exportDone
                ? <span>✓ Done</span>
                : <><Download size={13} /><span>Export</span></>
            }
          </button>
        </div>

        {exportDates.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {exportDates.map(d => (
              <span key={d} style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.01em',
              }}>
                {formatDate(d)}
              </span>
            ))}
          </div>
        )}

        {exportError && (
          <p className="mt-3" style={{ color: '#ff5050', fontSize: '0.75rem' }}>{exportError}</p>
        )}
      </div>

      {/* Data+ Analytics */}
      <button
        onClick={() => onNavigate('analytics')}
        className="w-full rounded-2xl p-5 flex items-center justify-between active:scale-[0.98] transition-all"
        style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-4">
          <BarChart3 size={22} color="#ffffff" />
          <span style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            textTransform: 'uppercase',
          }}>
            Data+
          </span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)' }}>›</div>
      </button>

      {/* Manage Exercises */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <p style={{
            fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em',
            color: '#ffffff', textTransform: 'uppercase', margin: 0,
          }}>
            Exercises
          </p>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
            {exercises.length} total
          </span>
        </div>

        {/* Add button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full mb-4 py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          style={{
            backgroundColor: showAddForm ? 'rgba(255,255,255,0.08)' : '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <Plus size={14} /> {showAddForm ? 'Cancel' : 'Add New Exercise'}
        </button>

        {/* Add form */}
        {showAddForm && (
          <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="space-y-3">
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Name</label>
                <input
                  type="text"
                  value={newExercise.exercise_name}
                  onChange={e => setNewExercise(p => ({ ...p, exercise_name: e.target.value }))}
                  placeholder="e.g. Bench Press"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Type</label>
                  <select
                    value={newExercise.type}
                    onChange={e => setNewExercise(p => ({ ...p, type: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#111',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  >
                    {['CHEST', 'BACK', 'LEGS', 'CARDIO', 'MEASUREMENT'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Type2</label>
                  <select
                    value={newExercise.type2}
                    onChange={e => setNewExercise(p => ({ ...p, type2: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#111',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  >
                    {['BAR', 'DUMB BELL', 'MACHINE', 'BODY WEIGHT'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Multiplier</label>
                  <input
                    type="number"
                    value={newExercise.multiplier}
                    onChange={e => setNewExercise(p => ({ ...p, multiplier: Number(e.target.value) }))}
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#111',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Notes</label>
                  <input
                    type="text"
                    value={newExercise.info_notes}
                    onChange={e => setNewExercise(p => ({ ...p, info_notes: e.target.value }))}
                    placeholder="Optional"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#111',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
              {addError && <p style={{ color: '#ff5050', fontSize: '0.75rem', margin: 0 }}>{addError}</p>}
              {addSuccess && <p style={{ color: '#22c55e', fontSize: '0.75rem', margin: 0 }}>✓ Added successfully</p>}
              <button
                onClick={handleAddExercise}
                className="w-full py-2.5 rounded-full font-black uppercase tracking-widest text-xs active:scale-95 duration-150"
                style={{ backgroundColor: '#ffffff', color: '#1a1a1a', marginTop: '4px' }}
              >
                Add Exercise
              </button>
            </div>
          </div>
        )}

        {/* Exercise list grouped by type */}
        {Object.entries(groupedExercises).map(([type, exs]) => (
          <div key={type} className="mb-3">
            <button
              onClick={() => toggleGroup(type)}
              className="w-full flex items-center justify-between py-2"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
              }}>
                {type} ({exs.length})
              </span>
              {collapsedGroups[type] ? <ChevronDown size={14} color="rgba(255,255,255,0.3)" /> : <ChevronUp size={14} color="rgba(255,255,255,0.3)" />}
            </button>
            {!collapsedGroups[type] && (
              <div className="mt-1 space-y-1">
                {exs.map(ex => (
                  <div key={ex.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>{ex.exercise_name}</span>
                      {ex.type2 && <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>{ex.type2}</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteExercise(ex.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={12} color="rgba(255,255,255,0.2)" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
