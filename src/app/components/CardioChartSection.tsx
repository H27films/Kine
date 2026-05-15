import React from 'react';
import { Footprints } from 'lucide-react';

export const CARDIO_DISPLAY: Record<string, { label: string; icon: React.ReactNode }> = {
  RUNNING: {
    label: 'Run',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="18" width="35" height="3" rx="1.5" fill="#1a1a1a"/>
        <rect x="15" y="28" width="25" height="3" rx="1.5" fill="#1a1a1a"/>
        <rect x="5" y="38" width="30" height="3" rx="1.5" fill="#1a1a1a"/>
        <rect x="20" y="48" width="25" height="3" rx="1.5" fill="#1a1a1a"/>
        <rect x="15" y="58" width="25" height="3" rx="1.5" fill="#1a1a1a"/>
        <circle cx="72" cy="22" r="6" fill="#1a1a1a"/>
        <path d="M48 38L65 28L75 35L85 45" stroke="#1a1a1a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M65 28L55 45L40 38"        stroke="#1a1a1a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M55 45L65 65L70 85"        stroke="#1a1a1a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M55 45L45 55L22 62"        stroke="#1a1a1a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  ROW: {
    label: 'Row',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="25" r="5" fill="#1a1a1a"/>
        <path d="M50 30L45 50L55 55L65 45" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M45 50L40 60H55"          stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M65 45L75 45V35"          stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M30 65H80"                stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round"/>
      </svg>
    ),
  },
  CYCLE: {
    label: 'Cycle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="70" r="15" stroke="#1a1a1a" strokeWidth="5" fill="none"/>
        <circle cx="75" cy="70" r="15" stroke="#1a1a1a" strokeWidth="5" fill="none"/>
        <path d="M25 70L45 45H65L75 70" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M45 45L55 30H65"       stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="55" cy="25" r="4" fill="#1a1a1a"/>
      </svg>
    ),
  },
  WALKING: {
    label: 'Walk',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 70C40 80 30 85 25 80C20 75 25 60 30 50C35 40 45 40 45 50C45 60 40 60 40 70Z" fill="#1a1a1a"/>
        <circle cx="25" cy="40" r="3" fill="#1a1a1a"/>
        <circle cx="32" cy="35" r="3" fill="#1a1a1a"/>
        <circle cx="40" cy="35" r="3" fill="#1a1a1a"/>
        <circle cx="48" cy="40" r="3" fill="#1a1a1a"/>
        <path d="M60 70C60 80 70 85 75 80C80 75 75 60 70 50C65 40 55 40 55 50C55 60 60 60 60 70Z" fill="#1a1a1a"/>
        <circle cx="75" cy="40" r="3" fill="#1a1a1a"/>
        <circle cx="68" cy="35" r="3" fill="#1a1a1a"/>
        <circle cx="60" cy="35" r="3" fill="#1a1a1a"/>
        <circle cx="52" cy="40" r="3" fill="#1a1a1a"/>
      </svg>
    ),
  },
  'CROSS TRAINER': {
    label: 'Cross-Trainer',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="75" width="50" height="8" fill="#1a1a1a"/>
        <rect x="35" y="70" width="35" height="5" fill="#1a1a1a"/>
        <rect x="56" y="65" width="14" height="5" fill="#1a1a1a"/>
        <path d="M62 65V45L68 40" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="47" cy="23" r="6" fill="#1a1a1a"/>
        <path d="M47 28L40 45"    stroke="#1a1a1a" strokeWidth="9" strokeLinecap="round"/>
        <path d="M47 30L55 38L60 38" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M47 30L35 35L28 42" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M40 45L45 55L52 65" stroke="#1a1a1a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M40 45L35 60L28 70" stroke="#1a1a1a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  TRACKER: { label: 'Tracker', icon: <Footprints size={18} /> },
};

interface CardioChartSectionProps {
  selectedActivity: string | null;
  setSelectedActivity: (activity: string | null) => void;
  activityWeeklyData: Record<string, number[]>;
  visibleCardioKeys: string[];
  todayActivities: any[];
  todayCalories: number;
}

const CardioChartSection: React.FC<CardioChartSectionProps> = ({
  selectedActivity,
  setSelectedActivity,
  activityWeeklyData,
  visibleCardioKeys,
  todayActivities,
  todayCalories,
}) => {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: '12px',
          gap: '14px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '4px',
        }}
      >
        {visibleCardioKeys.map(key => {
          const display = CARDIO_DISPLAY[key];
          if (!display) return null;
          const matching = todayActivities.filter(a => a.exercise_name === key);
          const totalKm = +matching.reduce((s, a) => s + a.km, 0).toFixed(1);
          const hasData = totalKm > 0;
          const isSelected = selectedActivity === key;
          return (
            <div
              key={key}
              className="flex items-center gap-1.5 cursor-pointer transition-opacity flex-shrink-0"
              style={{ opacity: selectedActivity && !isSelected ? 0.3 : 1 }}
              onClick={() => setSelectedActivity(isSelected ? null : key)}
            >
              <div style={{ color: '#1a1a1a' }}>{display.icon}</div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  color: '#1a1a1a',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Archivo', sans-serif",
                }}
              >
                {display.label}{hasData ? ` ${totalKm}km` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calories progress bar */}
      <div style={{ marginTop: '14px' }}>
        <div style={{ height: todayCalories > 0 ? '32px' : '16px', width: '100%', backgroundColor: 'rgba(26,26,26,0.1)', borderRadius: '999px', overflow: 'hidden', padding: todayCalories > 0 ? '4px' : '2px' }}>
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
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', letterSpacing: '0.5px', fontFamily: "'Archivo', sans-serif" }}>
                {todayCalories.toLocaleString()} kcal
              </span>
            )}
          </div>
        </div>
      </div>

      {selectedActivity && activityWeeklyData[selectedActivity] && (() => {
        const sparkData = activityWeeklyData[selectedActivity];
        const sparkDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const BASE_KM = selectedActivity === 'ROW' ? 0.1 : 0.3;
        const VW = 280;
        const VH = 110;
        const padTop = 20;
        const padBottom = 6;
        const padLeft = 10;
        const padRight = 10;
        const chartW = VW - padLeft - padRight;
        const chartH = VH - padTop - padBottom;

        const maxVal = Math.max(...sparkData.filter(v => v > 0), BASE_KM, 0.1);
        const getY = (val: number) => padTop + (1 - val / maxVal) * chartH;

        // Find last actual real value
        let lastRealValue = BASE_KM;
        let lastRealIndex = -1;
        for (let i = 6; i >= 0; i--) {
          if (sparkData[i] > 0) {
            lastRealValue = sparkData[i];
            lastRealIndex = i;
            break;
          }
        }

        const today = new Date();
        const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;

        const lineVals: number[] = sparkData.map((val, i) => {
          if (val > 0) return val;
          
          // For future empty days: gradual interpolation from last real value down to BASE_KM
          if (i > lastRealIndex && lastRealIndex >= 0) {
            const totalSteps = 6 - lastRealIndex;
            const currentStep = i - lastRealIndex;
            const progress = totalSteps > 0 ? currentStep / totalSteps : 0;
            // Linear interpolation: smoothly go from lastRealValue down to BASE_KM
            return lastRealValue * (1 - progress) + BASE_KM * progress;
          }
          
          return BASE_KM;
        });

        const linePts = lineVals.map((val, i) => ({
          x: padLeft + (i / 6) * chartW,
          y: getY(val),
          val,
          i,
          isAnchor: sparkData[i] <= 0,
        }));

        const solidPts = linePts.slice(0, todayIndex + 1);
        const fadedPts = linePts.slice(todayIndex);

        const buildPath = (pts: typeof linePts) => {
          if (pts.length === 0) return '';
          if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
          let d = `M ${pts[0].x} ${pts[0].y}`;
          for (let k = 1; k < pts.length; k++) {
            const prev = pts[k - 1];
            const curr = pts[k];
            const cpx = (prev.x + curr.x) / 2;
            d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
          }
          return d;
        };

        const solidPath = buildPath(solidPts);
        const fadedPath = buildPath(fadedPts);

        return (
          <div className="mt-6">
            <svg width="100%" viewBox={`0 0 ${VW} ${VH + 14}`} style={{ overflow: 'visible', display: 'block' }}>
              <defs>
                <filter id="lineBlur1" x="-50%" y="-100%" width="200%" height="300%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
                <filter id="lineBlur2" x="-50%" y="-100%" width="200%" height="300%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
                <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.15)" />
                </filter>
                <filter id="dotBlur" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2.5" />
                </filter>
                <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.075" />
                </linearGradient>
                <linearGradient id="dropLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1a1a1a" stopOpacity="1" />
                  <stop offset="70%" stopColor="#1a1a1a" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.15" />
                </linearGradient>
              </defs>

              {solidPath && (
                <path d={solidPath} fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {fadedPath && (
                <path d={fadedPath} fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Subtle vertical droplines continuously along the entire curve */}
              {Array.from({ length: 80 }).map((_, idx) => {
                const t = idx / 79;
                // Find position along bezier curve
                const totalSegments = linePts.length - 1;
                const segmentProgress = t * totalSegments;
                const segmentIdx = Math.min(Math.floor(segmentProgress), totalSegments - 1);
                const localT = segmentProgress - segmentIdx;
                
                // Skip droplines exactly on data points
                if (Math.abs(localT) < 0.01) return null;
                
                const prev = linePts[segmentIdx];
                const curr = linePts[segmentIdx + 1];
                
                // Cubic bezier y calculation
                const y = (1 - localT) ** 2 * prev.y + 2 * (1 - localT) * localT * ((prev.y + curr.y) / 2) + localT ** 2 * curr.y;
                const x = prev.x + localT * (curr.x - prev.x);
                
                // Base Y position at the bottom of the line (same base for all points)
                const baseY = padTop + chartH;
                
                // Calculate opacity gradient manually from bottom to top
                const lineHeight = baseY - y;
                const segments = 6;
                const lines = [];
                
                for (let s = 0; s < segments; s++) {
                  const progress = s / segments;
                  const opacity = 0.12 + (0.38 * progress); // 12% at curve -> 50% at bottom
                  const yStart = y + lineHeight * (s / segments);
                  const yEnd = y + lineHeight * ((s + 1) / segments);
                  
                  lines.push(
                    <line
                      key={`s-${s}`}
                      x1={x}
                      y1={yStart}
                      x2={x}
                      y2={yEnd}
                      stroke={`rgba(0,0,0,${opacity.toFixed(2)})`}
                      strokeWidth="1.2"
                    />
                  );
                }
                
                return lines;
              })}

              {linePts.filter(p => !p.isAnchor).map((p) => {
                // Scale circle size based on value relative to max
                const sizeRatio = p.val / maxVal;
                const glowRadius = 3 + sizeRatio * 4; // 3px to 7px
                const dotRadius = 2 + sizeRatio * 2; // 2px to 4px
                return (
                  <g key={p.i}>
                    {/* Main dark dropline */}
                    <line x1={p.x} y1={p.y} x2={p.x} y2={padTop + chartH} stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx={p.x} cy={p.y} r={glowRadius} fill="rgba(0,0,0,0.18)" filter="url(#dotBlur)" />
                    <circle cx={p.x} cy={p.y} r={dotRadius} fill="#1a1a1a" />
                    <text x={p.x} y={p.y - 9} textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="700" fontFamily="'Archivo', sans-serif">
                      {p.val.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {sparkData.map((_, k) => (
                <text key={k} x={padLeft + (k / 6) * chartW} y={VH + 12} textAnchor="middle" fill="#1a1a1a" fontSize="7" fontWeight="700" fontFamily="'Archivo', sans-serif">
                  {sparkDays[k]}
                </text>
              ))}
            </svg>
          </div>
        );
      })()}
    </>
  );
};

export default CardioChartSection;