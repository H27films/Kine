import React, { useState } from 'react';

interface Props {
  todayCalories: number;
  weeklyCalories: number[]; // 7 values Mon–Sun
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const CaloriesDashboard: React.FC<Props> = ({ todayCalories, weeklyCalories }) => {
  const [expanded, setExpanded] = useState(false);

  const rawMax = Math.max(...weeklyCalories, 1);
  const daysWithData = weeklyCalories.filter(v => v > 0);
  const avgKcal = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((a, b) => a + b, 0) / daysWithData.length)
    : null;

  if (expanded) {
    return (
      <div
        onClick={() => setExpanded(false)}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          cursor: 'pointer',
          marginTop: '14px',
        }}
      >
        {/* Header: TOTAL CALORIES + avg kcal right */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 900,
            letterSpacing: '0.2em',
            color: '#1a1a1a',
            textTransform: 'uppercase',
          }}>Weekly Calories</span>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            color: '#1a1a1a',
            lineHeight: 1,
          }}>
            {avgKcal !== null ? avgKcal.toLocaleString() : '\u2014'}
            <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(26,26,26,0.8)', marginLeft: 4 }}>KCAL</span>
          </div>
        </div>

        {/* Bars left-to-right — days with data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {weeklyCalories.map((val, i) => {
            if (val <= 0) return null;
            const rawPct = rawMax > 0 ? val / rawMax : 0;
            const opacity = Math.max(0.22, Math.min(1, rawPct));
            const barColor = `rgba(26,26,26,${opacity})`;
            const fillPct = Math.max(rawPct * 100, 8);

             return (
               <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                 <span style={{
                   width: 14,
                   fontSize: '12px',
                   fontWeight: 700,
                   letterSpacing: '0.05em',
                   color: '#1a1a1a',
                   flexShrink: 0,
                   textAlign: 'left',
                 }}>
                   {DAY_LABELS[i]}
                 </span>
                <div style={{
                  flex: 1,
                  height: 20,
                  backgroundColor: 'rgba(26,26,26,0.08)',
                  borderRadius: '0 9999px 9999px 0',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${fillPct}%`,
                    backgroundColor: barColor,
                    borderRadius: '0 9999px 9999px 0',
                    transition: 'width 0.3s ease',
                  }} />
                  <span style={{
                    position: 'absolute',
                    left: '8px',
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
               </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Collapsed: progress bar (clickable) ──
  return (
    <div
      onClick={() => setExpanded(true)}
      style={{ marginTop: '14px', cursor: 'pointer' }}
    >
      <div style={{
        height: todayCalories > 0 ? '32px' : '16px',
        width: '100%',
        backgroundColor: 'rgba(26,26,26,0.1)',
        borderRadius: '999px',
        overflow: 'hidden',
        padding: todayCalories > 0 ? '4px' : '2px',
        transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div
          style={{
            height: '100%',
            width: todayCalories > 0 ? `${Math.min((todayCalories / 1500) * 100, 100)}%` : '0%',
            background: '#1a1a1a',
            borderRadius: '999px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '10px',
            minWidth: todayCalories > 0 ? '72px' : '0px',
          }}
        >
          {todayCalories > 0 && (
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              letterSpacing: '0.5px',
              fontFamily: "'Archivo', sans-serif",
            }}>
              {todayCalories.toLocaleString()} kcal
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaloriesDashboard;