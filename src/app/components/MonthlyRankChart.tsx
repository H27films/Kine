import React from 'react';

interface MonthlyRankData {
  label: string;
  km: number;
  originalKm: number;
}

interface MonthlyRankChartProps {
  allMonthData: MonthlyRankData[];
  selectedMonthLabel: string;
  getOrdinalSuffix: (n: number) => string;
  chartWidth: number;
  paddingX: number;
  plotWidth: number;
}

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export const MonthlyRankChart: React.FC<MonthlyRankChartProps> = ({
  allMonthData,
  selectedMonthLabel,
  getOrdinalSuffix,
  chartWidth,
  paddingX,
  plotWidth,
}) => {
  if (allMonthData.length === 0) return null;

  // Build a map of existing data by month index (0-11)
  const dataMap = new Map<number, MonthlyRankData>();
  allMonthData.forEach(d => {
    const [year, month] = d.label.split('-').map(Number);
    const monthIdx = month - 1;
    dataMap.set(monthIdx, d);
  });

  // Create all 12 months array (chronological, not sorted by value)
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const existing = dataMap.get(i);
    return {
      label: MONTH_LABELS[i],
      km: existing?.km || 0,
      originalKm: existing?.originalKm || 0,
      monthIndex: i,
      hasData: existing !== undefined,
    };
  });

  // Compute rank based on originalKm values
  const monthsWithData = allMonths.filter(m => m.hasData);
  const sortedDesc = [...monthsWithData].sort((a, b) => b.originalKm - a.originalKm);
  const totalMonths = monthsWithData.length;
  const selectedMonthIdx = parseInt(selectedMonthLabel.split('-')[1]) - 1;
  const currentRank = sortedDesc.findIndex(m => m.monthIndex === selectedMonthIdx) + 1;
  const maxMonthKm = Math.max(...monthsWithData.map(m => m.originalKm));

  const availableWidth = plotWidth;
  const slotWidth = Math.max(4, Math.floor(availableWidth / allMonths.length));
  const barWidthPx = 1.3;
  const containerHeight = 70;
  const maxBarHeight = 58;

  return (
    <div style={{ marginTop: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          MONTHLY RANK
        </div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', fontFamily: "'JetBrains Mono', monospace" }}>
          {currentRank > 0 ? `${currentRank}${getOrdinalSuffix(currentRank)} / ${totalMonths}` : `— / ${totalMonths}`}
        </div>
      </div>
      <div style={{ height: containerHeight, position: 'relative' }}>
        <svg
          width="100%"
          height={containerHeight}
          viewBox={`0 0 ${chartWidth} ${containerHeight}`}
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="monthlyRankConnectorGradient" gradientUnits="userSpaceOnUse" x1="0" y1={containerHeight - 50} x2="0" y2={containerHeight}>
              <stop offset="0%" stop-color="rgba(0,0,0,0.2)" />
              <stop offset="100%" stop-color="rgba(0,0,0,0.01)" />
            </linearGradient>
          </defs>
          {(() => {
            const monthDataPoints = allMonths.map((month, idx) => {
              const barH = month.originalKm > 0 ? Math.max(2, (month.originalKm / maxMonthKm) * maxBarHeight) : 1;
              const x = paddingX + idx * slotWidth + (slotWidth - barWidthPx) / 2;
              const topY = containerHeight - barH;
              const elevatedY = topY - 8;
              return { month, idx, x, barH, topY, elevatedY, isCurrent: month.monthIndex === selectedMonthIdx };
            });

            const buildSmoothPath = (pts: {x: number, y: number}[]) => {
              if (pts.length < 2) return '';
              let d = `M ${pts[0].x} ${pts[0].y}`;
              for (let i = 0; i < pts.length - 1; i++) {
                const p0 = pts[i === 0 ? i : i - 1];
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const p3 = pts[i + 2] || p2;
                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;
                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
              }
              return d;
            };

            const connectorPath = buildSmoothPath(monthDataPoints.map(w => ({ x: w.x, y: w.elevatedY })));

            const connector = monthDataPoints.length > 1 && (
              <path
                d={connectorPath}
                fill="none"
                stroke="url(#monthlyRankConnectorGradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );

            const bars = monthDataPoints.map(({ month, x, topY, isCurrent }) => {
              return (
                <g key={month.monthIndex}>
                  <line
                    className="bar-animate"
                    x1={x + barWidthPx / 2}
                    y1={containerHeight}
                    x2={x + barWidthPx / 2}
                    y2={topY}
                    stroke="#1a1a1a"
                    strokeWidth={barWidthPx}
                    strokeLinecap="round"
                    strokeOpacity={month.hasData ? 1 : 0.3}
                  />
                  {isCurrent && month.hasData && (
                    <circle
                      cx={x + barWidthPx / 2}
                      cy={topY - 8}
                      r="4"
                      fill="#1a1a1a"
                    />
          )}
        </svg>
      </div>
    </div>
  );
};
