import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];

interface WeeklyGroupData {
  group: string;
  total: number;
}

interface WeeklyVolumeCompactProps {
  selectedWeekNumber: number | null;
  allWeekNumbers: number[];
}

const WeeklyVolumeCompact: React.FC<WeeklyVolumeCompactProps> = ({ selectedWeekNumber, allWeekNumbers }) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyGroupData[]>([]);

  useEffect(() => {
    const loadWeeklyData = async () => {
      if (!selectedWeekNumber || allWeekNumbers.length === 0) return;
      const { data } = await supabase
        .from('workouts')
        .select('type, total_weight')
        .in('type', WEIGHT_TYPES)
        .eq('week', selectedWeekNumber);

      const sumByType = (rows: any[] | null, type: string) =>
        (rows || []).filter(r => r.type === type).reduce((s, r) => s + Number(r.total_weight || 0), 0);

      const groups = WEIGHT_TYPES.map(t => ({
        group: t,
        total: sumByType(data, t),
      }));
      setWeeklyData(groups);
    };
    loadWeeklyData();
  }, [selectedWeekNumber, allWeekNumbers]);

  const maxTotal = Math.max(...weeklyData.map(d => d.total), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {weeklyData.map(({ group, total }) => {
        const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
        return (
          <div key={group}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>{group}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '14px', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {Math.round(total).toLocaleString()}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>kg</span>
              </div>
            </div>
            <div style={{ height: '24px', width: '100%', backgroundColor: '#1a1a1a', borderRadius: '999px', overflow: 'hidden', padding: '3px' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #c6c6c7 0%, #ffffff 100%)',
                  borderRadius: '999px',
                  boxShadow: '0 0 10px rgba(255,255,255,0.2)',
                  transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyVolumeCompact;
