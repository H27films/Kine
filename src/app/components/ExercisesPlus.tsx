import React, { useState, useEffect } from 'react';
import { Dumbbell, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Exercise {
  id: number;
  exercise_name: string;
  type: string;
  multiplier: number;
  info_notes: string | null;
  type2: string | null;
}

const ExercisesPlus: React.FC = () => {
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
    <div>
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full rounded-2xl p-5 flex items-center justify-between active:scale-[0.98] transition-all"
        style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-4">
          <Dumbbell size={22} color="#ffffff" />
          <span style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            textTransform: 'uppercase',
          }}>
            Exercises+
          </span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)' }}>{showAddForm ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
      </button>

      {showAddForm && (
        <div className="mt-3 rounded-2xl p-5" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Add form */}
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
      )}
    </div>
  );
};

export default ExercisesPlus;
