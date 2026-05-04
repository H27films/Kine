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
const ACCENT_COLOR = '#ff6b35';

export const MonthlyRankChart: React.FC<MonthlyRankChartProps> = ({
  allMonthData,
  selectedMonthLabel,
  getOrdinalSuffix,
  chartWidth,
  paddingX,
  plotWidth,
}) => {
  if (allMonthData.length === 0) return null;

  const dataMap = new Map<number, MonthlyRankData>();
  allMonthData.forEach(d => {
    const [year, month] = d.label.split('-').map(Number);
    dataMap.set(month - 1, d);
  });

  const allMonths = Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i,
    label: MONTH_NAMES[i],
    hasData: dataMap.has(i),
    km: dataMap.get(i)?.originalKm || 0,
  }));

  const monthsWithData = allMonths.filter(m => m.hasData);
  const sortedDesc = [...monthsWithData].sort((a, b) => b.km - a.km);
  const totalMonths = monthsWithData.length;
  const selectedMonthIdx = parseInt(selectedMonthLabel.split('-')[1]) - 1;
  const currentRank = sortedDesc.findIndex(m => m.monthIndex === selectedMonthIdx) + 1;
  const maxKm = Math.max(...monthsWithData.map(m => m.km));

  // Layout: give more vertical room, push baseline down
  const headerSpace = 0; // space reserved for header
  const topMargin = 20; // space above highest circle — pushes peak away from header
  const baselineY = 105; // baseline position from top of chart area
  const maxBarHeight = 55; // max height of drop line from baseline upward
  const containerHeight = 150; // total height including month labels below
  const slotWidth = plotWidth / allMonths.length;
  const labelY = baselineY + 18; // month labels below baseline

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
            const points = allMonths.map((month, idx) => {
              const x = paddingX + idx * slotWidth + slotWidth / 2;
              const normalizedH = month.km > 0 && maxKm > 0 ? month.km / maxKm : 0;
              const dropH = normalizedH * maxBarHeight;
              const circleY = baselineY - dropH;
              const isPeak = month.km === maxKm && month.km > 0;
              const circleRadius = isPeak ? 8 : 5; // 16px / 10px diameter
              const isCurrent = month.monthIndex === selectedMonthIdx;
              return { month, idx, x, circleY, dropH, circleRadius, isPeak, isCurrent, normalizedH };
            });

            return (
              <>
                {/* Vertical drop lines */}
                {points.map((pt, i) => (
                  pt.month.hasData && pt.normalizedH > 0 ? (
                    <line
                      key={`drop-${i}`}
                      x1={pt.x}
                      y1={baselineY}
                      x2={pt.x}
                      y2={pt.circleY}
                      stroke={ACCENT_COLOR}
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  ) : null
                ))}

                {/* Data circles */}
                {points.map((pt, i) => (
                  pt.month.hasData && pt.normalizedH > 0 ? (
                    <circle
                      key={`circle-${i}`}
                      cx={pt.x}
                      cy={pt.circleY}
                      r={pt.circleRadius}
                      fill={ACCENT_COLOR}
                      style={{ filter: pt.isPeak ? 'drop-shadow(0 0 5px rgba(255, 107, 53, 0.6))' : undefined }}
                    />
                  ) : null
                ))}

                {/* Value labels - above circle, rotated 90° clockwise to read top-to-bottom */}
                {points.map((pt, i) => (
                  pt.month.hasData && pt.normalizedH > 0 ? (
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
                    >
                      <tspan transform={`rotate(-90, ${pt.x}, ${pt.circleY - pt.circleRadius - 6})`}>
                        {pt.month.km.toFixed(1)}
                      </tspan>
                    </text>
                  ) : null
                ))}

                {/* X-axis month labels — rotated 90° clockwise for vertical reading */}
                {allMonths.map((month, idx) => {
                  const x = paddingX + idx * slotWidth + slotWidth / 2;
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
                    >
                      <tspan transform={`rotate(-90, ${x}, ${labelY})`}>
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
