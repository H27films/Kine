import React from 'react';

interface Props {
  weekChartData: number[];
}

const TrackerSparkline: React.FC<Props> = ({ weekChartData }) => {
  const hasData = weekChartData.some(v => v > 0);
  if (!hasData) return null;

  const sparkDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // Fixed minimum 4km, dynamic maximum based on data
  const Y_MIN = 4;
  const dataMax = Math.max(...weekChartData);
  const Y_MAX = Math.max(dataMax, Y_MIN + 1);
  const range = Y_MAX - Y_MIN;
  const VW = 200;
  const VH = 120;
  const padTop = 10;
  const padBottom = 8;
  const padLeft = 6;
  const padRight = 6;
  const chartW = VW - padLeft - padRight;
  const chartH = VH - padTop - padBottom;

  const CIRCLE_RADIUS = 2.5;
  const CIRCLE_GAP = 1.2;
  const CIRCLE_STEP = CIRCLE_RADIUS * 2 + CIRCLE_GAP;

  const getCircleCount = (val: number) => {
    // Clamp values: below 4km = bottom circle, above 20km = full height
    const clamped = Math.max(Y_MIN, Math.min(val, Y_MAX));
    const ratio = (clamped - Y_MIN) / range;
    return Math.max(1, Math.round(ratio * Math.floor(chartH / CIRCLE_STEP)));
  };

  const maxCircles = Math.floor(chartH / CIRCLE_STEP);

  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${VH + 14}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <filter id="topCircleGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* Background stacked circles - continuous full width grid */}
      {Array.from({ length: maxCircles }).map((_, circleIdx) => {
        const y = padTop + chartH - (circleIdx * CIRCLE_STEP) - CIRCLE_RADIUS;
        const dotsPerRow = Math.floor(chartW / (CIRCLE_RADIUS * 2 + 0.5));
        const dotSpacing = chartW / dotsPerRow;

        return Array.from({ length: dotsPerRow }).map((_, dotIdx) => {
          const x = padLeft + dotIdx * dotSpacing + dotSpacing / 2;
          return (
            <circle
              key={`bg-${circleIdx}-${dotIdx}`}
              cx={x}
              cy={y}
              r={CIRCLE_RADIUS}
              fill="rgba(255, 255, 255, 0.06)"
            />
          );
        });
      })}

      {/* Value stacked circles (greyish white) */}
      {weekChartData.map((val, i) => {
        if (val <= 0) return null;

        const x = padLeft + (i / 6) * chartW;
        const circleCount = getCircleCount(val);

        return Array.from({ length: circleCount }).map((_, circleIdx) => {
          const y = padTop + chartH - (circleIdx * CIRCLE_STEP) - CIRCLE_RADIUS;
          const isTop = circleIdx === circleCount - 1;

          return (
            <g key={`val-${i}-${circleIdx}`}>
              {isTop ? (
                <>
                  <circle cx={x} cy={y} r={CIRCLE_RADIUS + 1} fill="rgba(255, 255, 255, 0.15)" filter="url(#topCircleGlow)" />
                  <circle cx={x} cy={y} r={CIRCLE_RADIUS} fill="white" />
                  <text x={x} y={y - 6} textAnchor="middle" fill="rgba(255, 255, 255, 0.70)" fontSize="6" fontWeight="700">
                    {val.toFixed(1)}
                  </text>
                </>
              ) : (
                <circle cx={x} cy={y} r={CIRCLE_RADIUS} fill="rgba(255, 255, 255, 0.35)" />
              )}
            </g>
          );
        });
      })}

      {/* Day labels */}
      {sparkDays.map((d, k) => (
        <text key={k} x={padLeft + (k / 6) * chartW} y={VH + 12} textAnchor="middle" fill="white" fontSize="4.5" fontWeight="700">
          {d}
        </text>
      ))}
    </svg>
  );
};

export default TrackerSparkline;