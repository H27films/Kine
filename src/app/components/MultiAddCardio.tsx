import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { supabase, Exercise, todayStr, getISOWeek, getDayName, recalculateDailyTotals } from '../../lib/supabase';

interface MultiAddRow {
  exerciseName: string;
  distance: string;
  minutes: string;
  seconds: string;
  calories: string;
}

interface MultiAddCardioProps {
  nonTrackerExercises: Exercise[];
  calorieConversion: number;
  onSaved: () => void;
}

const MultiAddCardio: React.FC<MultiAddCardioProps> = ({ nonTrackerExercises, calorieConversion, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MultiAddRow[]>(
    () => Array.from({ length: 3 }, () => ({ exerciseName: 'RUNNING', distance: '', minutes: '', seconds: '', calories: '' }))
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dropdownIdx, setDropdownIdx] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside handler for dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownIdx(null);
      }
    };
    if (dropdownIdx !== null) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [dropdownIdx]);

  const COL_TEMPLATE = '100px 1fr 1fr 60px';

  const handleLogAll = async () => {
    const hasAny = rows.some(r => parseFloat(r.distance) > 0);
    if (!hasAny) return;
    setSaving(true);
    try {
      const today = todayStr();
      const todayDate = new Date(today + 'T12:00:00+08:00');
      const week = getISOWeek(todayDate);
      const day = getDayName(todayDate);

      for (const row of rows) {
        const km = parseFloat(row.distance);
        if (!km || km <= 0) continue;
        const exercise = nonTrackerExercises.find(
          e => e.exercise_name?.toUpperCase() === row.exerciseName
        );
        if (!exercise) continue;
        const totalCardio = +(km * Number(exercise.multiplier)).toFixed(2);
        const timeStr = (row.minutes || row.seconds)
          ? `00:${(row.minutes || '0').padStart(2,'0')}:${(row.seconds || '0').padStart(2,'0')}`
          : null;
        const workoutCalories = parseFloat(row.calories);
        await supabase.from('workouts').insert({
          date: today, week, day, type: 'CARDIO',
          exercise_id: exercise.id,
          km, total_cardio: totalCardio,
          multiplier: exercise.multiplier,
          time: timeStr,
          workout_calories: workoutCalories > 0 ? workoutCalories : null,
          total_score_k: Math.round(totalCardio * 1000),
          new_entry: 'New', source: 'app',
        });
      }

      await recalculateDailyTotals(today);
      onSaved();
      setSaveSuccess(true);
      setRows(Array.from({ length: 3 }, () => ({ exerciseName: 'RUNNING', distance: '', minutes: '', seconds: '', calories: '' })));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      console.error('Multi Add save error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4" style={{ marginTop: '-4px' }}>
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a1a1a', fontFamily: "'Archivo', sans-serif" }}>
          Multi Add
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'rgba(26,26,26,0.6)',
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: COL_TEMPLATE, gap: '8px', padding: '0 2px' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a1a1a' }}>Type</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a1a1a', textAlign: 'center' }}>KM</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a1a1a', textAlign: 'center' }}>Time</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a1a1a', textAlign: 'center' }}>Cal</span>
          </div>

          {rows.map((row, i) => {
            const isCycle = row.exerciseName === 'CYCLE';
            const calNum = parseFloat(row.calories);
            const autoKm = isCycle && calNum > 0 && calorieConversion > 0
              ? +(calNum / calorieConversion).toFixed(1)
              : null;
            const dropdownOpen = dropdownIdx === i;

            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: COL_TEMPLATE, gap: '8px', alignItems: 'center' }}>
                {/* Custom Type dropdown */}
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => setDropdownIdx(dropdownOpen ? null : i)}
                    ref={dropdownIdx === i ? dropdownRef : null}
                    style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '8px 8px',
                      cursor: 'pointer', color: '#1a1a1a', fontFamily: "'Archivo', sans-serif",
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(0,0,0,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px',
                      userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.exerciseName}</span>
                    <ChevronDown size={10} strokeWidth={2.5} style={{ flexShrink: 0, color: 'rgba(26,26,26,0.4)', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                  {dropdownOpen && (
                    <div
                      ref={dropdownIdx === i ? dropdownRef : null}
                      style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                        backgroundColor: '#f2f2f2', borderRadius: '10px', overflow: 'hidden',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      {nonTrackerExercises.map(ex => {
                        const name = ex.exercise_name?.toUpperCase() || '';
                        return (
                          <div
                            key={ex.id}
                            onClick={() => {
                              const newRows = [...rows];
                              newRows[i] = { ...newRows[i], exerciseName: name, calories: '' };
                              setRows(newRows);
                              setDropdownIdx(null);
                            }}
                            style={{
                              padding: '8px 12px', cursor: 'pointer',
                              backgroundColor: name === row.exerciseName ? 'rgba(0,0,0,0.06)' : 'transparent',
                              color: '#1a1a1a', fontSize: '0.75rem', fontWeight: 600,
                              fontFamily: "'Archivo', sans-serif", textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {name}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Distance */}
                <input
                  type="text"
                  inputMode="decimal"
                  value={autoKm !== null ? String(autoKm) : row.distance}
                  onChange={e => {
                    const newRows = [...rows];
                    newRows[i] = { ...newRows[i], distance: e.target.value };
                    setRows(newRows);
                  }}
                  placeholder="0.0"
                  style={{
                    fontSize: '0.85rem', fontWeight: 700, padding: '6px 4px',
                    border: 'none', borderBottom: '1px solid rgba(0,0,0,0.1)',
                    backgroundColor: 'transparent', color: '#1a1a1a',
                    width: '100%', outline: 'none', textAlign: 'center',
                  }}
                />

                {/* Time */}
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.minutes}
                    onChange={e => {
                      const newRows = [...rows];
                      newRows[i] = { ...newRows[i], minutes: e.target.value };
                      setRows(newRows);
                    }}
                    placeholder="--"
                    style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '6px 2px',
                      border: 'none', borderBottom: '1px solid rgba(0,0,0,0.1)',
                      backgroundColor: 'transparent', color: '#1a1a1a',
                      width: '28px', outline: 'none', textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: '0.55rem', color: 'rgba(26,26,26,0.4)', fontWeight: 600 }}>:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.seconds}
                    onChange={e => {
                      const newRows = [...rows];
                      newRows[i] = { ...newRows[i], seconds: e.target.value };
                      setRows(newRows);
                    }}
                    placeholder="--"
                    style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '6px 2px',
                      border: 'none', borderBottom: '1px solid rgba(0,0,0,0.1)',
                      backgroundColor: 'transparent', color: '#1a1a1a',
                      width: '28px', outline: 'none', textAlign: 'center',
                    }}
                  />
                </div>

                {/* Calories — editable for all types, saves to workout_calories */}
                <input
                  type="text"
                  inputMode="numeric"
                  value={row.calories}
                  onChange={e => {
                    const newRows = [...rows];
                    newRows[i] = { ...newRows[i], calories: e.target.value };
                    setRows(newRows);
                  }}
                  placeholder="0"
                  style={{
                    fontSize: '0.75rem', fontWeight: 600, padding: '6px 4px',
                    border: 'none', borderBottom: '1px solid rgba(0,0,0,0.1)',
                    backgroundColor: 'transparent',
                    color: '#1a1a1a',
                    width: '100%', outline: 'none', textAlign: 'center',
                  }}
                />
              </div>
            );
          })}

          {/* Spacer before buttons */}
          <div style={{ height: '8px' }} />

          {/* Add row button */}
          <button
            onClick={() => setRows(prev => [...prev, { exerciseName: 'RUNNING', distance: '', minutes: '', seconds: '', calories: '' }])}
            style={{
              alignSelf: 'flex-start', padding: '4px 12px', borderRadius: '999px',
              border: '1px solid rgba(0,0,0,0.12)', backgroundColor: 'transparent',
              color: '#1a1a1a', fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: "'Archivo', sans-serif",
            }}
          >
            + Add Row
          </button>

          {/* Log All button */}
          <button
            onClick={handleLogAll}
            disabled={saving}
            style={{
              alignSelf: 'flex-start', padding: '8px 20px', borderRadius: '999px',
              border: 'none', backgroundColor: '#1a1a1a', color: '#ffffff',
              fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em',
              textTransform: 'uppercase', cursor: 'pointer', opacity: saving ? 0.6 : 1,
              fontFamily: "'Archivo', sans-serif",
            }}
          >
            {saving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Log All'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MultiAddCardio;