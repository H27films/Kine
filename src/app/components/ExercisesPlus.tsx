import React, { useState, useRef, useEffect } from 'react';
import { Dumbbell, Plus, ChevronDown } from 'lucide-react';
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
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [name, setName] = useState('');
  const [type, setType] = useState('CHEST');
  const [type2, setType2] = useState('BAR');
  const [multiplier, setMultiplier] = useState('1');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const rows = [
    { label: 'Name', value: name, onChange: setName, type: 'text' as const, placeholder: 'Fly Dumbbell' },
    { label: 'Type', value: type, onChange: setType, type: 'dropdown' as const, options: TYPE_OPTIONS },
    { label: 'Type2', value: type2, onChange: setType2, type: 'dropdown' as const, options: TYPE2_OPTIONS },
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

  const selectOption = (rowIdx: number, option: string) => {
    rows[rowIdx].onChange(option);
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
        <div ref={dropdownRef} style={{ display: 'flex', flexDirection: 'column', marginBottom: 28, position: 'relative' }}>
          {rows.map((row, i) => {
            const isFocused = focusedIdx === i;
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

                  {row.type === 'dropdown' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontSize: isFocused ? '16px' : '13px',
                        fontWeight: 400,
                        letterSpacing: '0.15em',
                        color: '#000000',
                        textAlign: 'right',
                        transition: 'font-size 0.15s ease',
                      }}>
                        {row.value}
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
                        onFocus={() => { setFocusedIdx(i); setOpenDropdown(null); }}
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

                {/* Custom dropdown */}
                {row.type === 'dropdown' && isOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    backgroundColor: '#ffffff',
                    borderRadius: 12,
                    overflow: 'hidden',
                    zIndex: 50,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    minWidth: 140,
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}>
                    {row.options?.map((opt, j) => (
                      <div
                        key={opt}
                        onClick={(e) => { e.stopPropagation(); selectOption(i, opt); }}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: row.value === opt ? 700 : 400,
                          color: '#000000',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          backgroundColor: row.value === opt ? 'rgba(0,0,0,0.06)' : 'transparent',
                          borderBottom: j < (row.options?.length ?? 0) - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {/* Divider */}
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
