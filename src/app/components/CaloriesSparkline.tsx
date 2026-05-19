import React from 'react';

interface Props {
  weeklyBars: number[]; // 7 values Mon–Sun
  expanded?: boolean;
  onClick?: () => void;
  onEditClick?: () => void;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const CaloriesSparkline: React.FC<Props> = ({ weeklyBars, expanded = false, onClick, onEditClick }) => {
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
        {/* Header: TOTAL CALORIES + pencil icon left, avg right */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: '13px',
              fontWeight: 900,
              letterSpacing: '0.2em',
              color: '#1a1a1a',
              textTransform: 'uppercase',
            }}>Total Calories</span>
            {/* Pencil icon — opens edit sheet */}
            {onEditClick && (
              <button
                onClick={e => { e.stopPropagation(); onEditClick(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.85,
                  color: '#1a1a1a',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            )}
          </div>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '17px',
            fontWeight: 900,
            letterSpacing: '-0.04em',
color: '#1a1a1a',
            lineHeight: 1,
          }}>
            {avgKcal !== null ? avgKcal.toLocaleString() : '\u2014'}
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(26,26,26,0.8)', marginLeft: 4 }}>KCAL</span>
          </div>
        </div>

        {/* Expanded bars — only days with data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {weeklyBars.map((val, i) => {
            if (val <= 0) return null;
            const rawPct = rawMax > 0 ? val / rawMax : 0;
            const opacity = Math.max(0.22, Math.min(1, rawPct));
            const barColor = `rgba(26,26,26,${opacity})`;
            const fillPct = Math.max(rawPct * 100, 8);

            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  flex: 1,
                  height: 20,
                  backgroundColor: 'rgba(26,26,26,0.08)',
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
                  <span style={{
                    position: 'absolute',
                    left: `calc(${100 - fillPct}% + 8px)`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}>
                    {val.toLocaleString()}
                  </span>
                </div>
                <span style={{
                  width: 14,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: '#1a1a1a',
                  flexShrink: 0,
                  textAlign: 'right',
                }}>
                  {DAY_LABELS[i]}
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
        color: '#1a1a1a',
        lineHeight: 1,
        flexShrink: 0,
        marginBottom: 4,
      }}>
        {avgKcal !== null ? avgKcal.toLocaleString() : '\u2014'}
        <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(26,26,26,0.8)', marginLeft: 3 }}>KCAL</span>
      </div>

      {/* Horizontal bars — grow right to left */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', gap: 3 }}>
        {weeklyBars.map((val, i) => {
          const rawPct = rawMax > 0 ? val / rawMax : 0;
          const opacity = val > 0 ? Math.max(0.22, Math.min(1, rawPct)) : 0.08;
          const barColor = `rgba(26,26,26,${opacity})`;
          const fillPct = val > 0 ? Math.max(rawPct * 100, 6) : 8;

          return (
            <div key={i} style={{
              width: '100%',
              height: 5,
              backgroundColor: 'transparent',
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
                borderRadius: '9999px',
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
