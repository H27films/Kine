import React from 'react';

interface Props {
  weeklyBars: number[]; // 7 values Mon–Sun
}

const CaloriesSparkline: React.FC<Props> = ({ weeklyBars }) => {
  const maxVal = Math.max(...weeklyBars, 1);
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const daysWithData = weeklyBars.filter(v => v > 0);
  const avgKcal = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((a, b) => a + b, 0) / daysWithData.length)
    : null;

  const BAR_HEIGHT = 4;
  const GAP = 3;
  const ROWS = 7;
  const totalH = ROWS * BAR_HEIGHT + (ROWS - 1) * GAP;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* Avg label */}
      {avgKcal !== null && (
        <div style={{
          textAlign: 'right',
          fontFamily: "'Inter', sans-serif",
          fontSize: '9px',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color: 'rgba(255,255,255,0.75)',
          lineHeight: 1,
          marginBottom: 4,
        }}>
          {avgKcal.toLocaleString()}
          <span style={{ fontSize: '6px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginLeft: 2 }}>KCAL</span>
        </div>
      )}

      {/* Horizontal bars */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
        {weeklyBars.map((val, i) => {
          const pct = val > 0 ? (val / maxVal) * 100 : 0;
          const isToday = i === todayIdx;
          const hasData = val > 0;
          const barColor = isToday ? '#ffffff' : hasData ? '#3f3f46' : '#18181b';
          return (
            <div key={i} style={{ width: '100%', height: BAR_HEIGHT, backgroundColor: '#18181b', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.max(pct, hasData ? 6 : 0)}%`,
                backgroundColor: barColor,
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CaloriesSparkline;
