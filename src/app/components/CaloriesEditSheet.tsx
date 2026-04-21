import React, { useState, useEffect, useRef } from 'react';
import { supabase, getNewEntryStatus, recalculateDailyTotals, malaysiaDateStr } from '../../lib/supabase';

const CALORIES_EXERCISE_ID = 90;
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_ABBREVS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Same week calculation as getISOWeek in supabase.ts but for any date
const getWeekForDate = (d: Date): number => {
  const APP_START = new Date('2025-01-06T00:00:00Z');
  const dateStr = malaysiaDateStr(d);
  const dateObj = new Date(dateStr + 'T00:00:00Z');
  const diffDays = Math.floor((dateObj.getTime() - APP_START.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
};

// Same day logic as getDayName in supabase.ts but for any date
const getDayForDate = (d: Date): string => {
  const dateStr = malaysiaDateStr(d);
  const dateObj = new Date(dateStr + 'T12:00:00Z');
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Kuala_Lumpur' });
  const dayName = formatter.format(dateObj).toUpperCase();
  const dayMap: Record<string, string> = {
    'MON': 'MON', 'TUE': 'TUE', 'WED': 'WED', 'THU': 'THU',
    'FRI': 'FRI', 'SAT': 'SAT', 'SUN': 'SUN',
  };
  return dayMap[dayName] || dayName;
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

const CaloriesEditSheet: React.FC<Props> = ({ onClose, onSaved }) => {
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
        .select('date, calories')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', CALORIES_EXERCISE_ID)
        .in('date', dateStrings);

      const valMap: Record<string, string> = {};
      if (data) {
        for (const row of data as any[]) {
          if (row.calories != null) valMap[row.date] = String(row.calories);
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
      const val = parseInt(raw);
      if (isNaN(val) || val < 0) continue;

      // Only save if the value actually changed from what was loaded
      const origVal = parseInt(originalRowValues.current[i]);
      if (!isNaN(origVal) && val === origVal) continue;

      const dateStr = fmtDate(editableDays[i]);
      const barDate = editableDays[i];
      const weekNum = getWeekForDate(barDate);
      const dayName = getDayForDate(barDate);

      const { data: existing } = await supabase
        .from('workouts')
        .select('id, calories, day')
        .eq('date', dateStr)
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', CALORIES_EXERCISE_ID)
        .maybeSingle();

      const calChanged = isNaN(origVal) || val !== origVal;
      const dayNeedsUpdate = existing && (existing.day !== dayName);

      if (existing && (calChanged || dayNeedsUpdate)) {
        const newEntryStatus = await getNewEntryStatus(dateStr);
        const updateData: Record<string, any> = { calories: val, day: dayName, week: weekNum, new_entry: newEntryStatus };
        await supabase.from('workouts').update(updateData).eq('id', existing.id);
      } else if (!existing && val > 0) {
        await supabase.from('workouts').insert({
          date: dateStr,
          week: weekNum,
          day: dayName,
          type: 'MEASUREMENT',
          exercise_id: CALORIES_EXERCISE_ID,
          calories: val,
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
    // Dispatch custom event so all charts can refetch
    window.dispatchEvent(new CustomEvent('kine:data-updated'));
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
          fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
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
            Edit Calories
          </p>
          {/* Heartbeat / pulse icon */}
          <svg width="38" height="22" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline
              points="0,25 18,25 26,8 34,42 44,18 52,32 60,25 100,25"
              stroke="#000000"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
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
                <input
                  ref={el => { inputRefs.current[i] = el; }}
                  type="number"
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
                    width: 90,
                    padding: 0,
                    transition: 'font-size 0.15s ease',
                  }}
                />
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

export default CaloriesEditSheet;
