import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const MonthlyCalendarChart: React.FC = () => {
  const [calendarData, setCalendarData] = useState<Record<string, number>>({});
  const [selectedTab, setSelectedTab] = useState<'RUNNING' | 'SCORE' | 'WEIGHTS'>('RUNNING');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0);
      const firstDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      let selectField: string;
      let typeFilter: string;
      let exerciseFilter: number | null = null;
      if (selectedTab === 'RUNNING') {
        selectField = 'date, total_cardio';
        typeFilter = 'CARDIO';
        exerciseFilter = 84;
      } else if (selectedTab === 'SCORE') {
        selectField = 'date, total_score_k';
        typeFilter = 'CARDIO';
      } else {
        selectField = 'date, total_weight';
        typeFilter = 'WEIGHTS';
      }

      let query = supabase
        .from('workouts')
        .select(selectField)
        .eq('type', typeFilter)
        .gte('date', firstDateStr)
        .lte('date', lastDateStr);

      if (exerciseFilter) {
        query = query.eq('exercise_id', exerciseFilter);
      }

      const { data } = await query;

      const byDate: Record<string, number> = {};
      if (data) {
        (data as any[]).forEach(r => {
          const date = r.date;
          if (selectedTab === 'SCORE') {
            // Take the score value (assumed same for all rows on date)
            byDate[date] = Number(r.total_score_k || 0);
          } else {
            const value = Number(r.total_cardio || r.total_score_k || r.total_weight || 0);
            byDate[date] = +((byDate[date] || 0) + value).toFixed(1);
          }
        });
      }
      setCalendarData(byDate);
    };
    load();
  }, [selectedTab]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0 = Mon, 1 = Tue, ..., 6 = Sun

  // Generate calendar grid: 7 columns, up to 5 rows
  const grid = [];
  for (let row = 0; row < 5; row++) {
    const rowCells = [];
    for (let col = 0; col < 7; col++) {
      const dayNum = row * 7 + col - startDayOfWeek + 1;
      if (dayNum > 0 && dayNum <= daysInMonth) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const value = calendarData[dateStr];
        rowCells.push({ day: dayNum, value });
      } else {
        rowCells.push(null);
      }
    }
    grid.push(rowCells);
    // Stop if this row has no days (all null after first row with days)
    if (row > 0 && rowCells.every(cell => cell === null)) break;
  }

  return (
    <div className="rounded-lg p-6 mb-4" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        {(['RUNNING', 'SCORE', 'WEIGHTS'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: selectedTab === tab ? '#ffffff' : 'rgba(255,255,255,0.4)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginRight: '20px',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(5, auto)', gap: '8px' }}>
        {grid.map((row, rowIdx) =>
          row.map((cell, colIdx) =>
            cell ? (() => {
              const cellDate = new Date(now.getFullYear(), now.getMonth(), cell.day);
              const isFuture = cellDate > today;
              return (
                <div key={`${rowIdx}-${colIdx}`} style={{
                  gridColumn: colIdx + 1,
                  gridRow: rowIdx + 1,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  fontWeight: 'bold',
                  border: isFuture ? '1px solid #ccc' : 'none',
                  color: isFuture ? 'transparent' : (cell.value ? '#000000' : '#ffffff'),
                  backgroundColor: isFuture ? 'transparent' : (cell.value ? '#ffffff' : '#000000')
                }}>
                  {isFuture ? '' : (cell.value ? (selectedTab === 'WEIGHTS' ? `${Math.round(cell.value / 1000)}k` : cell.value) : '')}
                </div>
              );
            })() : null
          )
        )}
      </div>
    </div>
  );
};

export default MonthlyCalendarChart;