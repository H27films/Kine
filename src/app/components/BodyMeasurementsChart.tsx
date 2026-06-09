import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const BODY_COMP_EXERCISE_ID = 88;

interface BodyDataPoint {
  date: string;
  bodyweight: number | null;
  body_fat_percent: number | null;
  muscle_mass: number | null;
}

interface WeeklyAvg {
  weekStart: string;
  bodyweight: number | null;
  body_fat_percent: number | null;
  muscle_mass: number | null;
}

const PAGE_SIZE = 15;

/** Get the Monday of the ISO week containing the given date string */
const getMonday = (dateStr: string): string => {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Average non-null values, rounded to 1 decimal, returning null if none */
const avg = (vals: (number | null)[]): number | null => {
  const nums = vals.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  const raw = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.round(raw * 10) / 10;
};

const CHART_H = 100;
const DOT_SIZE = 8;
const HALF_DOT = DOT_SIZE / 2;

interface MetricChartProps {
  label: string;
  unit: string;
  data: { date: string; value: number }[];
  yMin: number;
  yMax: number;
  goal: number;
  gapReversed?: boolean;
}

const MetricChart: React.FC<MetricChartProps> = ({ label, unit, data, yMin, yMax, goal, gapReversed }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (ref.current) setWidth(ref.current.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (data.length === 0) return null;

  const yRange = yMax - yMin;

  const n = data.length;
  const xSlots = 8;
  const slotW = width > 0 ? width / (xSlots - 1) : 0;

  const getY = (v: number) => (1 - (v - yMin) / yRange) * CHART_H;
  const getX = (i: number) => (slotW > 0 ? i * slotW : width / 2) + HALF_DOT;

  // Build smooth SVG path through points using catmull-rom to cubic bezier
  const smoothPath = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return '';
    let path = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  };

  const pts = slotW > 0 ? data.map((d, i) => ({ x: getX(i), y: getY(d.value) })) : [];
  const goalY = getY(goal);

  // Gap-to-goal
  // Default: goal - latest (for metrics where lower is better: weight, body fat)
  // Reversed: latest - goal (for metrics where higher is better: muscle mass)
  const latestVal = data[data.length - 1].value;
  const gap = gapReversed ? latestVal - goal : goal - latestVal;
  const gapStr = gap >= 0 ? `+${gap.toFixed(1)}` : `${gap.toFixed(1)}`;
  const gapColor = gap < 0 ? '#8B0000' : '#006400';

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label} ({unit})
        </span>
        <span style={{ fontSize: '10px', fontWeight: 700, color: gapColor }}>
          {gapStr}
        </span>
      </div>

      {/* Chart */}
      <div ref={ref} style={{ position: 'relative', height: CHART_H + 24 }}>
        {/* Smooth connecting line via SVG overlay */}
        {slotW > 0 && n > 1 && (
          <svg
            width={width}
            height={CHART_H}
            style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }}
          >
            <path
              d={smoothPath(pts)}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth={2.5}
              opacity={0.06}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Goal line */}
        <div style={{
          position: 'absolute', left: 0, top: goalY,
          width: '100%', height: 0,
          borderTop: '1px dashed #1a1a1a',
          opacity: 0.3,
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Goal label — value above, GOAL below, aligned to right edge */}
        <div style={{
          position: 'absolute', right: 0, top: goalY,
          transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          lineHeight: 1.2,
          pointerEvents: 'none',
          zIndex: 1,
        }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, color: '#1a1a1a',
            marginBottom: 5,
          }}>
            {goal.toFixed(1)}
          </span>
          <span style={{
            fontSize: '8px', fontWeight: 700, color: '#ffffff',
            backgroundColor: '#1a1a1a',
            padding: '1.5px 6px',
            borderRadius: '8px',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginTop: 4,
          }}>
            GOAL
          </span>
        </div>

        {/* Dots & drop lines */}
        {slotW > 0 && data.map((d, i) => {
          const x = getX(i);
          const y = getY(d.value);
          const dropTop = y + HALF_DOT;
          const dropH = Math.max(CHART_H - y - HALF_DOT, 0);
          return (
            <React.Fragment key={i}>
              <div style={{
                position: 'absolute', left: x - 0.5, top: dropTop,
                width: 1, height: dropH,
                backgroundColor: '#1a1a1a', opacity: 0.2,
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', left: x - HALF_DOT, top: y,
                width: DOT_SIZE, height: DOT_SIZE, borderRadius: '50%',
                backgroundColor: '#1a1a1a',
              }} />
              <span style={{
                position: 'absolute', left: x, top: y - 12,
                transform: 'translateX(-50%)',
                fontSize: '9px', fontWeight: 700, color: '#1a1a1a',
                whiteSpace: 'nowrap', pointerEvents: 'none',
              }}>
                {d.value}
              </span>
            </React.Fragment>
          );
        })}

        {/* X-axis labels 1-8 — each centered at its slot position */}
        {slotW > 0 && Array.from({ length: xSlots }, (_, i) => {
          const x = HALF_DOT + i * slotW;
          return (
            <span key={i} style={{
              position: 'absolute', bottom: 0, left: x,
              transform: 'translateX(-50%)',
              fontSize: '8px', fontWeight: 600, color: '#1a1a1a',
              pointerEvents: 'none',
            }}>
              {i + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Group raw data points by week (Monday-based) and average each metric */
const toWeeklyAverages = (data: BodyDataPoint[]): WeeklyAvg[] => {
  const weekMap = new Map<string, { bw: number[]; bf: number[]; mm: number[] }>();
  for (const d of data) {
    const wk = getMonday(d.date);
    if (!weekMap.has(wk)) weekMap.set(wk, { bw: [], bf: [], mm: [] });
    const bucket = weekMap.get(wk)!;
    if (d.bodyweight !== null) bucket.bw.push(d.bodyweight);
    if (d.body_fat_percent !== null) bucket.bf.push(d.body_fat_percent);
    if (d.muscle_mass !== null) bucket.mm.push(d.muscle_mass);
  }
  const sortedWeeks = Array.from(weekMap.keys()).sort();
  return sortedWeeks.map(wk => {
    const bucket = weekMap.get(wk)!;
    return {
      weekStart: wk,
      bodyweight: bucket.bw.length > 0 ? avg(bucket.bw) : null,
      body_fat_percent: bucket.bf.length > 0 ? avg(bucket.bf) : null,
      muscle_mass: bucket.mm.length > 0 ? avg(bucket.mm) : null,
    };
  });
};

const BodyMeasurementsChart: React.FC = () => {
  const [weeklyAverages, setWeeklyAverages] = useState<WeeklyAvg[]>([]);
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
        setWeeklyAverages(toWeeklyAverages(filtered.reverse()));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalPages = Math.max(1, Math.ceil(weeklyAverages.length / PAGE_SIZE));
  const currentData = weeklyAverages.slice(
    Math.max(0, weeklyAverages.length - (page + 1) * PAGE_SIZE),
    Math.max(0, weeklyAverages.length - page * PAGE_SIZE)
  );

  const hasPrev = page < totalPages - 1;
  const hasNext = page > 0;

  const weightData = currentData.filter(d => d.bodyweight !== null).map(d => ({ date: d.weekStart, value: d.bodyweight! }));
  const muscleData = currentData.filter(d => d.muscle_mass !== null).map(d => ({ date: d.weekStart, value: d.muscle_mass! }));
  const fatData = currentData.filter(d => d.body_fat_percent !== null).map(d => ({ date: d.weekStart, value: d.body_fat_percent! }));

  if (loading) {
    return (
      <div style={{ marginTop: 24, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(26,26,26,0.35)' }}>Loading...</span>
      </div>
    );
  }

  if (weeklyAverages.length === 0) {
    return (
      <div style={{ marginTop: 24, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(26,26,26,0.35)' }}>No data yet</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '0.15em', textTransform: 'uppercase' }}>History</span>
        <button
          onClick={() => hasPrev && setPage(p => p + 1)}
          style={{ background: 'none', border: 'none', padding: '2px 1px', cursor: hasPrev ? 'pointer' : 'default', color: hasPrev ? '#1a1a1a' : 'rgba(26,26,26,0.15)', display: 'flex', alignItems: 'center' }}
        ><ChevronLeft size={14} /></button>
        <button
          onClick={() => hasNext && setPage(p => p - 1)}
          style={{ background: 'none', border: 'none', padding: '2px 1px', cursor: hasNext ? 'pointer' : 'default', color: hasNext ? '#1a1a1a' : 'rgba(26,26,26,0.15)', display: 'flex', alignItems: 'center' }}
        ><ChevronRight size={14} /></button>
      </div>

      {/* Three separate metric charts with goal lines */}
      <MetricChart label="Body Weight" unit="KG" data={weightData} yMin={77} yMax={81} goal={79} />
      <MetricChart label="Muscle Mass" unit="KG" data={muscleData} yMin={39} yMax={42} goal={41} gapReversed />
      <MetricChart label="Body Fat" unit="%" data={fatData} yMin={9} yMax={12} goal={10} />
    </div>
  );
};

export default BodyMeasurementsChart;