import React, { useState, useRef, useEffect } from 'react';
import { Dumbbell, Save, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_OPTIONS = ['CHEST', 'BACK', 'LEGS', 'CARDIO'];
const TYPE2_OPTIONS = ['BAR', 'DUMB BELL', 'MACHINE', 'BODY WEIGHT'];
const FAVOURITE_OPTIONS = ['', 'yes'];

const ExercisesEdit: React.FC<Props> = ({ onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1: select type
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [typeOpen, setTypeOpen] = useState(false);

  // Step 2: select exercise
  const [exercises, setExercises] = useState<{id: number; name: string; type2: string; multiplier: number; favourite: string; notes: string}[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);

  // Edit fields
  const [name, setName] = useState('');
  const [type2, setType2] = useState('BAR');
  const [multiplier, setMultiplier] = useState('1');
  const [favourite, setFavourite] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setTypeOpen(false);
        setExerciseOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch exercises when type is selected
  useEffect(() => {
    if (!selectedType) {
      setExercises([]);
      setSelectedExerciseId(null);
      setSelectedExerciseName('');
      return;
    }
    const load = async () => {
      setLoadingExercises(true);
      const { data } = await supabase
        .from('exercises')
        .select('id, exercise_name, type2, multiplier, favourite, info_notes')
        .eq('type', selectedType)
        .order('exercise_name');
      if (data) {
        setExercises(data.map((r: any) => ({
          id: r.id,
          name: r.exercise_name,
          type2: r.type2 || 'BAR',
          multiplier: r.multiplier || 1,
          favourite: r.favourite || '',
          notes: r.info_notes || '',
        })));
      } else {
        setExercises([]);
      }
      setLoadingExercises(false);
    };
    load();
  }, [selectedType]);

  // Populate fields when exercise is selected
  useEffect(() => {
    if (selectedExerciseId) {
      const ex = exercises.find(e => e.id === selectedExerciseId);
      if (ex) {
        setName(ex.name);
        setType2(ex.type2);
        setMultiplier(String(ex.multiplier));
        setFavourite(ex.favourite);
        setNotes(ex.notes);
      }
    } else {
      setName('');
      setType2('BAR');
      setMultiplier('1');
      setFavourite('');
      setNotes('');
    }
  }, [selectedExerciseId, exercises]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!selectedExerciseId) {
      setError('No exercise selected');
      return;
    }
    setError('');
    setSaving(true);

    const { error: err } = await supabase
      .from('exercises')
      .update({
        exercise_name: name.trim().toUpperCase(),
        type2,
        multiplier: parseFloat(multiplier) || 1,
        favourite: favourite || null,
        info_notes: notes.trim() || null,
      })
      .eq('id', selectedExerciseId);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onSaved();
      onClose();
    }, 800);
  };

  const selectType = (type: string) => {
    setSelectedType(type);
    setSelectedExerciseId(null);
    setSelectedExerciseName('');
    setTypeOpen(false);
  };

  const selectExercise = (id: number, name: string) => {
    setSelectedExerciseId(id);
    setSelectedExerciseName(name);
    setExerciseOpen(false);
  };

  const editRows = [
    { label: 'Name', value: name, onChange: setName, type: 'text' as const, placeholder: 'Fly Dumbbell' },
    { label: 'Type2', value: type2, onChange: setType2, type: 'dropdown' as const, options: TYPE2_OPTIONS },
    { label: 'Multiplier', value: multiplier, onChange: setMultiplier, type: 'number' as const, placeholder: '1' },
    { label: 'Favourite', value: favourite, onChange: setFavourite, type: 'dropdown' as const, options: FAVOURITE_OPTIONS },
    { label: 'Notes', value: notes, onChange: setNotes, type: 'text' as const, placeholder: 'Optional' },
  ];

  const selectOption = (rowIdx: number, option: string) => {
    editRows[rowIdx].onChange(option);
    setOpenDropdown(null);
    inputRefs.current[rowIdx]?.focus();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute', bottom: '0px', left: '10px', right: '10px',
          backgroundColor: '#F2F2ED',
          borderRadius: '20px 20px 0 0',
          padding: '24px 24px 32px',
          fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{
            fontSize: '14px', fontWeight: 900,
            color: '#000000',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            margin: 0,
          }}>
            Edit Exercise
          </p>
          <Dumbbell size={22} color="#000000" />
        </div>

        <div ref={dropdownRef} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Type selector */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => { setTypeOpen(!typeOpen); setExerciseOpen(false); setOpenDropdown(null); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 11, paddingBottom: 11,
                cursor: 'pointer',
              }}
            >
              <span style={{
                fontSize: '11px', fontWeight: 700,
                color: '#000000', letterSpacing: '0.2em', textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                Type
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  fontSize: '13px', fontWeight: 400,
                  letterSpacing: '0.15em', color: selectedType ? '#000000' : 'rgba(0,0,0,0.3)',
                  textAlign: 'right',
                }}>
                  {selectedType || 'SELECT'}
                </span>
                <ChevronDown size={14} color="rgba(0,0,0,0.3)" style={{ transition: 'transform 0.2s', transform: typeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </div>
            </div>
            {typeOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0,
                backgroundColor: '#F2F2ED', borderRadius: 12, overflow: 'hidden',
                zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                minWidth: 140, border: '1px solid rgba(0,0,0,0.08)',
              }}>
                {TYPE_OPTIONS.map((opt, j) => (
                  <div
                    key={opt}
                    onClick={(e) => { e.stopPropagation(); selectType(opt); }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', fontSize: '12px',
                      fontWeight: selectedType === opt ? 700 : 400,
                      color: '#000000', letterSpacing: '0.1em', textTransform: 'uppercase',
                      backgroundColor: selectedType === opt ? 'rgba(0,0,0,0.06)' : 'transparent',
                      borderBottom: j < TYPE_OPTIONS.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
            <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
          </div>

          {/* Exercise selector */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => { if (exercises.length > 0) { setExerciseOpen(!exerciseOpen); setTypeOpen(false); setOpenDropdown(null); } }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 11, paddingBottom: 11,
                cursor: exercises.length > 0 ? 'pointer' : 'default',
              }}
            >
              <span style={{
                fontSize: '11px', fontWeight: 700,
                color: '#000000', letterSpacing: '0.2em', textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                Exercise
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {loadingExercises ? (
                  <span style={{ fontSize: '12px', color: 'rgba(0,0,0,0.3)' }}>Loading...</span>
                ) : (
                  <>
                    <span style={{
                      fontSize: '13px', fontWeight: 400,
                      letterSpacing: '0.15em', color: selectedExerciseName ? '#000000' : 'rgba(0,0,0,0.3)',
                      textAlign: 'right',
                    }}>
                      {selectedExerciseName || 'SELECT'}
                    </span>
                    {exercises.length > 0 && <ChevronDown size={14} color="rgba(0,0,0,0.3)" style={{ transition: 'transform 0.2s', transform: exerciseOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />}
                  </>
                )}
              </div>
            </div>
            {exerciseOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, left: 0,
                backgroundColor: '#F2F2ED', borderRadius: 12, overflow: 'hidden',
                zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.08)',
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                {exercises.map((ex, j) => (
                  <div
                    key={ex.id}
                    onClick={(e) => { e.stopPropagation(); selectExercise(ex.id, ex.name); }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', fontSize: '12px',
                      fontWeight: selectedExerciseId === ex.id ? 700 : 400,
                      color: '#000000', letterSpacing: '0.1em', textTransform: 'uppercase',
                      backgroundColor: selectedExerciseId === ex.id ? 'rgba(0,0,0,0.06)' : 'transparent',
                      borderBottom: j < exercises.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {ex.name}
                  </div>
                ))}
              </div>
            )}
            <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
          </div>

          {/* Edit fields */}
          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
            <p style={{
              fontSize: '10px', fontWeight: 700,
              color: 'rgba(0,0,0,0.35)',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              margin: 0,
            }}>
              Edit Fields
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28, position: 'relative' }}>
            {editRows.map((row, i) => {
              const isOpen = openDropdown === i;
              return (
                <div key={i} style={{ position: 'relative' }}>
                  <div
                    onClick={() => {
                      inputRefs.current[i]?.focus();
                      if (row.type === 'dropdown') setOpenDropdown(isOpen ? null : i);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: 11, paddingBottom: 11,
                      cursor: 'text',
                    }}
                  >
                    <span style={{
                      fontSize: '11px', fontWeight: 700,
                      color: '#000000', letterSpacing: '0.2em', textTransform: 'uppercase',
                      flexShrink: 0,
                    }}>
                      {row.label}
                    </span>

                    {row.type === 'dropdown' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontSize: '13px', fontWeight: 400,
                          letterSpacing: '0.15em', color: '#000000',
                          textAlign: 'right',
                        }}>
                          {row.value === '' ? '—' : row.value}
                        </span>
                        <ChevronDown size={14} color="rgba(0,0,0,0.3)" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          ref={el => { inputRefs.current[i] = el; }}
                          type={row.type === 'number' ? 'number' : 'text'}
                          inputMode={row.type === 'number' ? 'decimal' : 'text'}
                          value={row.value}
                          onChange={e => row.onChange(e.target.value)}
                          onFocus={() => setOpenDropdown(null)}
                          placeholder={row.placeholder}
                          style={{
                            background: 'none', border: 'none', outline: 'none',
                            fontFamily: 'inherit', fontSize: '13px', fontWeight: 400,
                            letterSpacing: '0.15em',
                            color: row.value ? '#000000' : 'rgba(0,0,0,0.3)',
                            textAlign: 'right', width: 140, padding: 0,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Custom dropdown */}
                  {row.type === 'dropdown' && isOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0,
                      backgroundColor: '#F2F2ED', borderRadius: 12, overflow: 'hidden',
                      zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      minWidth: 140, border: '1px solid rgba(0,0,0,0.08)',
                    }}>
                      {row.options?.map((opt, j) => (
                        <div
                          key={opt}
                          onClick={(e) => { e.stopPropagation(); selectOption(i, opt); }}
                          style={{
                            padding: '10px 14px', cursor: 'pointer', fontSize: '12px',
                            fontWeight: row.value === opt ? 700 : 400,
                            color: '#000000', letterSpacing: '0.1em', textTransform: 'uppercase',
                            backgroundColor: row.value === opt ? 'rgba(0,0,0,0.06)' : 'transparent',
                            borderBottom: j < (row.options?.length ?? 0) - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                          }}
                        >
                          {opt === '' ? '—' : opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Divider */}
                  {i < editRows.length - 1 && (
                    <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && <p style={{ color: '#ff5050', fontSize: '11px', margin: '0 0 16px 0', fontWeight: 700 }}>{error}</p>}
        {success && <p style={{ color: '#22c55e', fontSize: '11px', margin: '0 0 16px 0', fontWeight: 700 }}>✓ Saved</p>}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !selectedExerciseId}
          style={{
            width: '100%', padding: '12px',
            backgroundColor: selectedExerciseId ? '#000000' : 'rgba(0,0,0,0.08)',
            color: selectedExerciseId ? '#ffffff' : '#999',
            borderRadius: 999, border: 'none',
            fontSize: '11px', fontWeight: 900,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            cursor: selectedExerciseId ? 'pointer' : 'default',
            opacity: saving ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default ExercisesEdit;