import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const MonthlyCalendarChart: React.FC = () => {
  const [calendarData, setCalendarData] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0);
      const firstDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const { data } = await supabase
        .from('workouts')
        .select('date, total_cardio')
        .eq('type', 'CARDIO')
        .eq('exercise_id', 84) // RUNNING
        .gte('date', firstDateStr)
        .lte('date', lastDateStr);

      const byDate: Record<string, number> = {};
      if (data) {
        (data as any[]).forEach(r => {
          const date = r.date;
          byDate[date] = +((byDate[date] || 0) + Number(r.total_cardio || 0)).toFixed(1);
        });
      }
      setCalendarData(byDate);
    };
    load();
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon, etc.

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
    <div className="rounded-lg p-5 mb-4" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(5, auto)', gap: '8px' }}>
        {grid.map((row, rowIdx) =>
          row.map((cell, colIdx) =>
            cell ? (
              <div key={`${rowIdx}-${colIdx}`} style={{ gridColumn: colIdx + 1, gridRow: rowIdx + 1, width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 'bold', color: cell.value ? '#000000' : '#121212', backgroundColor: '#ffffff' }}>
                {cell.value || ''}
              </div>
            ) : null
          )
        )}
      </div>
    </div>
  );
};

export default MonthlyCalendarChart;