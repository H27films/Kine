import React from 'react';

interface Props {
  weeklyBars: number[];
}

const CaloriesSparkline: React.FC<Props> = ({ weeklyBars }) => {
  const BASE_CAL = 500;
  const VW = 200;
  const VH = 90;
  const padTop = 22;
  const padBottom = 8;
  const padLeft = 6;
  const padRight = 6;
  const chartW = VW - padLeft - padRight;
  const chartH = VH - padTop - padBottom;
  const maxVal = Math.max(...weeklyBars.filter(v => v > 0), BASE_CAL, 0.1);
  const getY = (val: number) => padTop + (1 - val / maxVal) * chartH;

  // Average of days that have data
  const daysWithData = weeklyBars.filter(v => v > 0);
  const avgKcal = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((a, b) => a + b, 0) / daysWithData.length)
    : null;
  const avgLabel = avgKcal !== null
    ? avgKcal >= 1000 ? `avg ${(avgKcal / 1000).toFixed(1)}k` : `avg ${avgKcal}`
    : null;

  const lineVals: (number | null)[] = weeklyBars.map((val, i) => {
    if (val > 0) return val;
    if (i === 0 || i === 6) return BASE_CAL;
    return null;
  });

  const linePts = lineVals
    .map((val, i) =>
      val !== null
        ? { x: padLeft + (i / 6) * chartW, y: getY(val), val, i, isAnchor: weeklyBars[i] === 0 }
        : null
    )
    .filter((p): p is { x: number; y: number; val: number; i: number; isAnchor: boolean } => p !== null);

  let pathD = '';
  if (linePts.length === 1) {
    pathD = `M ${linePts[0].x} ${linePts[0].y}`;
  } else if (linePts.length > 1) {
    pathD = `M ${linePts[0].x} ${linePts[0].y}`;
    for (let k = 1; k < linePts.length; k++) {
      const prev = linePts[k - 1];
      const curr = linePts[k];
      const cpx = (prev.x + curr.x) / 2;
      pathD += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
  }

  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <filter id="calLineBlur1" x="-50%" y="-100%" width="200%" height="300%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="calLineBlur2" x="-50%" y="-100%" width="200%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="calDotBlur" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      {linePts.length > 0 && pathD && (
        <>
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="14" strokeLinecap="round" filter="url(#calLineBlur1)" />
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="6" strokeLinecap="round" filter="url(#calLineBlur2)" />
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {linePts.filter(p => !p.isAnchor).map((p, k) => (
        <g key={k}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="rgba(255,255,255,0.18)" filter="url(#calDotBlur)" />
          <circle cx={p.x} cy={p.y} r="2" fill="white" />
          <text x={p.x} y={p.y - 6} textAnchor="middle" fill="rgba(255,255,255,0.70)" fontSize="5" fontWeight="700">
            {p.val > 0 ? (p.val >= 1000 ? `${(p.val / 1000).toFixed(1)}k` : p.val) : ''}
          </text>
        </g>
      ))}
      {/* Average label — bottom right, Space Grotesk style */}
      {avgLabel && (
        <text
          x={VW - padRight}
          y={VH - 2}
          textAnchor="end"
          fill="rgba(255,255,255,0.45)"
          fontSize="7"
          fontWeight="600"
          fontFamily="'Space Grotesk', 'Inter', sans-serif"
          letterSpacing="0.04em"
        >
          {avgLabel}
        </text>
      )}
    </svg>
  );
};

export default CaloriesSparkline;
