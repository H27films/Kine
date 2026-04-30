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
}

export const ChartArea: React.FC<ChartAreaProps> = ({ mode, data, total, sessionCount, metricLabel }) => {
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

  // Add some padding to y-scale
  const yMin = Math.min(0, minValue - (maxValue - minValue) * 0.1);
  const yMax = maxValue + (maxValue - minValue) * 0.1 || 10;

  const getX = (idx: number) => paddingX + (idx / Math.max(data.length - 1, 1)) * plotWidth;
  const getY = (val: number) => paddingY + plotHeight - ((val - yMin) / (yMax - yMin)) * plotHeight;

  // Bar chart mode when exercise selected
  // Fixed bar width with adjustable spacing
  const desiredBarWidth = 22; // max width, similar to chest press pulley 3-set view
  const minBarWidth = 8;
  const maxBarWidth = desiredBarWidth;

  let barWidth: number;
  let barSpacing: number;

  if (data.length === 0) {
    barWidth = 0;
    barSpacing = 0;
  } else if (data.length === 1) {
    barWidth = Math.min(desiredBarWidth, plotWidth);
    barSpacing = 0;
  } else {
    const totalGapCount = data.length - 1;
    const requiredWidth = desiredBarWidth * data.length + 6 * totalGapCount;
    if (requiredWidth <= plotWidth) {
      barWidth = desiredBarWidth;
      const extraSpace = plotWidth - requiredWidth;
      barSpacing = 6 + extraSpace / totalGapCount;
    } else {
      const minGap = 4;
      const availableForBars = plotWidth - minGap * totalGapCount;
      barWidth = Math.max(minBarWidth, availableForBars / data.length);
      barSpacing = minGap;
    }
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
      <div style={{ fontFamily: "'Inconsolata', monospace", fontSize: '32px', fontWeight: 348, fontStretch: '175%', letterSpacing: '0.15em', color: 'rgba(0,0,0,0.2)', textTransform: 'uppercase', marginBottom: '8px' }}>
        PROGRESS
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
      <div style={{ height: '220px', position: 'relative', marginBottom: '4px' }}>
        {data.length > 0 ? (
          mode === 'exercise' ? (
            // Bar chart for exercise
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ overflow: 'visible' }}
            >
              {/* Bars for exercise */}
              {data.map((d, i) => {
                const x = paddingX + i * (barWidth + barSpacing);
                const barHeight = Math.max(4, ((d.value - yMin) / Math.max(yMax - yMin, 1)) * plotHeight);
                const y = paddingY + plotHeight - barHeight;
                const radius = barWidth / 2;
                const color = getBarColor(d.value);
                const isHovered = hoveredIdx === i;

                const bgY = paddingY + plotHeight - maxBarHeight;
                const tooltipX = x + barWidth / 2;
                const tooltipY = paddingY + plotHeight - maxBarHeight - 46;

                return (
                  <g key={d.workoutId}>
                    <rect x={x} y={bgY} width={barWidth} height={maxBarHeight} fill="rgba(0,0,0,0.02)" rx="4" />
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
              preserveAspectRatio="xMidYMid meet"
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
                const tooltipY = y - 46;

                return (
                  <g key={d.workoutId}>
                    {/* Background bar */}
                    <rect x={x} y={bgY} width={barWidth} height={bgHeight} fill="rgba(0,0,0,0.02)" rx="4" />
                    {/* Foreground bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill="#1a1a1a"
                      fillOpacity={opacity}
                      rx="4"
                      style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s ease' }}
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
          )
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '12px' }}>
            No data for this selection
          </div>
        )}
      </div>

      {/* X-axis labels */}
      {mode === 'exercise' && data.length > 0 ? (
        // Bar chart: show all occurrence numbers aligned with bars
        <div style={{ position: 'relative', height: '12px' }}>
          {data.map((point, i) => {
            const occurrence = point?.occurrence || i + 1;
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
                {occurrence}
              </span>
            );
          })}
        </div>
      ) : mode === 'aggregate' && data.length > 0 ? (
        <div style={{ position: 'relative', height: '12px' }}>
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
    </>
  );
};