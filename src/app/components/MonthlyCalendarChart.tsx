import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface MonthlyCalendarChartProps {
  monthOffset: number;
  className?: string;
  containerStyle?: React.CSSProperties;
  tabs?: ('RUNNING' | 'SCORE' | 'WEIGHTS' | 'ROW' | 'CROSS TRAINER')[];
}

const MonthlyCalendarChart: React.FC<MonthlyCalendarChartProps> = ({
  monthOffset,
  className = "rounded-lg mb-4",
  containerStyle = { backgroundColor: '#121212', borderLeft: '2px solid #ffffff', padding: '32px 24px' },
  tabs = ['SCORE', 'RUNNING', 'WEIGHTS'] as const
}) => {
  const [calendarData, setCalendarData] = useState<Record<string, number>>({});
  const [selectedTab, setSelectedTab] = useState<'RUNNING' | 'SCORE' | 'WEIGHTS' | 'ROW' | 'CROSS TRAINER'>('SCORE');
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const load = async () => {
      const targetMonth = new Date();
      targetMonth.setMonth(targetMonth.getMonth() + monthOffset);
      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth();
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
      } else if (selectedTab === 'ROW') {
        selectField = 'date, total_cardio';
        typeFilter = 'CARDIO';
        exerciseFilter = 83;
      } else if (selectedTab === 'CROSS TRAINER') {
        selectField = 'date, total_cardio';
        typeFilter = 'CARDIO';
        exerciseFilter = 86;
      } else if (selectedTab === 'SCORE') {
        selectField = 'date, total_score';
        typeFilter = 'CARDIO';
      } else {
        selectField = 'date, total_weight';
        typeFilter = 'WEIGHTS';
      }

      let query = supabase
        .from('workouts')
        .select(selectField)
        .gte('date', firstDateStr)
        .lte('date', lastDateStr);

      if (selectedTab === 'WEIGHTS') {
        query = query.in('type', ['CHEST', 'BACK', 'LEGS']);
      } else {
        query = query.eq('type', typeFilter);
      }

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
            byDate[date] = Number(r.total_score || 0);
          } else {
            const value = Number(r.total_cardio || r.total_score || r.total_weight || 0);
            byDate[date] = +((byDate[date] || 0) + value).toFixed(1);
          }
        });
      }

      // Calculate total
      let totalValue: number;
      if (selectedTab === 'SCORE') {
        const nonZeroValues = Object.values(byDate).filter(v => v > 0);
        totalValue = nonZeroValues.length > 0 ? nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length : 0;
      } else {
        totalValue = Object.values(byDate).reduce((sum, val) => sum + val, 0);
      }
      if (selectedTab === 'WEIGHTS' || selectedTab === 'SCORE') {
        setTotal(Math.round(totalValue));
      } else {
        setTotal(+totalValue.toFixed(1));
      }

      setCalendarData(byDate);

      // Calculate count of entries with values > 0
      const entryCount = Object.values(byDate).filter(v => v > 0).length;
      setCount(entryCount);
    };
    load();
  }, [selectedTab, monthOffset]);

  const targetMonth = new Date();
  targetMonth.setMonth(targetMonth.getMonth() + monthOffset);
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
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
    <div className={className} style={containerStyle}>
      {/* Tab selector */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {tabs.map(tab => (
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
      </div>

      {/* Total display below tabs */}
      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1 }}>
              {selectedTab === 'WEIGHTS' ? Math.round(total).toLocaleString() : total}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>
              {selectedTab === 'WEIGHTS' ? 'KG' : selectedTab === 'SCORE' ? 'SCORE' : 'KM'}
            </span>
          </div>
          {selectedTab !== 'SCORE' && (
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#000000',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              {count}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(5, auto)', gap: '8px', marginTop: '40px' }}>
        {grid.map((row, rowIdx) =>
          row.map((cell, colIdx) =>
            cell ? (() => {
              const cellDate = new Date(year, month, cell.day);
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
                  border: isFuture ? 'none' : (cell.value ? 'none' : '1px solid #ffffff'),
                  color: isFuture ? 'transparent' : (cell.value ? '#000000' : 'transparent'),
                  backgroundColor: isFuture ? 'rgba(211,211,211,0.7)' : (cell.value ? '#ffffff' : 'transparent')
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