import React from 'react';

interface Props {
  weekChartData: number[];
}

const TrackerSparkline: React.FC<Props> = ({ weekChartData }) => {
  const hasData = weekChartData.some(v => v > 0);
  if (!hasData) return null;

  const sparkDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const BASE_KM = 1;
  const VW = 200;
  const VH = 90;
  const padTop = 22;
  const padBottom = 8;
  const padLeft = 6;
  const padRight = 6;
  const chartW = VW - padLeft - padRight;
  const chartH = VH - padTop - padBottom;
  const maxVal = Math.max(...weekChartData.filter(v => v > 0), BASE_KM, 0.1);
  const getY = (val: number) => padTop + (1 - val / maxVal) * chartH;

  const lineVals: (number | null)[] = weekChartData.map((val, i) => {
    if (val > 0) return val;
    if (i === 0 || i === 6) return BASE_KM;
    return null;
  });

  const linePts = lineVals
    .map((val, i) =>
      val !== null
        ? { x: padLeft + (i / 6) * chartW, y: getY(val), val, i, isAnchor: weekChartData[i] === 0 }
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
    <svg width="100%" viewBox={`0 0 ${VW} ${VH + 14}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <filter id="lcLineBlur1" x="-50%" y="-100%" width="200%" height="300%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="lcLineBlur2" x="-50%" y="-100%" width="200%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="lcDotBlur" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      {linePts.length > 0 && pathD && (
        <>
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="14" strokeLinecap="round" filter="url(#lcLineBlur1)" />
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="6" strokeLinecap="round" filter="url(#lcLineBlur2)" />
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {linePts.filter(p => !p.isAnchor).map((p, k) => (
        <g key={k}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="rgba(255,255,255,0.18)" filter="url(#lcDotBlur)" />
          <circle cx={p.x} cy={p.y} r="2" fill="white" />
          <text x={p.x} y={p.y - 6} textAnchor="middle" fill="rgba(255,255,255,0.70)" fontSize="4.5" fontWeight="700">
            {p.val}
          </text>
        </g>
      ))}
      {sparkDays.map((d, k) => (
        <text key={k} x={padLeft + (k / 6) * chartW} y={VH + 12} textAnchor="middle" fill="white" fontSize="4.5" fontWeight="700">
          {d}
        </text>
      ))}
    </svg>
  );
};

export default TrackerSparkline;
