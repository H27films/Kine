import React, { useState, useEffect, useRef } from 'react';
import { supabase, getNewEntryStatus, recalculateDailyTotals } from '../../lib/supabase';

const TRACKER_EXERCISE_ID = 82;
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_ABBREVS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

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
  const originalRowValues = useRef<string[]>(Array(7).fill(''));

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
      const loaded = dateStrings.map(ds => valMap[ds] || '');
      originalRowValues.current = loaded;
      setEditRowValues(loaded);
    };
    loadValues();
  }, []);

  const handleSave = async () => {
    setEditSaving(true);
    const savedDates = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const raw = editRowValues[i].trim();
      if (raw === '') continue;
      const val = parseFloat(raw);
      if (isNaN(val) || val < 0) continue;

      // Only save if the value actually changed from what was loaded
      const origVal = parseFloat(originalRowValues.current[i]);
      if (!isNaN(origVal) && val === origVal) continue;

      const dateStr = fmtDate(editableDays[i]);
      const barDate = editableDays[i];
      const weekNum = getWeekNum(barDate);
      const dayName = DAY_ABBREVS[barDate.getDay()];

      const { data: existing } = await supabase
        .from('workouts')
        .select('id, km, total_cardio')
        .eq('date', dateStr)
        .eq('type', 'CARDIO')
        .eq('exercise_id', TRACKER_EXERCISE_ID)
        .maybeSingle();

      const kmChanged = isNaN(origVal) || val !== origVal;
      const tcNeedsUpdate = existing && (existing.total_cardio == null || Number(existing.total_cardio) !== val);

      if (existing && (kmChanged || tcNeedsUpdate)) {
        const updateData: Record<string, any> = { km: val, total_cardio: val, day: dayName, new_entry: getNewEntryStatus(dateStr) };
        await supabase.from('workouts').update(updateData).eq('id', existing.id);
      } else if (!existing && val > 0) {
        await supabase.from('workouts').insert({
          date: dateStr,
          week: weekNum,
          day: dayName,
          type: 'CARDIO',
          exercise_id: TRACKER_EXERCISE_ID,
          km: val,
          total_cardio: val,
          total_score_k: null,
          new_entry: 'New',
          source: 'app',
        });
      }
      savedDates.add(dateStr);
    }
    // Recalculate daily totals for all saved dates
    for (const dateStr of savedDates) {
      await recalculateDailyTotals(dateStr);
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>
          </svg>
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
          {editableDays.map((day, i) => {
            const isFocused = focusedRow === i;
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
                  {/* Date label */}
                  <span style={{
                    fontSize: isFocused ? '13px' : '11px',
                    fontWeight: 700,
                    color: '#000000',
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    flexShrink: 0,
                    transition: 'font-size 0.15s ease',
                  }}>
                    {fmtEditLabel(day)}
                  </span>

                  {/* Inline input — no box */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      ref={el => { inputRefs.current[i] = el; }}
                      type="number"
                      inputMode="decimal"
                      value={editRowValues[i]}
                      onChange={e => {
                        const newVals = [...editRowValues];
                        newVals[i] = e.target.value;
                        setEditRowValues(newVals);
                      }}
                      onFocus={() => setFocusedRow(i)}
                      onBlur={() => setFocusedRow(null)}
                      placeholder="—"
                      style={{
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        fontFamily: 'inherit',
                        fontSize: isFocused ? '16px' : '13px',
                        fontWeight: 400,
                        letterSpacing: '0.15em',
                        color: editRowValues[i] ? '#000000' : 'rgba(0,0,0,0.3)',
                        textAlign: 'right',
                        width: 80,
                        padding: 0,
                        transition: 'font-size 0.15s ease',
                      }}
                    />
                    <span style={{
                      fontSize: isFocused ? '11px' : '9px',
                      fontWeight: 700,
                      color: 'rgba(0,0,0,0.35)',
                      letterSpacing: '0.08em',
                      transition: 'font-size 0.15s ease',
                    }}>KM</span>
                  </div>
                </div>
                {/* Divider — not after last row */}
                {i < editableDays.length - 1 && (
                  <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Update button */}
        <button
          onClick={handleSave}
          disabled={editSaving}
          style={{
            width: '100%', padding: '11px',
            backgroundColor: '#000000', color: '#ffffff',
            borderRadius: 999, border: 'none',
            fontSize: '11px', fontWeight: 900,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            cursor: 'pointer', opacity: editSaving ? 0.6 : 1,
          }}
        >
          {editSaving ? 'Saving...' : 'Update'}
        </button>
      </div>
    </div>
  );
};

export default TrackerEditSheet;
