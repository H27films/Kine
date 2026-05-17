import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];
const WEEKLY_MAX: Record<string, number> = {
  CHEST: 25000,
  BACK: 25000,
  LEGS: 30000,
};

interface WeeklyGroupData {
  group: string;
  total: number;
  count: number;
}

interface WeeklyVolumeCompactProps {
  selectedWeekNumber: number | null;
  allWeekNumbers: number[];
}

const WeeklyVolumeCompact: React.FC<WeeklyVolumeCompactProps> = ({ selectedWeekNumber, allWeekNumbers }) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyGroupData[]>([]);
  // Default to current week (index 0 = most recent week)
  const effectiveWeek = selectedWeekNumber ?? (allWeekNumbers.length > 0 ? allWeekNumbers[0] : null);

  useEffect(() => {
    const loadWeeklyData = async () => {
      if (!effectiveWeek || allWeekNumbers.length === 0) return;
      const { data } = await supabase
        .from('workouts')
        .select('type, total_weight, exercise_id')
        .in('type', WEIGHT_TYPES)
        .eq('week', effectiveWeek);

      const sumByType = (rows: any[] | null, type: string) =>
        (rows || []).filter(r => r.type === type).reduce((s, r) => s + Number(r.total_weight || 0), 0);

      const countByType = (rows: any[] | null, type: string) =>
        (rows || []).filter(r => r.type === type).length;

      const groups = WEIGHT_TYPES.map(t => ({
        group: t,
        total: sumByType(data, t),
        count: countByType(data, t),
      }));
      setWeeklyData(groups);
    };
    loadWeeklyData();
  }, [effectiveWeek, allWeekNumbers.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {weeklyData.map(({ group, total, count }) => {
        const maxVal = WEEKLY_MAX[group] ?? 30000;
        const pct = maxVal > 0 ? Math.min((total / maxVal) * 100, 100) : 0;
        return (
          <div key={group}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ color: '#1a1a1a', fontWeight: 650, fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'Archivo', sans-serif" }}>{group}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <span style={{ color: '#1a1a1a', fontWeight: 900, fontSize: '14px', letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Archivo', sans-serif" }}>
                  {Math.round(total).toLocaleString()}
                </span>
                <span style={{ color: 'rgba(26,26,26,0.45)', fontWeight: 700, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Archivo', sans-serif" }}>kg</span>
              </div>
            </div>
            <div style={{ height: '30px', width: '100%', backgroundColor: 'rgba(26,26,26,0.1)', borderRadius: '999px', overflow: 'hidden', padding: '4px', position: 'relative' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, rgba(0,0,0,0.08) 0%, #1a1a1a 100%)',
                  borderRadius: '999px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                }}
              />
              {count > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: 1,
                  fontFamily: "'Archivo', sans-serif",
                }}>
                  {count}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyVolumeCompact;
