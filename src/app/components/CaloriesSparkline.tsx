import React from 'react';

interface Props {
  weeklyBars: number[]; // 7 values Mon–Sun
  expanded?: boolean;
  onClick?: () => void;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const CaloriesSparkline: React.FC<Props> = ({ weeklyBars, expanded = false, onClick }) => {
  const rawMax = Math.max(...weeklyBars, 1);

  const daysWithData = weeklyBars.filter(v => v > 0);
  const avgKcal = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((a, b) => a + b, 0) / daysWithData.length)
    : null;

  if (expanded) {
    return (
      <div
        onClick={onClick}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          cursor: 'pointer',
        }}
      >
        {/* Avg label top right */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
          }}>Tap to collapse</span>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '17px',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1,
          }}>
            {avgKcal !== null ? avgKcal.toLocaleString() : '—'}
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>KCAL AVG</span>
          </div>
        </div>

        {/* Expanded bars with day labels + value labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {weeklyBars.map((val, i) => {
            const rawPct = rawMax > 0 ? val / rawMax : 0;
            const brightness = val > 0 ? Math.round(80 + rawPct * 175) : 0;
            const barColor = val > 0 ? `rgb(${brightness},${brightness},${brightness})` : 'rgba(255,255,255,0.05)';
            const fillPct = val > 0 ? Math.max(rawPct * 100, 4) : 0;

            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Day label */}
                <span style={{
                  width: 12,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: 'rgba(255,255,255,0.35)',
                  flexShrink: 0,
                  textAlign: 'center',
                }}>
                  {DAY_LABELS[i]}
                </span>

                {/* Bar track */}
                <div style={{
                  flex: 1,
                  height: 18,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '9999px 0 0 9999px',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: `${fillPct}%`,
                    backgroundColor: barColor,
                    borderRadius: '9999px 0 0 9999px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>

                {/* Value label */}
                <span style={{
                  width: 38,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: val > 0 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.15)',
                  flexShrink: 0,
                  textAlign: 'right',
                }}>
                  {val > 0 ? val.toLocaleString() : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Compact (default) ──
  return (
    <div
      onClick={onClick}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 2, cursor: 'pointer' }}
    >
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
          const fillPct = val > 0 ? Math.max(rawPct * 100, 6) : 100;

          return (
            <div key={i} style={{
              width: '100%',
              height: 5,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '9999px 0 0 9999px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: val > 0 ? `${fillPct}%` : '100%',
                backgroundColor: barColor,
                borderRadius: '9999px 0 0 9999px',
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
