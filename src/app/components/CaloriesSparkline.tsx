import React from 'react';

interface Props {
  weeklyBars: number[]; // 7 values Mon–Sun
}

const CaloriesSparkline: React.FC<Props> = ({ weeklyBars }) => {
  const rawMax = Math.max(...weeklyBars, 1);

  const daysWithData = weeklyBars.filter(v => v > 0);
  const avgKcal = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((a, b) => a + b, 0) / daysWithData.length)
    : null;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 2 }}>
      {/* Avg label — top right */}
      <div style={{
        textAlign: 'right',
        fontFamily: "'Inter', sans-serif",
        fontSize: '15px',
        fontWeight: 900,
        letterSpacing: '-0.04em',
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 1,
        flexShrink: 0,
        marginBottom: 4,
      }}>
        {avgKcal !== null ? avgKcal.toLocaleString() : '—'}
        <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginLeft: 3 }}>KCAL</span>
      </div>

      {/* Horizontal bars — grow right to left */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', gap: 3 }}>
        {weeklyBars.map((val, i) => {
          const rawPct = rawMax > 0 ? val / rawMax : 0;
          const brightness = val > 0 ? Math.round(80 + rawPct * 175) : 0;
          const barColor = val > 0 ? `rgb(${brightness},${brightness},${brightness})` : 'rgba(255,255,255,0.05)';
          const fillPct = val > 0 ? Math.max(rawPct * 100, 6) : 100; // empty bars fill full width with dim color

          return (
            <div
              key={i}
              style={{
                width: '100%',
                height: 5,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '9999px 0 0 9999px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: val > 0 ? `${fillPct}%` : '100%',
                  backgroundColor: barColor,
                  borderRadius: '9999px 0 0 9999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CaloriesSparkline;
