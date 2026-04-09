import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];

interface WeeklyGroupData {
  group: string;
  total: number;
  lastWeek: number;
}

interface WeeklyVolumeCompactProps {
  weeksData?: { weekNumber: number; days: number[] }[];
  showWeekPicker?: boolean;
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.4)',
  marginBottom: '16px',
};

const WeeklyVolumeCompact: React.FC<WeeklyVolumeCompactProps> = ({ weeksData, showWeekPicker = false }) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyGroupData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [weekIdx, setWeekIdx] = useState(0);

  const loadWeeklyData = async (weeks: number[], idx: number) => {
    if (weeks.length === 0) return;
    const currentWeek = weeks[idx] ?? 0;
    const lastWeek = weeks[idx + 1] ?? 0;

    const [{ data: thisWeek }, { data: lastWeekData }] = await Promise.all([
      supabase.from('workouts').select('type, total_weight').in('type', WEIGHT_TYPES).eq('week', currentWeek),
      supabase.from('workouts').select('type, total_weight').in('type', WEIGHT_TYPES).eq('week', lastWeek),
    ]);

    const sumByType = (rows: any[] | null, type: string) =>
      (rows || []).filter(r => r.type === type).reduce((s, r) => s + Number(r.total_weight || 0), 0);

    const groups = ['CHEST', 'BACK', 'LEGS'].map(t => ({
      group: t.charAt(0) + t.slice(1).toLowerCase(),
      total: sumByType(thisWeek, t),
      lastWeek: sumByType(lastWeekData, t),
    }));
    setWeeklyData(groups);
  };

  useEffect(() => {
    if (weeksData && weeksData.length > 0) {
      const weeks = weeksData.map(w => w.weekNumber);
      setAvailableWeeks(weeks);
      loadWeeklyData(weeks, 0);
    } else {
      const init = async () => {
        const { data } = await supabase
          .from('workouts')
          .select('week')
          .in('type', WEIGHT_TYPES)
          .not('week', 'is', null);
        if (!data) return;
        const weeks = [...new Set((data as any[]).map(r => Number(r.week)))]
          .filter(w => !isNaN(w))
          .sort((a, b) => b - a);
        setAvailableWeeks(weeks);
        await loadWeeklyData(weeks, 0);
      };
      init();
    }
  }, [weeksData]);

  useEffect(() => {
    if (availableWeeks.length === 0 || weeksData) return;
    loadWeeklyData(availableWeeks, weekIdx);
  }, [weekIdx]);

  const canGoBack = weekIdx < availableWeeks.length - 1;
  const canGoForward = weekIdx > 0;

  const maxTotal = Math.max(...weeklyData.map(d => d.total), 1);

  return (
    <div style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff', borderRadius: '8px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={sectionLabelStyle}>WEIGHTS</span>
        {showWeekPicker && availableWeeks.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setWeekIdx(i => Math.min(i + 1, availableWeeks.length - 1))}
              disabled={!canGoBack}
              style={{ opacity: canGoBack ? 0.6 : 0.2, background: 'none', border: 'none', cursor: canGoBack ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: 'rgba(255,255,255,0.5)', minWidth: '50px', textAlign: 'center' }}>
              {availableWeeks[weekIdx]}
            </span>
            <button
              onClick={() => setWeekIdx(i => Math.max(i - 1, 0))}
              disabled={!canGoForward}
              style={{ opacity: canGoForward ? 0.6 : 0.2, background: 'none', border: 'none', cursor: canGoForward ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {weeklyData.map(({ group, total, lastWeek }) => {
          const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
          return (
            <div key={group}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div>
                  <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '13px', letterSpacing: '-0.01em', display: 'block' }}>{group}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 400, marginTop: '2px', display: 'block' }}>
                    {weekIdx === 0 ? 'Last week' : 'Previous'}: {Math.round(lastWeek).toLocaleString()}kg
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '18px', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {Math.round(total).toLocaleString()}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>kg</span>
                </div>
              </div>
              <div style={{ height: '34px', width: '100%', backgroundColor: '#1f1f1f', borderRadius: '999px', overflow: 'hidden', padding: '4px' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #c6c6c7 0%, #ffffff 100%)',
                    borderRadius: '999px',
                    boxShadow: '0 0 12px rgba(255,255,255,0.2)',
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyVolumeCompact;
