import React from 'react';
import { Footprints } from 'lucide-react';

export const CARDIO_DISPLAY: Record<string, { label: string; icon: React.ReactNode }> = {
  RUNNING: {
    label: 'Run',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="18" width="35" height="3" rx="1.5" fill="white"/>
        <rect x="15" y="28" width="25" height="3" rx="1.5" fill="white"/>
        <rect x="5" y="38" width="30" height="3" rx="1.5" fill="white"/>
        <rect x="20" y="48" width="25" height="3" rx="1.5" fill="white"/>
        <rect x="15" y="58" width="25" height="3" rx="1.5" fill="white"/>
        <circle cx="72" cy="22" r="6" fill="white"/>
        <path d="M48 38L65 28L75 35L85 45" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M65 28L55 45L40 38" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M55 45L65 65L70 85" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M55 45L45 55L22 62" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  ROW: {
    label: 'Row',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="25" r="5" fill="white"/>
        <path d="M50 30L45 50L55 55L65 45" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M45 50L40 60H55" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M65 45L75 45V35" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M30 65H80" stroke="white" strokeWidth="5" strokeLinecap="round"/>
      </svg>
    ),
  },
  CYCLE: {
    label: 'Cycle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="70" r="15" stroke="white" strokeWidth="5" fill="none"/>
        <circle cx="75" cy="70" r="15" stroke="white" strokeWidth="5" fill="none"/>
        <path d="M25 70L45 45H65L75 70" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M45 45L55 30H65" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="55" cy="25" r="4" fill="white"/>
      </svg>
    ),
  },
  WALKING: {
    label: 'Walk',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 70C40 80 30 85 25 80C20 75 25 60 30 50C35 40 45 40 45 50C45 60 40 60 40 70Z" fill="white"/>
        <circle cx="25" cy="40" r="3" fill="white"/>
        <circle cx="32" cy="35" r="3" fill="white"/>
        <circle cx="40" cy="35" r="3" fill="white"/>
        <circle cx="48" cy="40" r="3" fill="white"/>
        <path d="M60 70C60 80 70 85 75 80C80 75 75 60 70 50C65 40 55 40 55 50C55 60 60 60 60 70Z" fill="white"/>
        <circle cx="75" cy="40" r="3" fill="white"/>
        <circle cx="68" cy="35" r="3" fill="white"/>
        <circle cx="60" cy="35" r="3" fill="white"/>
        <circle cx="52" cy="40" r="3" fill="white"/>
      </svg>
    ),
  },
  'CROSS TRAINER': {
    label: 'Cross-Trainer',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="75" width="50" height="8" fill="white"/>
        <rect x="35" y="70" width="35" height="5" fill="white"/>
        <rect x="56" y="65" width="14" height="5" fill="white"/>
        <path d="M62 65V45L68 40" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="47" cy="23" r="6" fill="white"/>
        <path d="M47 28L40 45" stroke="white" strokeWidth="9" strokeLinecap="round"/>
        <path d="M47 30L55 38L60 38" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M47 30L35 35L28 42" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M40 45L45 55L52 65" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M40 45L35 60L28 70" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
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
              <div style={{ color: 'rgba(255,255,255,0.85)' }}>{display.icon}</div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
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
        <div style={{ height: todayCalories > 0 ? '32px' : '16px', width: '100%', backgroundColor: '#1a1a1a', borderRadius: '999px', overflow: 'hidden', padding: todayCalories > 0 ? '4px' : '2px' }}>
          <div
            style={{
              height: '100%',
              width: todayCalories > 0 ? `${Math.min((todayCalories / 1500) * 100, 100)}%` : '0%',
              background: todayCalories > 0 ? 'linear-gradient(90deg, #c6c6c7 0%, #ffffff 100%)' : 'transparent',
              borderRadius: '999px',
              boxShadow: todayCalories > 0 ? '0 0 14px rgba(255,255,255,0.25)' : 'none',
              transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '10px',
              minWidth: todayCalories > 0 ? '72px' : '0px',
            }}
          >
            {todayCalories > 0 && (
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
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

        const lineVals: number[] = sparkData.map((val) => val > 0 ? val : BASE_KM);

        const linePts = lineVals.map((val, i) => ({
          x: padLeft + (i / 6) * chartW,
          y: getY(val),
          val,
          i,
          isAnchor: sparkData[i] <= 0,
        }));

        const today = new Date();
        const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
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
                  <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="rgba(255,255,255,0.5)" />
                </filter>
                <filter id="dotBlur" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2.5" />
                </filter>
                <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="white" stopOpacity="0.075" />
                </linearGradient>
              </defs>

              {solidPath && (
                <path d={solidPath} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {fadedPath && (
                <path d={fadedPath} fill="none" stroke="url(#fadeGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {linePts.filter(p => !p.isAnchor).map((p) => (
                <g key={p.i}>
                  {p.val === maxVal && <line x1={p.x} y1={p.y} x2={p.x} y2={VH - 2} stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeLinecap="round" />}
                  <circle cx={p.x} cy={p.y} r="5" fill="rgba(255,255,255,0.18)" filter="url(#dotBlur)" />
                  <circle cx={p.x} cy={p.y} r="3" fill="white" />
                  <text x={p.x} y={p.y - 9} textAnchor="middle" fill="rgba(255,255,255,0.70)" fontSize="7" fontWeight="700">
                    {p.val.toFixed(1)}
                  </text>
                </g>
              ))}

              {sparkData.map((_, k) => (
                <text key={k} x={padLeft + (k / 6) * chartW} y={VH + 12} textAnchor="middle" fill="white" fontSize="7" fontWeight="700">
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