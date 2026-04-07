import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const TRACKER_EXERCISE_ID = 82;
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_ABBREVS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getWeekNum = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getEditableDays = (): Date[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
};

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtEditLabel = (d: Date): string =>
  `${DAY_ABBREVS[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const TrackerEditSheet: React.FC<Props> = ({ onClose, onSaved }) => {
  const editableDays = getEditableDays();
  const [editRowValues, setEditRowValues] = useState<string[]>(Array(7).fill(''));
  const [editSaving, setEditSaving] = useState(false);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const loadValues = async () => {
      const dateStrings = editableDays.map(d => fmtDate(d));
      const { data } = await supabase
        .from('workouts')
        .select('date, km')
        .eq('type', 'CARDIO')
        .eq('exercise_id', TRACKER_EXERCISE_ID)
        .in('date', dateStrings);

      const valMap: Record<string, string> = {};
      if (data) {
        for (const row of data as any[]) {
          if (row.km != null) valMap[row.date] = String(row.km);
        }
      }
      setEditRowValues(dateStrings.map(ds => valMap[ds] || ''));
    };
    loadValues();
  }, []);

  const handleSave = async () => {
    setEditSaving(true);
    for (let i = 0; i < 7; i++) {
      const raw = editRowValues[i].trim();
      if (raw === '') continue;
      const val = parseFloat(raw);
      if (isNaN(val) || val < 0) continue;

      const dateStr = fmtDate(editableDays[i]);
      const barDate = editableDays[i];
      const weekNum = getWeekNum(barDate);
      const dayName = DAY_NAMES[barDate.getDay()];

      const { data: existing } = await supabase
        .from('workouts')
        .select('id')
        .eq('date', dateStr)
        .eq('type', 'CARDIO')
        .eq('exercise_id', TRACKER_EXERCISE_ID)
        .maybeSingle();

      if (existing) {
        await supabase.from('workouts').update({ km: val, new_entry: 'Edit' }).eq('id', existing.id);
      } else if (val > 0) {
        await supabase.from('workouts').insert({
          date: dateStr,
          week: weekNum,
          day: dayName,
          type: 'CARDIO',
          exercise_id: TRACKER_EXERCISE_ID,
          km: val,
          total_score_k: null,
          new_entry: 'New',
          source: 'app',
        });
      }
    }
    setEditSaving(false);
    onSaved();
    onClose();
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
            Edit Tracker
          </p>
          {/* Running man icon */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="3.5" r="1.5" fill="#000000" />
            <path
              d="M10.5 8.5L13 6l2.5 2.5-2 2 2 3H18v2h-3.5l-2-3.5-1.5 1.5V15H9v-4l1.5-2.5zM9 15l-1.5 4H9l1-2.5L11 18h1.5l-1.5-3H9z"
              fill="#000000"
            />
          </svg>
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {editableDays.map((day, i) => {
            const isFocused = focusedRow === i;
            return (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: isFocused ? '#e8e8e3' : '#eaeae5',
                  borderRadius: 12,
                  padding: '10px 14px',
                  transition: 'background-color 0.15s',
                }}
              >
                <span style={{
                  fontSize: '12px', fontWeight: 900,
                  color: '#000000',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  minWidth: 90,
                }}>
                  {fmtEditLabel(day)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    ref={el => { inputRefs.current[i] = el; }}
                    type="number"
                    inputMode="decimal"
                    placeholder="—"
                    value={editRowValues[i]}
                    onFocus={() => setFocusedRow(i)}
                    onBlur={() => setFocusedRow(null)}
                    onChange={e => {
                      const vals = [...editRowValues];
                      vals[i] = e.target.value;
                      setEditRowValues(vals);
                    }}
                    style={{
                      width: 72,
                      textAlign: 'right',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '15px',
                      fontWeight: 900,
                      color: '#000000',
                      fontFamily: 'inherit',
                    }}
                  />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#888', letterSpacing: '0.08em' }}>KM</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={editSaving}
          style={{
            marginTop: 18,
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            border: 'none',
            backgroundColor: '#000000',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 900,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: editSaving ? 'not-allowed' : 'pointer',
            opacity: editSaving ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {editSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default TrackerEditSheet;
