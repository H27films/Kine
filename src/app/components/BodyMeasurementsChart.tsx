import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const BODY_COMP_EXERCISE_ID = 88;

interface BodyDataPoint {
  date: string;
  bodyweight: number | null;
  body_fat_percent: number | null;
  muscle_mass: number | null;
}

const fmtDateShort = (d: string): string => {
  const date = new Date(d + 'T12:00:00');
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  return `${day} ${month}`;
};

const PAGE_SIZE = 15;

const BodyMeasurementsChart: React.FC = () => {
  const [allData, setAllData] = useState<BodyDataPoint[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('workouts')
        .select('date, bodyweight, body_fat_percent, muscle_mass')
        .eq('type', 'MEASUREMENT')
        .eq('exercise_id', BODY_COMP_EXERCISE_ID)
        .order('date', { ascending: false })
        .limit(200);

      if (data) {
        const filtered = (data as BodyDataPoint[]).filter(
          d => d.bodyweight !== null || d.body_fat_percent !== null || d.muscle_mass !== null
        );
        setAllData(filtered.reverse());
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalPages = Math.max(1, Math.ceil(allData.length / PAGE_SIZE));
  const currentData = allData.slice(
    allData.length - (page + 1) * PAGE_SIZE,
    allData.length - page * PAGE_SIZE
  );

  const hasPrev = page < totalPages - 1;
  const hasNext = page > 0;

  const chartData = currentData;
  const n = chartData.length;

  // --- Left axis (Weight & Muscle) ---
  const allLeftValues = allData
    .flatMap(d => [d.bodyweight, d.muscle_mass])
    .filter((v): v is number => v !== null);
  const leftMin = allLeftValues.length > 0 ? Math.min(...allLeftValues) : 0;
  const leftMax = allLeftValues.length > 0 ? Math.max(...allLeftValues) : 100;
  const leftRange = leftMax - leftMin || 1;
  const leftPad = leftRange * 0.12;
  const leftYMin = leftMin - leftPad;
  const leftYMax = leftMax + leftPad;

  // --- Right axis (Fat %) ---
  const allRightValues = allData
    .map(d => d.body_fat_percent)
    .filter((v): v is number => v !== null);
  const rightMin = allRightValues.length > 0 ? Math.min(...allRightValues) : 0;
  const rightMax = allRightValues.length > 0 ? Math.max(...allRightValues) : 100;
  const rightRange = rightMax - rightMin || 1;
  const rightPad = rightRange * 0.12;
  const rightYMin = rightMin - rightPad;
  const rightYMax = rightMax + rightPad;

  const latestEntry = allData.length > 0 ? allData[allData.length - 1] : null;

  // SVG layout
  const viewW = 600;
  const svgH = 280;
  const mL = 48;
  const mR = 48;
  const mT = 12;
  const mB = 32;
  const plotW = viewW - mL - mR;
  const plotH = svgH - mT - mB;

  const getX = (i: number) => mL + (i / (Math.max(n - 1, 1))) * plotW;

  const scaleLeft = (v: number) => mT + (1 - (v - leftYMin) / (leftYMax - leftYMin)) * plotH;
  const scaleRight = (v: number) => mT + (1 - (v - rightYMin) / (rightYMax - rightYMin)) * plotH;

  // Build line paths
  const buildPath = (vals: (number | null)[], sc: (v: number) => number) =>
    vals
      .map((v, i) => {
        if (v === null) return null;
        const x = getX(i);
        const y = sc(v);
        return i === 0 ? `M${x},${y}` : `L${x},${y}`;
      })
      .filter(Boolean)
      .join(' ');

  const weightPath = buildPath(chartData.map(d => d.bodyweight), scaleLeft);
  const musclePath = buildPath(chartData.map(d => d.muscle_mass), scaleLeft);
  const fatPath = buildPath(chartData.map(d => d.body_fat_percent), scaleRight);

  // Tick values
  const leftTicks = 4;
  const leftTickVals = Array.from({ length: leftTicks }, (_, i) => leftYMin + ((leftYMax - leftYMin) * i) / (leftTicks - 1));
  const rightTicks = 4;
  const rightTickVals = Array.from({ length: rightTicks }, (_, i) => rightYMin + ((rightYMax - rightYMin) * i) / (rightTicks - 1));

  const tickFmt = (v: number) => v.toFixed(v > 100 ? 0 : 1);

  return (
    <div style={{ marginTop: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: '#1a1a1a' }}>History</span>
          <button
            onClick={() => hasPrev && setPage(p => p + 1)}
            style={{ background: 'none', border: 'none', padding: '2px 1px', cursor: hasPrev ? 'pointer' : 'default', color: hasPrev ? '#1a1a1a' : 'rgba(26,26,26,0.15)', display: 'flex', alignItems: 'center' }}
          ><ChevronLeft size={14} /></button>
          <button
            onClick={() => hasNext && setPage(p => p - 1)}
            style={{ background: 'none', border: 'none', padding: '2px 1px', cursor: hasNext ? 'pointer' : 'default', color: hasNext ? '#1a1a1a' : 'rgba(26,26,26,0.15)', display: 'flex', alignItems: 'center' }}
          ><ChevronRight size={14} /></button>
        </div>
        {page > 0 && (
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(26,26,26,0.45)', letterSpacing: '0.05em' }}>
            {page + 1}/{totalPages}
          </span>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 14, height: 2.5, backgroundColor: '#1a1a1a', borderRadius: 1, display: 'inline-block' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#1a1a1a' }}>Weight</span>
          {latestEntry?.bodyweight != null && <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.45)' }}>{latestEntry.bodyweight}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 14, height: 1.5, backgroundColor: 'rgba(26,26,26,0.65)', borderRadius: 1, display: 'inline-block' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#1a1a1a' }}>Muscle</span>
          {latestEntry?.muscle_mass != null && <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.45)' }}>{latestEntry.muscle_mass}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 14, height: 0, borderTop: '1.5px dashed rgba(26,26,26,0.4)', display: 'inline-block' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#1a1a1a' }}>Fat %</span>
          {latestEntry?.body_fat_percent != null && <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,26,26,0.45)' }}>{latestEntry.body_fat_percent}</span>}
        </div>
      </div>

      {/* SVG Chart */}
      {loading ? (
        <div style={{ height: svgH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(26,26,26,0.35)' }}>Loading...</span>
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ height: svgH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(26,26,26,0.35)' }}>No data yet</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <svg width="100%" height={svgH} viewBox={`0 0 ${viewW} ${svgH}`} style={{ display: 'block', minWidth: 320 }}>
            {/* Axis unit labels */}
            <text x={mL - 28} y={mT + plotH / 2 + 4} textAnchor="middle" fill="rgba(26,26,26,0.3)" fontSize="9" fontWeight={600} letterSpacing="0.1em"
              transform={`rotate(-90, ${mL - 28}, ${mT + plotH / 2 + 4})`}>KG</text>
            <text x={mL + plotW + 28} y={mT + plotH / 2 + 4} textAnchor="middle" fill="rgba(26,26,26,0.3)" fontSize="9" fontWeight={600} letterSpacing="0.1em"
              transform={`rotate(90, ${mL + plotW + 28}, ${mT + plotH / 2 + 4})`}>%</text>

            {/* Grid lines & left tick labels */}
            {leftTickVals.map((v, i) => {
              const y = scaleLeft(v);
              return (
                <g key={`gl-${i}`}>
                  {i > 0 && <line x1={mL} y1={y} x2={mL + plotW} y2={y} stroke="rgba(26,26,26,0.08)" strokeWidth={0.5} />}
                  <text x={mL - 6} y={y + 3.5} textAnchor="end" fill="#1a1a1a" fontSize="10" fontWeight={600}>{tickFmt(v)}</text>
                </g>
              );
            })}

            {/* Right tick labels */}
            {rightTickVals.map((v, i) => {
              const y = scaleRight(v);
              return (
                <text key={`gr-${i}`} x={mL + plotW + 6} y={y + 3.5} textAnchor="start" fill="#1a1a1a" fontSize="10" fontWeight={600}>
                  {tickFmt(v)}
                </text>
              );
            })}

            {/* Lines */}
            {weightPath && <path d={weightPath} fill="none" stroke="#1a1a1a" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
            {musclePath && <path d={musclePath} fill="none" stroke="rgba(26,26,26,0.65)" strokeWidth={1.5} strokeDasharray="3 3" strokeLinejoin="round" strokeLinecap="round" />}
            {fatPath && <path d={fatPath} fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth={1.5} strokeDasharray="5 3" strokeLinejoin="round" strokeLinecap="round" />}

            {/* Dots */}
            {chartData.map((pt, i) => {
              const el: React.ReactNode[] = [];
              if (pt.bodyweight != null) {
                const x = getX(i); const y = scaleLeft(pt.bodyweight);
                el.push(<circle key={`w-${i}`} cx={x} cy={y} r={3.5} fill="#1a1a1a" />);
              }
              if (pt.muscle_mass != null) {
                const x = getX(i); const y = scaleLeft(pt.muscle_mass);
                el.push(<circle key={`m-${i}`} cx={x} cy={y} r={3} fill="rgba(26,26,26,0.65)" stroke="#fff" strokeWidth={0.8} />);
              }
              if (pt.body_fat_percent != null) {
                const x = getX(i); const y = scaleRight(pt.body_fat_percent);
                el.push(<circle key={`f-${i}`} cx={x} cy={y} r={2.8} fill="rgba(26,26,26,0.4)" stroke="#fff" strokeWidth={0.6} />);
              }
              return el;
            })}

            {/* X-axis date labels */}
            {n > 1 && (
              <>
                <text x={mL} y={svgH - 4} textAnchor="start" fill="#1a1a1a" fontSize="9" fontWeight={600}>{fmtDateShort(chartData[0].date)}</text>
                {n > 2 && (
                  <text x={getX(Math.floor(n / 2))} y={svgH - 4} textAnchor="middle" fill="#1a1a1a" fontSize="9" fontWeight={600}>
                    {fmtDateShort(chartData[Math.floor(n / 2)].date)}
                  </text>
                )}
                <text x={mL + plotW} y={svgH - 4} textAnchor="end" fill="#1a1a1a" fontSize="9" fontWeight={600}>
                  {fmtDateShort(chartData[n - 1].date)}
                </text>
              </>
            )}
          </svg>
        </div>
      )}
    </div>
  );
};

export default BodyMeasurementsChart;