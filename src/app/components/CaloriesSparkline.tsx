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
              color: '#ffffff',
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
                  opacity: 0.55,
                  color: '#ffffff',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '17px',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1,
          }}>
            {avgKcal !== null ? avgKcal.toLocaleString() : '\u2014'}
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>KCAL</span>
          </div>
        </div>

        {/* Expanded bars — only days with data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {weeklyBars.map((val, i) => {
            if (val <= 0) return null;
            const rawPct = rawMax > 0 ? val / rawMax : 0;
            const brightness = Math.round(80 + rawPct * 175);
            const barColor = `rgb(${brightness},${brightness},${brightness})`;
            const fillPct = Math.max(rawPct * 100, 8);

            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  flex: 1,
                  height: 20,
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
                  <span style={{
                    position: 'absolute',
                    left: `calc(${100 - fillPct}% + 8px)`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: brightness > 160 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)',
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
                  color: '#ffffff',
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
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 1,
        flexShrink: 0,
        marginBottom: 4,
      }}>
        {avgKcal !== null ? avgKcal.toLocaleString() : '\u2014'}
        <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginLeft: 3 }}>KCAL</span>
      </div>

      {/* Horizontal bars — grow right to left */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', gap: 3 }}>
        {weeklyBars.map((val, i) => {
          const rawPct = rawMax > 0 ? val / rawMax : 0;
          const brightness = val > 0 ? Math.round(80 + rawPct * 175) : 0;
          const barColor = val > 0
            ? `rgb(${brightness},${brightness},${brightness})`
            : 'rgba(255,255,255,0.05)';
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
