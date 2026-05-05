import React from 'react';

interface WeeklyRankData {
  label: string;
  km: number;
  originalKm: number;
}

interface WeeklyRankChartProps {
  allWeekData: WeeklyRankData[];
  selectedWeekLabel: string;
  getOrdinalSuffix: (n: number) => string;
  chartWidth: number;
  paddingX: number;
  plotWidth: number;
}

export const WeeklyRankChart: React.FC<WeeklyRankChartProps> = ({
  allWeekData,
  selectedWeekLabel,
  getOrdinalSuffix,
  chartWidth,
  paddingX,
  plotWidth,
}) => {
  if (allWeekData.length === 0) return null;

  const sortedDesc = [...allWeekData].sort((a, b) => b.originalKm - a.originalKm);
  const totalWeeks = sortedDesc.length;
  const currentRank = sortedDesc.findIndex(w => w.label === selectedWeekLabel) + 1;
  // Correct inverted ranking formula as requested
  const fillCount = totalWeeks - currentRank + 1;
  const indicatorPosition = fillCount - 1;

  const containerHeight = 120;
  const barHeight = 60;
  const barGap = 7;
  const barCount = allWeekData.length;

  const totalBarWidth = plotWidth - ((barCount - 1) * barGap);
  const barWidth = totalBarWidth / barCount;
  const barRadius = 2;

  const selectedWeekIndex = allWeekData.findIndex(w => w.label === selectedWeekLabel);

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'baseline', 
        marginBottom: '8px',
        paddingTop: '4px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          WEEKLY RANK
        </div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', fontFamily: "'JetBrains Mono', monospace" }}>
          {currentRank > 0 ? `${currentRank}${getOrdinalSuffix(currentRank)} / ${totalWeeks}` : `— / ${totalWeeks}`}
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
          {/* Ranked bars */}
          {allWeekData.map((week, idx) => {
            const x = paddingX + idx * (barWidth + barGap);
            const y = (containerHeight - barHeight) / 2;
            const isFilled = idx < fillCount;
            
            return (
              <g key={week.label}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={isFilled ? "#1a1a1a" : "#e0e0e0"}
                  rx={barRadius}
                />

                {/* Rank indicator line - always tracks last filled bar */}
                {idx === indicatorPosition && (
                  <rect
                    x={x - 2}
                    y={y + barHeight + 6}
                    width={barWidth + 4}
                    height="1.5"
                    fill="#1a1a1a"
                    rx="0.75"
                    filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.15))"
                  />
                )}
              </g>
            );
          })}

        </svg>
      </div>
    </div>
  );
};