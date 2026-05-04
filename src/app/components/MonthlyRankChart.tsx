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

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const ACCENT_COLOR = '#ff6b35'; // coral/orange

export const MonthlyRankChart: React.FC<MonthlyRankChartProps> = ({
  allMonthData,
  selectedMonthLabel,
  getOrdinalSuffix,
  chartWidth,
  paddingX,
  plotWidth,
}) => {
  if (allMonthData.length === 0) return null;

  // Build map of data by month index (0-11)
  const dataMap = new Map<number, MonthlyRankData>();
  allMonthData.forEach(d => {
    const [year, month] = d.label.split('-').map(Number);
    dataMap.set(month - 1, d);
  });

  // Create all 12 months in chronological order
  const allMonths = Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i,
    label: MONTH_NAMES[i],
    data: dataMap.get(i),
    hasData: dataMap.has(i),
    km: dataMap.get(i)?.originalKm || 0,
  }));

  // Compute rank based on km values
  const monthsWithData = allMonths.filter(m => m.hasData);
  const sortedDesc = [...monthsWithData].sort((a, b) => b.km - a.km);
  const totalMonths = monthsWithData.length;
  const selectedMonthIdx = parseInt(selectedMonthLabel.split('-')[1]) - 1;
  const currentRank = sortedDesc.findIndex(m => m.monthIndex === selectedMonthIdx) + 1;
  const maxKm = Math.max(...monthsWithData.map(m => m.km));

  const slotWidth = plotWidth / allMonths.length;
  const barWidthPx = 1.3;
  const containerHeight = 70;
  const maxDropHeight = 58;

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
          {(() => {
            const monthPoints = allMonths.map((month, idx) => {
              const x = paddingX + idx * slotWidth + slotWidth / 2;
              const dropHeight = month.km > 0 && maxKm > 0 ? (month.km / maxKm) * maxDropHeight : 0;
              const circleY = containerHeight - dropHeight;
              const isPeak = month.km === maxKm && month.km > 0;
              const circleRadius = isPeak ? 8 : 5; // 16px dia peak, 10px normal
              const isCurrent = month.monthIndex === selectedMonthIdx;
              return { month, idx, x, circleY, dropHeight, circleRadius, isPeak, isCurrent, hasData: month.hasData };
            });

            return (
              <>
                {/* Drop lines first (behind circles) */}
                {monthPoints.map((pt, i) => (
                  pt.hasData ? (
                    <line
                      key={`drop-${i}`}
                      className="bar-animate"
                      x1={pt.x}
                      y1={containerHeight}
                      x2={pt.x}
                      y2={pt.circleY}
                      stroke={ACCENT_COLOR}
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  ) : null
                ))}

                {/* Circles */}
                {monthPoints.map((pt, i) => (
                  pt.hasData ? (
                    <circle
                      key={`circle-${i}`}
                      cx={pt.x}
                      cy={pt.circleY}
                      r={pt.circleRadius}
                      fill={ACCENT_COLOR}
                      style={{ filter: pt.isPeak ? 'drop-shadow(0 0 4px rgba(255, 107, 53, 0.5))' : undefined }}
                    />
                  ) : null
                ))}

                {/* Value labels (rotated 90° CW, above circle) */}
                {monthPoints.map((pt, i) => (
                  pt.hasData ? (
                    <text
                      key={`val-${i}`}
                      x={pt.x}
                      y={pt.circleY - pt.circleRadius - 6}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={ACCENT_COLOR}
                      fontSize="12px"
                      fontWeight="600"
                      fontFamily="'JetBrains Mono', monospace"
                      style={{ transformOrigin: `${pt.x}px ${pt.circleY - pt.circleRadius - 6}px` }}
                    >
                      <tspan transform={`rotate(90, ${pt.x}, ${pt.circleY - pt.circleRadius - 6})`}>
                        {pt.km.toFixed(1)}
                      </tspan>
                    </text>
                  ) : null
                ))}

                {/* X-axis month labels (rotated 90° CW, centered under each slot) */}
                {allMonths.map((month, idx) => {
                  const x = paddingX + idx * slotWidth + slotWidth / 2;
                  const labelY = containerHeight + 12;
                  return (
                    <text
                      key={`label-${idx}`}
                      x={x}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={month.hasData ? '#666' : '#ccc'}
                      fontSize="11px"
                      fontWeight="500"
                      fontFamily="'JetBrains Mono', monospace"
                      style={{ transformOrigin: `${x}px ${labelY}px` }}
                    >
                      <tspan transform={`rotate(90, ${x}, ${labelY})`}>
                        {month.label}
                      </tspan>
                    </text>
                  );
                })}
              </>
            );
          })()}
        </svg>
      </div>
    </div>
  );
};
