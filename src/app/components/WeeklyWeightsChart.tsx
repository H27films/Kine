import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];
const NUM_WEEKS = 7;

interface WeekBarData {
  weekNumber: number;
  total: number;
  count: number;
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 900,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: '#ffffff',
  marginBottom: '1.25rem',
};

const WeeklyWeightsChart: React.FC = () => {
  const [bars, setBars] = useState<WeekBarData[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('week, total_weight, exercise_id')
        .in('type', WEIGHT_TYPES)
        .not('week', 'is', null)
        .order('week', { ascending: false })
        .limit(1000);

      if (!data) return;

      const weekMap: Record<number, { total: number; count: number }> = {};
      for (const row of data as any[]) {
        const week = Number(row.week);
        if (!weekMap[week]) weekMap[week] = { total: 0, count: 0 };
        weekMap[week].total += Number(row.total_weight || 0);
        weekMap[week].count += 1;
      }

      const sortedWeeks = Object.keys(weekMap)
        .map(Number)
        .sort((a, b) => b - a)
        .slice(0, NUM_WEEKS);

      const result: WeekBarData[] = sortedWeeks.map(week => ({
        weekNumber: week,
        total: weekMap[week].total,
        count: weekMap[week].count,
      }));

      setBars(result);
    };
    loadData();
  }, []);

  const maxTotal = Math.max(...bars.map(b => b.total), 1);
  const avgTotal = bars.length > 0 ? bars.reduce((s, b) => s + b.total, 0) / bars.length : 0;
  const displayAvg = avgTotal >= 1000 ? `${Math.round(avgTotal / 1000)}K` : `${Math.round(avgTotal)}`;

  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>
      <p style={sectionLabelStyle}>7 WEEKS</p>

      <div className="flex items-baseline gap-1 mb-5">
        <span style={{
          fontSize: '1.6rem',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          lineHeight: 1,
        }}>
          {displayAvg}
        </span>
        {avgTotal >= 1000 && (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.12em',
          }}>
            KG
          </span>
        )}
      </div>

      <div className="flex items-end justify-between" style={{ height: '160px', gap: '12px' }}>
        {bars.map((bar) => {
          const pct = maxTotal > 0 ? Math.max(bar.total / maxTotal, 0.04) : 0;
          const brightness = bar.total > 0 ? Math.round(80 + pct * 175) : 0;
          const barColor = bar.total > 0 ? `rgb(${brightness},${brightness},${brightness})` : 'rgba(255,255,255,0.05)';
          const displayValue = bar.total > 0 ? `${Math.round(bar.total / 1000)}k` : '';

          return (
            <div key={bar.weekNumber} className="flex flex-col items-center h-full justify-end relative" style={{ flex: '1' }}>
              {bar.total > 0 && (
                <>
                  <div className="absolute left-0 right-0 flex flex-col items-center" style={{ bottom: `${pct * 100}%` }}>
                    <div className="text-[9px] font-bold text-white/70 mb-1 whitespace-nowrap">{displayValue}</div>
                    <div className="w-[7px] h-[7px] rounded-full bg-white" />
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0" style={{ height: `${pct * 100}%`, width: '1px', backgroundColor: 'rgba(255,255,255,0.25)' }} />
                </>
              )}
              {bar.count > 0 && (
                <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '24px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#ffffff',
                    lineHeight: 1,
                  }}>
                    {bar.count}
                  </div>
                </div>
              )}
              <div className="text-[9px] font-bold uppercase mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{bar.weekNumber}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyWeightsChart;
