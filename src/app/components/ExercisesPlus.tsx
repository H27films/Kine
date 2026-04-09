import React, { useState, useRef } from 'react';
import { Dumbbell, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_OPTIONS = ['CHEST', 'BACK', 'LEGS', 'CARDIO', 'MEASUREMENT'];
const TYPE2_OPTIONS = ['BAR', 'DUMB BELL', 'MACHINE', 'BODY WEIGHT'];

const ExercisesPlus: React.FC<Props> = ({ onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | HTMLSelectElement | null)[]>([]);

  const [name, setName] = useState('');
  const [type, setType] = useState('CHEST');
  const [type2, setType2] = useState('BAR');
  const [multiplier, setMultiplier] = useState('1');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const rows = [
    { label: 'Name', value: name, onChange: setName, type: 'text' as const, placeholder: 'e.g. Bench Press' },
    { label: 'Type', value: type, onChange: setType, type: 'select' as const, options: TYPE_OPTIONS },
    { label: 'Type2', value: type2, onChange: setType2, type: 'select' as const, options: TYPE2_OPTIONS },
    { label: 'Multiplier', value: multiplier, onChange: setMultiplier, type: 'number' as const, placeholder: '1' },
    { label: 'Notes', value: notes, onChange: setNotes, type: 'text' as const, placeholder: 'Optional' },
  ];

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setError('');
    setSaving(true);

    const { error: err } = await supabase
      .from('exercises')
      .insert([{
        exercise_name: name.trim().toUpperCase(),
        type,
        type2,
        multiplier: parseFloat(multiplier) || 1,
        info_notes: notes.trim() || null,
      }]);

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
            New Exercise
          </p>
          <Dumbbell size={22} color="#000000" />
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
          {rows.map((row, i) => {
            const isFocused = focusedIdx === i;
            return (
              <div key={i}>
                <div
                  onClick={() => inputRefs.current[i]?.focus()}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: isFocused ? 16 : 11,
                    paddingBottom: isFocused ? 16 : 11,
                    cursor: 'text',
                    transition: 'padding 0.15s ease',
                  }}
                >
                  <span style={{
                    fontSize: isFocused ? '13px' : '11px',
                    fontWeight: 700,
                    color: '#000000',
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    flexShrink: 0,
                    transition: 'font-size 0.15s ease',
                  }}>
                    {row.label}
                  </span>

                  {row.type === 'select' ? (
                    <select
                      ref={el => { inputRefs.current[i] = el; }}
                      value={row.value as string}
                      onChange={e => row.onChange(e.target.value)}
                      onFocus={() => setFocusedIdx(i)}
                      onBlur={() => setFocusedIdx(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        fontFamily: 'inherit',
                        fontSize: isFocused ? '16px' : '13px',
                        fontWeight: 400,
                        letterSpacing: '0.15em',
                        color: '#000000',
                        textAlign: 'right',
                        width: 140,
                        padding: 0,
                        transition: 'font-size 0.15s ease',
                        cursor: 'pointer',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                      }}
                    >
                      {row.options?.map(opt => (
                        <option key={opt} value={opt} style={{ color: '#000' }}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        ref={el => { inputRefs.current[i] = el as any; }}
                        type={row.type === 'number' ? 'number' : 'text'}
                        inputMode={row.type === 'number' ? 'decimal' : 'text'}
                        value={row.value}
                        onChange={e => row.onChange(e.target.value)}
                        onFocus={() => setFocusedIdx(i)}
                        onBlur={() => setFocusedIdx(null)}
                        placeholder={row.placeholder}
                        style={{
                          background: 'none',
                          border: 'none',
                          outline: 'none',
                          fontFamily: 'inherit',
                          fontSize: isFocused ? '16px' : '13px',
                          fontWeight: 400,
                          letterSpacing: '0.15em',
                          color: row.value ? '#000000' : 'rgba(0,0,0,0.3)',
                          textAlign: 'right',
                          width: 140,
                          padding: 0,
                          transition: 'font-size 0.15s ease',
                        }}
                      />
                    </div>
                  )}
                </div>
                {i < rows.length - 1 && (
                  <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
                )}
              </div>
            );
          })}
        </div>

        {error && <p style={{ color: '#ff5050', fontSize: '11px', margin: '0 0 16px 0', fontWeight: 700 }}>{error}</p>}
        {success && <p style={{ color: '#22c55e', fontSize: '11px', margin: '0 0 16px 0', fontWeight: 700 }}>✓ Added</p>}

        {/* Add Exercise button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '12px',
            backgroundColor: '#000000', color: '#ffffff',
            borderRadius: 999, border: 'none',
            fontSize: '11px', fontWeight: 900,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            cursor: 'pointer', opacity: saving ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Plus size={14} /> {saving ? 'Adding...' : 'Add Exercise'}
        </button>
      </div>
    </div>
  );
};

export default ExercisesPlus;
