import React from 'react';

interface RunningProgressChartProps {
  completedKm: number;
  weeklyGoal?: number;
}

export const RunningProgressChart: React.FC<RunningProgressChartProps> = ({ 
  completedKm, 
  weeklyGoal = 20 
}) => {
  const percentage = Math.min(100, (completedKm / weeklyGoal) * 100);
  const remainingPercentage = 100 - percentage;
  const remainingKm = Math.max(0, weeklyGoal - completedKm);
  
  const chartHeight = 120;
  const chartWidth = 280;
  const barWidth = 60;
  
  // Baseline position moves down as percentage increases
  const baselineY = chartHeight - (percentage / 100) * chartHeight;
  
  // Calculate glow spread based on remaining percentage
  const glowHeight = remainingPercentage / 100 * (chartHeight - 10);
  
  return (
    <div style={{
      width: '100%',
      height: '120px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      
      {/* Left labels */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 8,
        textAlign: 'left',
      }}>
        <div style={{
          fontSize: '22px',
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          color: '#1a1a1a'
        }}>
          {Math.round(percentage)}%
        </div>
        <div style={{
          fontSize: '11px',
          fontWeight: 500,
          color: '#444',
          marginTop: '2px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {completedKm.toFixed(1)}km done
        </div>
      </div>
      
      {/* Progress bar container */}
      <svg 
        width={chartWidth} 
        height={chartHeight} 
        style={{ 
          overflow: 'visible',
        }}
      >
        <defs>
          {/* Soft blur filter for remaining distance */}
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 0.25 0"
            />
          </filter>
        </defs>
        
        {/* Remaining distance glow (below baseline) - rendered FIRST so it sits behind */}
        {remainingPercentage > 0 && (
          <rect
            x={(chartWidth - barWidth) / 2}
            y={baselineY}
            width={barWidth}
            height={glowHeight}
            fill="#1a1a1a"
            filter="url(#softGlow)"
          />
        )}
        
        {/* Baseline separator line */}
        <line
          x1={(chartWidth - barWidth) / 2 - 4}
          y1={baselineY}
          x2={(chartWidth + barWidth) / 2 + 4}
          y2={baselineY}
          stroke="#666"
          strokeWidth="1"
          strokeOpacity={0.6}
        />
        
        {/* Completed portion (above baseline) - rendered on TOP */}
        <rect
          x={(chartWidth - barWidth) / 2}
          y={baselineY - (chartHeight - baselineY)}
          width={barWidth}
          height={chartHeight - baselineY}
          fill="#1a1a1a"
          rx={2}
        />
        
      </svg>
      
      {/* Right labels */}
      <div style={{
        position: 'absolute',
        right: 0,
        bottom: 8,
        textAlign: 'right',
      }}>
        <div style={{
          fontSize: '22px',
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          color: '#1a1a1a',
          opacity: 0.7
        }}>
          {Math.round(remainingPercentage)}%
        </div>
        <div style={{
          fontSize: '11px',
          fontWeight: 500,
          color: '#444',
          marginTop: '2px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {remainingKm.toFixed(1)}km left
        </div>
      </div>
      
    </div>
  );
};