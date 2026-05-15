import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];
const NUM_WEEKS = 7;

interface WeekBarData {
  weekNumber: number;
  total: number;
  count: number;
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '1.5px',
  color: '#1a1a1a',
  lineHeight: 1,
  margin: 0,
  textTransform: 'uppercase',
  fontFamily: "'Archivo', sans-serif",
};

const WeeklyWeightsChart: React.FC = () => {
  const [allWeeks, setAllWeeks] = useState<number[]>([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [bars, setBars] = useState<WeekBarData[]>([]);

  useEffect(() => {
    const loadWeeks = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('week')
        .in('type', WEIGHT_TYPES)
        .not('week', 'is', null);

      if (!data) return;
      const weeks = [...new Set((data as any[]).map(r => Number(r.week)))]
        .filter(w => !isNaN(w))
        .sort((a, b) => b - a);
      setAllWeeks(weeks);
    };
    loadWeeks();
  }, []);

  useEffect(() => {
    const loadBars = async () => {
      if (allWeeks.length === 0) return;
      const startIdx = pageIdx * NUM_WEEKS;
      const endIdx = Math.min(startIdx + NUM_WEEKS, allWeeks.length);
      const windowWeeks = allWeeks.slice(startIdx, endIdx);

      if (windowWeeks.length === 0) return;

      const { data } = await supabase
        .from('workouts')
        .select('week, total_weight, exercise_id')
        .in('type', WEIGHT_TYPES)
        .in('week', windowWeeks);

      if (!data) return;

      const weekMap: Record<number, { total: number; count: number }> = {};
      for (const row of data as any[]) {
        const week = Number(row.week);
        if (!weekMap[week]) weekMap[week] = { total: 0, count: 0 };
        weekMap[week].total += Number(row.total_weight || 0);
        weekMap[week].count += 1;
      }

      const result: WeekBarData[] = windowWeeks
        .filter(w => weekMap[w])
        .sort((a, b) => a - b)
        .map(week => ({
          weekNumber: week,
          total: weekMap[week].total,
          count: weekMap[week].count,
        }));

      setBars(result);
    };
    loadBars();
  }, [allWeeks, pageIdx]);

  const maxTotal = Math.max(...bars.map(b => b.total), 1);
  const yMin = 40000;
  const yMax = maxTotal;
  const avgTotal = bars.length > 0 ? bars.reduce((s, b) => s + b.total, 0) / bars.length : 0;
  const displayAvg = avgTotal >= 1000 ? `${Math.round(avgTotal / 1000)}K` : `${Math.round(avgTotal)}`;

  const totalPages = Math.ceil(allWeeks.length / NUM_WEEKS);
  const canGoOlder = pageIdx < totalPages - 1;
  const canGoNewer = pageIdx > 0;
  const onGoOlder = () => { if (canGoOlder) setPageIdx(i => i + 1); };
  const onGoNewer = () => { if (canGoNewer) setPageIdx(i => i - 1); };

  const weekRange = bars.length > 0 ? `${bars[0].weekNumber} - ${bars[bars.length - 1].weekNumber}` : '';
  const avgExercises = bars.length > 0 ? Math.round(bars.reduce((s, b) => s + b.count, 0) / bars.length) : 0;

  return (
    <div className="rounded-lg p-6 relative" style={{ backgroundColor: '#f2f2f2', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ ...sectionLabelStyle, marginBottom: 0 }}>7 WEEKS</p>
          <button onClick={onGoOlder} disabled={!canGoOlder} style={{ opacity: canGoOlder ? 0.55 : 0.2, background: 'none', border: 'none', cursor: canGoOlder ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={18} color="#1a1a1a" />
          </button>
          <button onClick={onGoNewer} disabled={!canGoNewer} style={{ opacity: canGoNewer ? 0.55 : 0.2, background: 'none', border: 'none', cursor: canGoNewer ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={18} color="#1a1a1a" />
          </button>
        </div>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.06em', color: '#1a1a1a', marginRight: '6px' }}>{weekRange}</span>
      </div>

      <div className="flex items-baseline gap-1 mb-5">
        <span style={{
          fontSize: '1.6rem',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: '#1a1a1a',
          lineHeight: 1,
          fontFamily: "'Archivo', sans-serif",
        }}>
          {displayAvg}
        </span>
        {avgTotal >= 1000 && (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color: 'rgba(26,26,26,0.45)',
            letterSpacing: '0.12em',
          }}>
            KG
          </span>
        )}
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', marginLeft: '8px' }}>
          <span style={{ color: '#1a1a1a' }}> / {avgExercises}</span>
          <span style={{ color: 'rgba(26,26,26,0.45)' }}> EX</span>
        </span>
      </div>

      <div className="flex items-end justify-between h-44" style={{ gap: '12px' }}>
        {bars.map((bar) => {
          const clampedVal = Math.min(Math.max(bar.total, yMin), yMax);
          const pct = bar.total > yMin ? Math.max((clampedVal - yMin) / (yMax - yMin), 0.04) : 0;
          const rawPct = yMax > yMin ? (bar.total - yMin) / (yMax - yMin) : 0;
          // Dark scale: low values → light gray, high values → near-black
          const brightness = bar.total > yMin ? Math.round(30 + Math.max(rawPct, 0) * 150) : 0;
          const barColor = bar.total > yMin ? `rgb(${brightness},${brightness},${brightness})` : 'rgba(0,0,0,0.08)';
          const displayValue = bar.total > 0 ? `${Math.round(bar.total / 1000)}k` : '';

          return (
            <div key={bar.weekNumber} className="flex flex-col items-center h-full justify-end" style={{ flex: '1', maxWidth: '28px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.45)', marginBottom: '4px', height: '14px', fontFamily: "'Archivo', sans-serif" }}>{displayValue}</div>
              <div className="w-full relative transition-all" style={{ height: `${pct * 100}%`, backgroundColor: barColor, borderRadius: '9999px 9999px 0 0', minHeight: bar.total > yMin ? '4px' : 0 }}>
                {bar.count > 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '5px',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#1a1a1a',
                      lineHeight: 1,
                      fontFamily: "'Archivo', sans-serif",
                    }}>
                      {bar.count}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1a1a1a', marginTop: '8px', fontFamily: "'Archivo', sans-serif" }}>{bar.weekNumber}</div>
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 pointer-events-none rounded-lg" style={{ opacity: 0.025, background: 'radial-gradient(circle at top right, #1a1a1a, transparent, transparent)' }} />
    </div>
  );
        })}
      </div>

      <div className="absolute inset-0 pointer-events-none rounded-lg" style={{ opacity: 0.025, background: 'radial-gradient(circle at top right, white, transparent, transparent)' }} />
    </div>
  );
};

export default WeeklyWeightsChart;
