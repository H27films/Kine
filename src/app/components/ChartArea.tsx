import React, { useState } from 'react';

interface DataPoint {
  occurrence: number;
  value: number;
  date: string;
  workoutId: string;
}

interface ChartAreaProps {
  mode: 'exercise' | 'aggregate';
  data: DataPoint[];
  total: number;
  sessionCount: number;
  metricLabel: string;
  selectedExercise?: string | null;
  category: string;
  pbCounts?: Record<number, number>;
  exerciseCounts?: Record<number, number>;
}

export const ChartArea: React.FC<ChartAreaProps> = ({ mode, data, total, sessionCount, metricLabel, selectedExercise, category, pbCounts = {}, exerciseCounts = {} }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const displayTotal = total.toLocaleString();

  // SVG chart dimensions
  const chartHeight = 220;
  const chartWidth = 340; // approximate width based on container
  const paddingX = 8;
  const paddingY = 20;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingY * 2;

  const minValue = data.length > 0 ? Math.min(...data.map(d => d.value)) : 0;
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 100;

  // Y-scale based on mode
  let yMin: number, yMax: number;
  if (mode === 'exercise') {
    yMin = minValue - (maxValue - minValue) * 0.3;
    yMax = maxValue;
  } else {
    yMin = Math.min(0, minValue - (maxValue - minValue) * 0.1);
    yMax = maxValue + (maxValue - minValue) * 0.1 || 10;
  }

  const getX = (idx: number) => paddingX + (idx / Math.max(data.length - 1, 1)) * plotWidth;
  const getY = (val: number) => paddingY + plotHeight - ((val - yMin) / (yMax - yMin)) * plotHeight;

  // Bar chart mode when exercise selected
  // Fixed bar width with adjustable spacing
  const desiredBarWidth = 22; // max width, similar to chest press pulley 3-set view
  const minBarWidth = 8;
  const maxBarWidth = desiredBarWidth;
  const maxBars = 10; // Maximum number of bars to display with fixed spacing

  let barWidth: number;
  let barSpacing: number;

  if (data.length === 0) {
    barWidth = 0;
    barSpacing = 0;
  } else if (data.length === 1) {
    barWidth = Math.min(desiredBarWidth, plotWidth);
    barSpacing = 0;
  } else if (data.length > maxBars) {
    // More than 10 points: decrease spacing to fit all
    const totalGapCount = data.length - 1;
    const minGap = 4;
    const availableForBars = plotWidth - minGap * totalGapCount;
    barWidth = Math.max(minBarWidth, availableForBars / data.length);
    barSpacing = minGap;
  } else {
    // Up to 10 points: spacing to fit 10 bars across the width
    barWidth = desiredBarWidth;
    barSpacing = (plotWidth - maxBars * barWidth) / (maxBars - 1);
  }

  // Height of a bar representing the max value (for background reference)
  const maxBarHeight = data.length > 0 && maxValue > minValue
    ? ((maxValue - yMin) / (yMax - yMin)) * plotHeight
    : 0;

  // Color based on value relative to range - gradient from light grey to black
  const getBarColor = (val: number) => {
    if (maxValue === minValue) return '#1a1a1a';
    const normalized = (val - minValue) / (maxValue - minValue);
    // Interpolate from #cccccc (light grey) to #1a1a1a (near black)
    const intensity = Math.round(204 - (204 - 26) * normalized);
    return `rgb(${intensity}, ${intensity}, ${intensity})`;
  };

  return (
    <>
      {/* Period header */}
      <div style={{
        fontFamily: "'Inconsolata', monospace",
        fontSize: '24px',
        fontWeight: 348,
        fontStretch: '175%',
        letterSpacing: '0.08em',
        color: mode === 'exercise' && selectedExercise ? '#1a1a1a' : 'rgba(0,0,0,0.2)',
        textTransform: 'uppercase',
        marginBottom: '4px'
      }}>
        {mode === 'exercise' && selectedExercise ? selectedExercise : <><span style={{color: '#1a1a1a'}}>{category}</span> PROGRESS</>}
      </div>

      {/* Big number */}
      <div className="flex items-start justify-between" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: '#1a1a1a' }}>
            {displayTotal}
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.15em', color: '#999', textTransform: 'uppercase' }}>
            {metricLabel}
          </div>
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%',
            backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: '6px',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {sessionCount}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '220px', position: 'relative', marginBottom: '2px' }}>
        {data.length > 0 ? (
          mode === 'exercise' ? (
            // Bar chart for exercise
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
              {/* Background bars for exercise - always show for maxBars positions */}
              {Array.from({ length: maxBars }).map((_, i) => {
                const x = paddingX + i * (barWidth + barSpacing);
                const bgY = paddingY + plotHeight - maxBarHeight;
                return <rect key={`bg-${i}`} x={x} y={bgY} width={barWidth} height={maxBarHeight} fill="rgba(0,0,0,0.02)" rx="4" />;
              })}
              {/* Foreground bars for exercise */}
              {data.map((d, i) => {
                const x = paddingX + i * (barWidth + barSpacing);
                const barHeight = Math.max(4, ((d.value - yMin) / Math.max(yMax - yMin, 1)) * plotHeight);
                const y = paddingY + plotHeight - barHeight;
                const radius = barWidth / 2;
                const color = getBarColor(d.value);
                const isHovered = hoveredIdx === i;

                const tooltipX = x + barWidth / 2;
                const tooltipY = -10;

                return (
                  <g key={d.workoutId}>
                    <path
                      d={`M ${x},${y + barHeight} L ${x},${y + radius} A ${radius} ${radius} 0 0 1 ${x + barWidth},${y + radius} L ${x + barWidth},${y + barHeight} Z`}
                      fill={color}
                      style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                    {isHovered && (
                      <g>
                        <rect x={tooltipX - 28} y={tooltipY} width="56" height="28" rx="4" fill="rgba(0,0,0,0.06)" />
                        <text x={tooltipX} y={tooltipY + 18} textAnchor="middle" style={{ fontSize: '12px', fontWeight: 900, color: '#1a1a1a', fontFamily: "'JetBrains Mono', monospace" }}>{d.value.toLocaleString()}</text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          ) : (
            // Aggregate chart (bar chart)
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
              {/* Bars */}
              {data.map((d, i) => {
                const x = paddingX + i * (barWidth + barSpacing);
                const barHeight = Math.max(4, ((d.value - yMin) / Math.max(yMax - yMin, 1)) * plotHeight);
                const y = paddingY + plotHeight - barHeight;
                const isHovered = hoveredIdx === i;

                const bgY = paddingY;
                const bgHeight = plotHeight;
                const minVal = Math.min(...data.map(dd => dd.value), 0);
                const maxVal = Math.max(...data.map(dd => dd.value), minVal + 1);
                const pct = (d.value - minVal) / (maxVal - minVal);
                const opacity = isHovered ? 1 : (0.15 + (Math.max(pct, 0) * 0.85));

                const tooltipX = x + barWidth / 2;
                const tooltipY = -10;

                return (
                  <g key={d.workoutId}>
                    {/* Background bar */}
                    <path
                      d={`M ${x},${bgY + maxBarHeight} L ${x},${bgY + 2} A 2 2 0 0 1 ${x + barWidth},${bgY + 2} L ${x + barWidth},${bgY + maxBarHeight} Z`}
                      fill="rgba(0,0,0,0.02)"
                    />
                    {/* Foreground bar */}
                    <path
                      d={`M ${x},${y + barHeight} L ${x},${y + 2} A 2 2 0 0 1 ${x + barWidth},${y + 2} L ${x + barWidth},${y + barHeight} Z`}
                      fill="#1a1a1a"
                      fillOpacity={opacity}
                      style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s ease' }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                    {isHovered && (
                      <g>
                        <rect x={tooltipX - 28} y={tooltipY} width="56" height="28" rx="4" fill="rgba(0,0,0,0.06)" />
                        <text x={tooltipX} y={tooltipY + 18} textAnchor="middle" style={{ fontSize: '12px', fontWeight: 900, color: '#1a1a1a', fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(d.value).toLocaleString()}</text>
                      </g>
                    )}
                  </g>
                );
              })}
              {/* Moving average line chart */}
              {(() => {
                let linePath = '';
                if (data.length > 1) {
                  // Calculate moving average (3-point)
                  const maValues = data.map((_, i) => {
                    const start = Math.max(0, i - 1);
                    const end = Math.min(data.length - 1, i + 1);
                    const sum = data.slice(start, end + 1).reduce((s, dd) => s + dd.value, 0);
                    const count = end - start + 1;
                    return sum / count;
                  });
                  // Calculate points based on MA
                  const points = maValues.map((ma, i) => {
                    const barHeight = Math.max(4, ((ma - yMin) / Math.max(yMax - yMin, 1)) * plotHeight);
                    const y = paddingY + plotHeight - barHeight;
                    const y_line = y + barHeight * 0.05;
                    let x;
                    if (i === 0) {
                      x = paddingX; // left edge of first bar
                    } else if (i === maValues.length - 1) {
                      x = paddingX + i * (barWidth + barSpacing) + barWidth; // right edge of last bar
                    } else {
                      x = paddingX + i * (barWidth + barSpacing) + barWidth / 2; // center for middle
                    }
                    return { x, y: y_line };
                  });
                  // Build smooth path using cubic Bezier
                  for (let i = 0; i < points.length - 1; i++) {
                    const p0 = i > 0 ? points[i - 1] : points[i];
                    const p1 = points[i];
                    const p2 = points[i + 1];
                    const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
                    const cp1x = p1.x + (p2.x - p0.x) / 6;
                    const cp1y = p1.y + (p2.y - p0.y) / 6;
                    const cp2x = p2.x - (p3.x - p1.x) / 6;
                    const cp2y = p2.y - (p3.y - p1.y) / 6;
                    if (i === 0) {
                      linePath = `M ${p1.x} ${p1.y}`;
                    }
                    linePath += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
                  }
                }
                return data.length > 1 ? <path d={linePath} stroke="rgba(220,220,220,0.4)" strokeWidth="3" fill="none" /> : null;
              })()}
            </svg>
          )
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '12px' }}>
            No data for this selection
          </div>
        )}
      </div>

      {/* X-axis labels */}
      {mode === 'exercise' && data.length > 0 ? (
        // Bar chart: show occurrence numbers for all data positions
        <div style={{ position: 'relative', height: '12px' }}>
          {Array.from({ length: data.length > maxBars ? data.length : maxBars }).map((_, i) => {
            const barLeft = paddingX + i * (barWidth + barSpacing);
            const barCenter = barLeft + barWidth / 2;
            const leftPercent = (barCenter / chartWidth) * 100;
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${leftPercent}%`,
                  bottom: 0,
                  transform: 'translateX(-50%)',
                  fontSize: '9px',
                  fontWeight: 500,
                  color: '#1a1a1a',
                  letterSpacing: '0.02em',
                }}
              >
                {i + 1}
              </span>
            );
          })}
        </div>
      ) : mode === 'aggregate' && data.length > 0 ? (
        <div style={{ position: 'relative', height: '10px' }}>
          {data.map((point, i) => {
            const week = point?.occurrence || i + 1;
            const showLabel = i % 2 === 0; // Show every 2nd bar, starting from first
            const barLeft = paddingX + i * (barWidth + barSpacing);
            const barCenter = barLeft + barWidth / 2;
            const leftPercent = (barCenter / chartWidth) * 100;
            return showLabel ? (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${leftPercent}%`,
                  bottom: 0,
                  transform: 'translateX(-50%)',
                  fontSize: '9px',
                  fontWeight: 500,
                  color: '#1a1a1a',
                  letterSpacing: '0.02em',
                }}
              >
                {week}
              </span>
            ) : null;
          })}
        </div>
      ) : null}

      {/* MAX/AVG stats for aggregate mode */}
      {mode === 'aggregate' && data.length > 0 && (
        <div style={{ marginTop: '28px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: "'Inconsolata', monospace",
              fontSize: '22px',
              fontWeight: 348,
              fontStretch: '175%',
              letterSpacing: '0.06em',
              color: 'rgba(0,0,0,0.35)',
              textTransform: 'uppercase',
            }}>
              MAX
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', lineHeight: 1.1 }}>
              {Math.max(...data.map(d => d.value)).toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#1a1a1a', marginTop: '2px', textTransform: 'uppercase' }}>
              Week {data.reduce((max, d) => d.value > max.value ? d : max).occurrence}
            </div>
            {(() => {
              const maxWeek = data.reduce((max, d) => d.value > max.value ? d : max).occurrence;
              const pbCount = pbCounts[maxWeek] || 0;
              const totalExercises = exerciseCounts[maxWeek] || 0;
              const pbPercentage = totalExercises > 0 ? Math.round((pbCount / totalExercises) * 100) : 0;
              return pbCount > 0 ? (
                <div style={{ marginTop: '8px' }}>
                  <div style={{
                    fontFamily: "'Inconsolata', monospace",
                    fontSize: '22px',
                    fontWeight: 348,
                    fontStretch: '175%',
                    letterSpacing: '0.06em',
                    color: 'rgba(0,0,0,0.35)',
                    textTransform: 'uppercase',
                  }}>
                    PB
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', lineHeight: 1.1, display: 'inline' }}>
                      {pbCount}
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginLeft: '7px', marginRight: '4px' }}>/</span>
                    {pbPercentage > 0 && (
                      <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                        <svg width={36} height={36} viewBox="0 0 36 36">
                          {Array.from({ length: 20 }, (_, i) => {
                            const angle = (i / 20) * 2 * Math.PI - Math.PI / 2;
                            const cx = 18;
                            const cy = 18;
                            const r = 13;
                            const x = cx + r * Math.cos(angle);
                            const y = cy + r * Math.sin(angle);
                            const filled = Math.round((pbPercentage / 100) * 20);
                            return (
                              <circle
                                key={i}
                                cx={x} cy={y} r={1.5}
                                fill={i < filled ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.1)'}
                              />
                            );
                          })}
                          <text x={18} y={21} textAnchor="middle" fill="rgba(0,0,0,0.8)" fontSize="7" fontWeight="700">
                            {pbPercentage}%
                          </text>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'Inconsolata', monospace",
              fontSize: '22px',
              fontWeight: 348,
              fontStretch: '175%',
              letterSpacing: '0.06em',
              color: 'rgba(0,0,0,0.35)',
              textTransform: 'uppercase',
              textAlign: 'right',
            }}>
              AVG
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', lineHeight: 1.1 }}>
              {Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length).toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#1a1a1a', marginTop: '2px', textTransform: 'uppercase' }}>
              All weeks
            </div>
            {(() => {
              const totalPb = Object.values(pbCounts).reduce((sum, count) => sum + count, 0);
              const avgPb = data.length > 0 ? Math.round(totalPb / data.length) : 0;
              return totalPb > 0 ? (
                <div style={{ marginTop: '8px', textAlign: 'right' }}>
                  <div style={{
                    fontFamily: "'Inconsolata', monospace",
                    fontSize: '22px',
                    fontWeight: 348,
                    fontStretch: '175%',
                    letterSpacing: '0.06em',
                    color: 'rgba(0,0,0,0.35)',
                    textTransform: 'uppercase',
                    textAlign: 'right',
                  }}>
                    AVG
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', lineHeight: 1.1 }}>
                    {avgPb}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </>
  );
};