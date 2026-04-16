import React, { useState, useEffect, useRef } from 'react';
import { supabase, getISOWeek } from '../../lib/supabase';

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

interface WaveTimelineProps {
  firstDate: string;
  lastDate: string;
}

export const WaveTimeline: React.FC<WaveTimelineProps> = ({ firstDate, lastDate }) => {
  const [actualFirstDate, setActualFirstDate] = useState(firstDate);
  const [view, setView] = useState<'overview' | 'tracker' | 'running' | 'allweights' | 'calories'>('overview');
  const [trackerValues, setTrackerValues] = useState<number[]>([]);
  const [runningValues, setRunningValues] = useState<number[]>([]);
  const [allWeightsValues, setAllWeightsValues] = useState<{ week: number; chest: number; back: number; legs: number }[]>([]);
  const [caloriesValues, setCaloriesValues] = useState<number[]>([]);
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const isDragging = useRef(false);

  const W = 400;
  const H = 180;
  const midY = H / 2;

  // Load first date
  useEffect(() => {
    const loadFirstDate = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('date')
        .not('week', 'is', null)
        .order('date', { ascending: true })
        .limit(1);
      if (data && data.length > 0) {
        setActualFirstDate(data[0].date as string);
      }
    };
    loadFirstDate();
  }, []);

  // Load Tracker daily data
  useEffect(() => {
    if (view !== 'tracker') return;
    const loadTrackerData = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('date, total_cardio')
        .in('exercise_id', [82, 83, 87])
        .not('date', 'is', null)
        .order('date');

      if (!data || data.length === 0) return;

      // Group by date
      const dateMap: Record<string, number> = {};
      for (const row of data as any[]) {
        const d = row.date;
        const val = Number(row.total_cardio || 0);
        if (dateMap[d]) dateMap[d] += val;
        else dateMap[d] = val;
      }

      const sortedDates = Object.keys(dateMap).sort();
      const vals = sortedDates.map(d => dateMap[d]);

      setTrackerValues(vals);
    };
    loadTrackerData();
  }, [view]);

  // Load Running daily data
  useEffect(() => {
    if (view !== 'running') return;
    const loadRunningData = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('date, total_cardio')
        .eq('exercise_id', 84)
        .not('date', 'is', null)
        .order('date');

      if (!data || data.length === 0) return;

      // Group by date
      const dateMap: Record<string, number> = {};
      for (const row of data as any[]) {
        const d = row.date;
        const val = Number(row.total_cardio || 0);
        if (dateMap[d]) dateMap[d] += val;
        else dateMap[d] = val;
      }

      // Get full date range (first to last date with any data)
      const allDates = Object.keys(dateMap).sort();
      const firstDate = allDates[0];
      const lastDate = allDates[allDates.length - 1];

      // Fill in all days in range, 0 for days without running
      const vals: number[] = [];
      const current = new Date(firstDate + 'T00:00:00');
      const end = new Date(lastDate + 'T00:00:00');
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        vals.push(dateMap[dateStr] || 0);
        current.setDate(current.getDate() + 1);
      }

      setRunningValues(vals);
    };
    loadRunningData();
  }, [view]);

  // Load Calories daily data
  useEffect(() => {
    if (view !== 'calories') return;
    const loadCaloriesData = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('date, week, calories')
        .eq('exercise_id', 90)
        .not('date', 'is', null)
        .not('week', 'is', null)
        .order('date');

      if (!data || data.length === 0) return;

      // Group by week, sum calories, then divide by 7 for daily average
      const weekMap: Record<number, { sum: number; count: number }> = {};
      for (const row of data as any[]) {
        const w = Number(row.week);
        const val = Number(row.calories || 0);
        if (!weekMap[w]) weekMap[w] = { sum: 0, count: 0 };
        weekMap[w].sum += val;
        weekMap[w].count++;
      }

      // Get sorted weeks
      const sortedWeeks = Object.keys(weekMap).map(Number).sort((a, b) => a - b);
      const vals = sortedWeeks.map(w => weekMap[w].sum / 7);

      setCaloriesValues(vals);
    };
    loadCaloriesData();
  }, [view]);

  // Load AllWeights weekly data (CHEST, BACK, LEGS)
  useEffect(() => {
    if (view !== 'allweights') return;
    const loadAllWeightsData = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('week, type, total_weight')
        .in('type', ['CHEST', 'BACK', 'LEGS'])
        .order('week');

      if (!data || data.length === 0) return;

      const weekTypeMap: Record<number, { chest: number; back: number; legs: number }> = {};
      for (const row of data as any[]) {
        const w = Number(row.week);
        if (isNaN(w)) continue;
        const type = (row.type as string).toUpperCase();
        const val = Number(row.total_weight || 0);
        
        if (!weekTypeMap[w]) weekTypeMap[w] = { chest: 0, back: 0, legs: 0 };
        if (type === 'CHEST') weekTypeMap[w].chest += val;
        else if (type === 'BACK') weekTypeMap[w].back += val;
        else if (type === 'LEGS') weekTypeMap[w].legs += val;
      }

      const sortedWeeks = Object.keys(weekTypeMap).map(Number).sort((a, b) => a - b);
      const firstWeek = sortedWeeks[0];
      const currentWeek = getISOWeek();

      // Fill all weeks from first to current, 0 for missing weeks
      const vals: { week: number; chest: number; back: number; legs: number }[] = [];
      for (let w = firstWeek; w <= currentWeek; w++) {
        vals.push({
          week: w,
          chest: weekTypeMap[w]?.chest || 0,
          back: weekTypeMap[w]?.back || 0,
          legs: weekTypeMap[w]?.legs || 0,
        });
      }

      setAllWeightsValues(vals);
    };
    loadAllWeightsData();
  }, [view]);

  const fmtDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  };

  // Generate smooth curve using Catmull-Rom spline
  const generateSmoothCurve = (seed: number, amplitude: number, frequency: number, phase: number): string => {
    const points: { x: number; y: number }[] = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * W;
      const envelope = Math.sin(t * Math.PI);
      const y = midY + Math.sin(t * Math.PI * frequency + phase + seed) * amplitude * envelope;
      points.push({ x, y });
    }
    if (points.length < 2) return '';

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const tension = 0.3;
      d += ` C ${p1.x + (p2.x - p0.x) * tension} ${p1.y + (p2.y - p0.y) * tension}, ${p2.x - (p3.x - p1.x) * tension} ${p2.y - (p3.y - p1.y) * tension}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  // Curves for View 1 (Overview)
  const curves = [
    { seed: 0, amp: 35, freq: 3, phase: 0, stroke: '#1a1a1a', opacity: 0.7, width: 1.5 },
    { seed: 1.5, amp: 30, freq: 2.5, phase: 0.8, stroke: '#1a1a1a', opacity: 0.5, width: 1.2 },
    { seed: 3, amp: 40, freq: 2, phase: 1.2, stroke: '#1a1a1a', opacity: 0.35, width: 1 },
    { seed: 4.5, amp: 25, freq: 3.5, phase: 2.1, stroke: '#1a1a1a', opacity: 0.25, width: 0.8 },
    { seed: 6, amp: 32, freq: 2.8, phase: 0.3, stroke: '#1a1a1a', opacity: 0.6, width: 1.3 },
  ];

  const thickLines = [
    { seed: 0.8, amp: 28, freq: 2.8, phase: 0.5, gradient: 'grad1', width: 2, blur: 3 },
    { seed: 2.2, amp: 22, freq: 2.2, phase: 1.5, gradient: 'grad2', width: 1, blur: 5 },
    { seed: 5, amp: 30, freq: 3.2, phase: 0.2, gradient: 'grad3', width: 0.5, blur: 8 },
  ];

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      setSelectedBarIdx(null);
      if (diff > 0) {
        if (view === 'overview') setView('tracker');
        else if (view === 'tracker') setView('running');
        else if (view === 'running') setView('allweights');
        else if (view === 'allweights') setView('calories');
      } else {
        if (view === 'calories') setView('allweights');
        else if (view === 'allweights') setView('running');
        else if (view === 'running') setView('tracker');
        else if (view === 'tracker') setView('overview');
      }
    }
    isDragging.current = false;
  };

  const renderContent = () => {
    if (view === 'tracker' && trackerValues.length > 0) {
      const maxVal = Math.max(...trackerValues, 1);
      const PAD = 0;
      const drawW = W - PAD;
      const barWidth = Math.max(2, (drawW / trackerValues.length) - 1.5);
      const baselineY = H * 0.72;
      const minThreshold = 5;
      const availableAbove = baselineY - 20;
      const availableBelow = H - baselineY;

      return (
        <>
          {/* Tracker label - top left, same style as View 1 date labels */}
          <text x={0} y={6} textAnchor="start" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.04em',
            fill: '#1a1a1a',
            textTransform: 'uppercase',
          }}>TRACKER</text>

          {/* Total sum - top right */}
          <text x={W} y={6} textAnchor="end" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.04em',
            fill: '#1a1a1a',
          }}>{Math.round(trackerValues.reduce((a, b) => a + b, 0)).toLocaleString()}<tspan fontSize="10px">KM</tspan></text>

          {/* X axis at 0km */}
          <line x1={0} y1={baselineY} x2={W} y2={baselineY} stroke="rgba(0,0,0,0.12)" strokeWidth="1" />

          {/* Bars from 0 baseline - full width */}
          {trackerValues.map((val, i) => {
            if (val < minThreshold) return null;
            const x = (i / Math.max(trackerValues.length - 1, 1)) * drawW + PAD - barWidth / 2;
            const normalizedVal = (val - minThreshold) / (maxVal - minThreshold);
            const barHeight = normalizedVal * availableAbove * 0.85;
            const y = baselineY - barHeight;
            const shadowHeight = normalizedVal * availableBelow * 0.85;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={baselineY}
                  width={barWidth}
                  height={Math.max(shadowHeight, 1)}
                  fill="#1a1a1a"
                  opacity={0.25}
                />
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 1)}
                  fill="#0a0a0a"
                  opacity={0.8}
                />
              </g>
            );
          })}
        </>
      );
    }

    // View 3: Running
    if (view === 'running' && runningValues.length > 0) {
      const maxVal = Math.max(...runningValues, 1);
      const PAD = 0;
      const drawW = W - PAD;
      const barWidth = Math.max(2, (drawW / runningValues.length) - 1.5);
      const baselineY = H * 0.72;
      const availableAbove = baselineY - 20;
      const availableBelow = H - baselineY;

      // Build curved line path with moving average of non-zero bars, shifted up by 2km
      const nonZeroPoints: { x: number; y: number }[] = [];
      const twoKmInPx = (2 / maxVal) * availableAbove * 0.85;
      runningValues.forEach((val, i) => {
        if (val > 0) {
          const x = (i / Math.max(runningValues.length - 1, 1)) * drawW + PAD;
          const normalizedVal = val / maxVal;
          const barHeight = normalizedVal * availableAbove * 0.85;
          const y = baselineY - barHeight - twoKmInPx;
          nonZeroPoints.push({ x, y });
        }
      });

      // Calculate moving average (window of 3)
      const linePoints: { x: number; y: number }[] = [];
      const windowSize = 3;
      for (let i = 0; i < nonZeroPoints.length; i++) {
        let sumY = 0;
        let count = 0;
        const start = Math.max(0, i - Math.floor(windowSize / 2));
        const end = Math.min(nonZeroPoints.length - 1, i + Math.floor(windowSize / 2));
        for (let j = start; j <= end; j++) {
          sumY += nonZeroPoints[j].y;
          count++;
        }
        linePoints.push({ x: nonZeroPoints[i].x, y: sumY / count });
      }

      let linePath = '';
      if (linePoints.length >= 2) {
        linePath = `M ${linePoints[0].x} ${linePoints[0].y}`;
        for (let j = 0; j < linePoints.length - 1; j++) {
          const p0 = linePoints[Math.max(j - 1, 0)];
          const p1 = linePoints[j];
          const p2 = linePoints[j + 1];
          const p3 = linePoints[Math.min(j + 2, linePoints.length - 1)];
          const tension = 0.1;
          linePath += ` C ${p1.x + (p2.x - p0.x) * tension} ${p1.y + (p2.y - p0.y) * tension}, ${p2.x - (p3.x - p1.x) * tension} ${p2.y - (p3.y - p1.y) * tension}, ${p2.x} ${p2.y}`;
        }
      } else if (linePoints.length === 1) {
        linePath = `M ${linePoints[0].x} ${linePoints[0].y}`;
      }

      return (
        <>
          {/* Running label - top left */}
          <text x={0} y={6} textAnchor="start" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.04em',
            fill: '#1a1a1a',
            textTransform: 'uppercase',
          }}>RUNNING</text>

          {/* Total sum - top right */}
          <text x={W} y={6} textAnchor="end" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.04em',
            fill: '#1a1a1a',
          }}>{Math.round(runningValues.reduce((a, b) => a + b, 0)).toLocaleString()}<tspan fontSize="10px">KM</tspan></text>

          {/* X axis at 0km */}
          <line x1={0} y1={baselineY} x2={W} y2={baselineY} stroke="rgba(0,0,0,0.12)" strokeWidth="1" />

          {/* Line connecting tops of non-zero bars */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#lineFade)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Bars from 0 baseline - full width */}
          {runningValues.map((val, i) => {
            const x = (i / Math.max(runningValues.length - 1, 1)) * drawW + PAD - barWidth / 2;
            const isZero = val <= 0;
            const normalizedVal = val / maxVal;
            const barHeight = isZero ? 3 : normalizedVal * availableAbove * 0.85;
            const y = baselineY - barHeight;
            const shadowHeight = isZero ? 1 : normalizedVal * availableBelow * 0.85;

            return (
              <g key={i}>
                {/* Mirror shadow below baseline */}
                <rect
                  x={x}
                  y={baselineY}
                  width={barWidth}
                  height={Math.max(shadowHeight, 1)}
                  fill="#1a1a1a"
                  opacity={isZero ? 0.05 : 0.25}
                />
                {/* Main bar above baseline */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 1)}
                  fill="#0a0a0a"
                  opacity={isZero ? 0.1 : 0.8}
                />
              </g>
            );
          })}
        </>
      );
    }

    // View 4: AllWeights (Weekly total of Chest + Back + Legs)
    if (view === 'allweights' && allWeightsValues.length > 0) {
      const weeklyTotals = allWeightsValues.map(w => w.chest + w.back + w.legs);
      const yMin = 50000;
      const yMax = 90000;
      const totalAll = weeklyTotals.reduce((sum, val) => sum + val, 0);
      const PAD = 14;
      const drawW = W - PAD * 2;
      const baselineY = H - 2;
      const availableHeight = baselineY - 20;

      const barWidth = Math.max(3, (drawW / allWeightsValues.length) - 2);

      return (
        <>
          {/* AllWeights label - top left */}
          <text x={0} y={6} textAnchor="start" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.04em',
            fill: '#1a1a1a',
            textTransform: 'uppercase',
          }}>ALL WEIGHTS</text>

          {/* Total sum - top right */}
          <text x={W} y={6} textAnchor="end" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.04em',
            fill: '#1a1a1a',
          }}>{Math.round(totalAll).toLocaleString()}<tspan fontSize="10px">KG</tspan></text>

          {/* Single bar for each week */}
          {weeklyTotals.map((val, i) => {
            const x = (i / Math.max(allWeightsValues.length - 1, 1)) * drawW + PAD - barWidth / 2;
            const clampedVal = Math.min(Math.max(val, yMin), yMax);
            const normalizedVal = (clampedVal - yMin) / (yMax - yMin);
            const height = val <= yMin ? 2 : normalizedVal * availableHeight * 0.85;
            const y = baselineY - height;
            const isSelected = selectedBarIdx === i;

            // Hit area (wider for easier clicking)
            const hitWidth = Math.max(barWidth + 8, 16);
            const hitX = x - (hitWidth - barWidth) / 2;

            return (
              <g key={allWeightsValues[i].week}>
                {/* Invisible wider hit area */}
                <rect
                  x={hitX}
                  y={0}
                  width={hitWidth}
                  height={baselineY}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedBarIdx(isSelected ? null : i)}
                />
                {/* Dotted background */}
                <rect
                  x={x}
                  y={20}
                  width={barWidth}
                  height={baselineY - 20}
                  fill="url(#barDots)"
                  style={{ pointerEvents: 'none' }}
                />
                {/* Main bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(height, 1)}
                  fill="#404040"
                  style={{ pointerEvents: 'none' }}
                  rx="1"
                  ry="1"
                />
                {/* Pill badge on selected bar - below bar */}
                {isSelected && (
                  <>
                    {/* Pill background */}
                    <rect
                      x={x + barWidth / 2 - 24}
                      y={baselineY + 4}
                      width={48}
                      height={14}
                      rx={7}
                      ry={7}
                      fill="#e8e8e8"
                    />
                    {/* Pill value text */}
                    <text
                      x={x + barWidth / 2}
                      y={baselineY + 14}
                      textAnchor="middle"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '8px',
                        fontWeight: 700,
                        fill: '#1a1a1a',
                        letterSpacing: '0.02em',
                        pointerEvents: 'none',
                      }}
                    >
                      {Math.round(val) >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val).toLocaleString()}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </>
      );
    }

    // View 5: Calories (curved line chart)
    if (view === 'calories' && caloriesValues.length > 0) {
      const avgCal = caloriesValues.length > 0 ? caloriesValues.reduce((a, b) => a + b, 0) / caloriesValues.length : 0;
      const minCal = 1000;
      const maxCal = 1800;
      const calRange = maxCal - minCal;
      const referenceCal = 1300; // X-axis crosses at 1300
      
      // Y range: top = 1800, bottom = 1000
      const topY = 25;
      const bottomY = H - 35;
      const chartH = bottomY - topY;

      // Generate smooth Catmull-Rom curve points, padded with 1300 at start/end
      const points: { x: number; y: number }[] = [];
      const drawW = W;
      
      // Start at 1300 (left edge)
      const startY = bottomY - ((referenceCal - minCal) / calRange) * chartH;
      points.push({ x: 0, y: startY });
      
      // Data points spread across the middle
      const innerDrawW = drawW * 0.9;
      const innerOffset = drawW * 0.05;
      for (let i = 0; i < caloriesValues.length; i++) {
        const x = innerOffset + (i / Math.max(caloriesValues.length - 1, 1)) * innerDrawW;
        const clampedVal = Math.max(minCal, Math.min(maxCal, caloriesValues[i]));
        const y = bottomY - ((clampedVal - minCal) / calRange) * chartH;
        points.push({ x, y });
      }
      
      // End at 1300 (right edge)
      points.push({ x: drawW, y: startY });

      // Build Catmull-Rom spline path
      let pathD = '';
      if (points.length > 0) {
        pathD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(i - 1, 0)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(i + 2, points.length - 1)];
          const tension = 0.3;
          pathD += ` C ${p1.x + (p2.x - p0.x) * tension} ${p1.y + (p2.y - p0.y) * tension}, ${p2.x - (p3.x - p1.x) * tension} ${p2.y - (p3.y - p1.y) * tension}, ${p2.x} ${p2.y}`;
        }
      }

      // Decorative waves - same X points as main line, but Y offsets that converge to 0
      const decoStartOffsets = [3, 7, 13, 20, 27];
      const decoOpacities = [0.85, 0.75, 0.65, 0.55, 0.45];

      const buildConvergingPath = (startOffset: number): string => {
        if (points.length < 2) return '';
        const n = points.length - 1;
        let d = `M ${points[0].x} ${points[0].y + startOffset}`;
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(i - 1, 0)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(i + 2, points.length - 1)];
          // Offset stays nearly constant then gradually converges to 0
          const progress = i / Math.max(n - 1, 1);
          // Start gradual convergence after 60% of the chart
          const convergeStart = 0.6;
          const localProgress = progress < convergeStart ? 0 : (progress - convergeStart) / (1 - convergeStart);
          const offset = startOffset * Math.pow(1 - localProgress, 2);
          const tension = 0.3;
          const cp1x = p1.x + (p2.x - p0.x) * tension;
          const cp1y = p1.y + (p2.y - p0.y) * tension + offset;
          const cp2x = p2.x - (p3.x - p1.x) * tension;
          const cp2y = p2.y - (p3.y - p1.y) * tension + offset;
          const endY = p2.y + offset;
          d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${endY}`;
        }
        return d;
      };

      return (
        <>
          {/* Calories label - top left */}
          <text x={0} y={16} textAnchor="start" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.04em',
            fill: '#1a1a1a',
            textTransform: 'uppercase',
          }}>CALORIES</text>

          {/* Average - top right */}
          <text x={W} y={16} textAnchor="end" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.04em',
            fill: '#1a1a1a',
          }}>{Math.round(avgCal).toLocaleString()}<tspan fontSize="10px">KCAL</tspan></text>

          {/* Alternating background bars for each week */}
          {caloriesValues.map((_, i) => {
            const barWidth = innerDrawW / Math.max(caloriesValues.length - 1, 1);
            const x = innerOffset + (i / Math.max(caloriesValues.length - 1, 1)) * innerDrawW - barWidth / 2;
            const isEven = i % 2 === 0;
            return (
              <rect
                key={`bg-bar-${i}`}
                x={x}
                y={20}
                width={barWidth}
                height={H - 20}
                fill={isEven ? 'url(#barFade)' : 'url(#barFadeDark)'}
              />
            );
          })}

          {/* Reference line through start/end point level */}
          <line x1={0} y1={startY} x2={W} y2={startY} stroke="rgba(0,0,0,0.6)" strokeWidth="0.5" strokeDasharray="2 3" />

          {/* Decorative lines - converge to main line by the end */}
          {decoStartOffsets.map((startOff, i) => {
            const path = buildConvergingPath(startOff);
            const lineWidth = i < 2 ? 2 : (2 - (i - 1) * 0.4);
            return (
              <path
                key={`deco-${i}`}
                d={path}
                fill="none"
                stroke="#0a0a0a"
                strokeWidth={lineWidth}
                opacity={decoOpacities[i]}
                strokeLinecap="round"
              />
            );
          })}

          {/* Main curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#0a0a0a"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      );
    }

    // View 1: Overview
    return (
      <>
        {/* Start date marker */}
        <line x1={0} y1={midY} x2={0} y2={16} stroke="#1a1a1a" strokeWidth="1.2" opacity="0.5" />
        <circle cx={0} cy={16} r={5} fill="#1a1a1a" />
        <text x={14} y={12} textAnchor="start" style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '16px',
          fontWeight: 500,
          letterSpacing: '0.04em',
          fill: '#1a1a1a',
          textTransform: 'uppercase',
        }}>{fmtDate(actualFirstDate)}</text>

        {/* End date marker */}
        <line x1={W} y1={midY} x2={W} y2={H - 16} stroke="#1a1a1a" strokeWidth="1.2" opacity="0.5" />
        <circle cx={W} cy={H - 16} r={5} fill="#1a1a1a" />
        <text x={W - 14} y={H - 8} textAnchor="end" style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '16px',
          fontWeight: 500,
          letterSpacing: '0.04em',
          fill: '#1a1a1a',
          textTransform: 'uppercase',
        }}>{fmtDate(lastDate)}</text>

        {/* Thick blurred gradient lines */}
        {thickLines.map((t, i) => (
          <path
            key={`thick-${i}`}
            d={generateSmoothCurve(t.seed, t.amp, t.freq, t.phase)}
            fill="none"
            stroke={`url(#${t.gradient})`}
            strokeWidth={t.width}
            strokeLinecap="round"
            filter={`url(#heavyBlur${i + 1})`}
          />
        ))}

        {/* Regular curves */}
        {curves.map((c, i) => (
          <path
            key={i}
            d={generateSmoothCurve(c.seed, c.amp, c.freq, c.phase)}
            fill="none"
            stroke={c.stroke}
            strokeWidth={c.width}
            opacity={c.opacity}
            strokeLinecap="round"
            filter="url(#lineShadow)"
          />
        ))}
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ marginBottom: '0px', touchAction: 'pan-y' }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: '180px', display: 'block' }}
      >
        <defs>
          <pattern id="barDots" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.5" fill="rgba(0,0,0,0.28)" />
          </pattern>
          <filter id="lineShadow" x="-10%" y="-20%" width="120%" height="150%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feOffset dx="0" dy="1.5" in="blur" result="offset" />
            <feComponentTransfer in="offset" result="shadow">
              <feFuncA type="linear" slope="0.15"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="blur1"><feGaussianBlur stdDeviation="1" /></filter>
          <filter id="blur2"><feGaussianBlur stdDeviation="2" /></filter>
          <filter id="heavyBlur1"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="blur4"><feGaussianBlur stdDeviation="4" /></filter>
          <filter id="heavyBlur2"><feGaussianBlur stdDeviation="5" /></filter>
          <filter id="heavyBlur3"><feGaussianBlur stdDeviation="8" /></filter>

          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#1a1a1a" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#1a1a1a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.25" />
            <stop offset="40%" stopColor="#1a1a1a" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="barFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="20%" stopColor="rgba(0,0,0,0.015)" />
            <stop offset="80%" stopColor="rgba(0,0,0,0.015)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="barFadeDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="20%" stopColor="rgba(0,0,0,0.03)" />
            <stop offset="80%" stopColor="rgba(0,0,0,0.03)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="lineFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {renderContent()}
      </svg>

      {/* View indicator dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '-4px' }}>
        <div
          onClick={() => setView('overview')}
          style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: view === 'overview' ? '#1a1a1a' : 'rgba(0,0,0,0.15)',
            transition: 'background-color 0.2s',
            cursor: 'pointer',
          }}
        />
        <div
          onClick={() => setView('tracker')}
          style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: view === 'tracker' ? '#1a1a1a' : 'rgba(0,0,0,0.15)',
            transition: 'background-color 0.2s',
            cursor: 'pointer',
          }}
        />
        <div
          onClick={() => setView('running')}
          style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: view === 'running' ? '#1a1a1a' : 'rgba(0,0,0,0.15)',
            transition: 'background-color 0.2s',
            cursor: 'pointer',
          }}
        />
        <div
          onClick={() => setView('allweights')}
          style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: view === 'allweights' ? '#1a1a1a' : 'rgba(0,0,0,0.15)',
            transition: 'background-color 0.2s',
            cursor: 'pointer',
          }}
        />
        <div
          onClick={() => setView('calories')}
          style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: view === 'calories' ? '#1a1a1a' : 'rgba(0,0,0,0.15)',
            transition: 'background-color 0.2s',
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  );
};
