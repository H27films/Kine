import React from 'react';
import { Dumbbell } from 'lucide-react';

const BarChart: React.FC<{ data: number[]; maxVal: number; label: string; unit: string }> = ({ data, maxVal, label, unit }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="text-[10px] font-bold uppercase tracking-[1.5px] mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </div>
      <div className="flex items-end justify-between h-32" style={{ gap: '12px' }}>
        {data.map((val, i) => {
          const pct = maxVal > 0 ? val / maxVal : 0;
          const brightness = Math.round(80 + pct * 175);
          const barColor = val > 0 ? `rgb(${brightness},${brightness},${brightness})` : 'rgba(255,255,255,0.05)';
          return (
            <div key={i} className="flex flex-col items-center h-full justify-end" style={{ flex: '1', maxWidth: '28px' }}>
              <div className="text-[8px] font-bold text-white/60 mb-1">{val > 0 ? `${val}${unit}` : ''}</div>
              <div
                className="w-full min-h-[4px] transition-all"
                style={{
                  height: `${Math.max(pct * 100, 4)}%`,
                  backgroundColor: barColor,
                  borderRadius: '4px',
                }}
              />
              <div className="text-[9px] font-bold uppercase mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {days[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ScatterChart: React.FC<{ data: number[]; maxVal: number; label: string }> = ({ data, maxVal, label }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartH = 140;
  const padTop = 22;
  const padBot = 5;
  const usableH = chartH - padTop - padBot;

  // Match the same even spacing as the bar chart flex layout
  // 7 items evenly spaced: center of each slot
  const points = data.map((val, i) => {
    const slotWidth = 100 / 7;
    const x = slotWidth * i + slotWidth / 2;
    const y = padTop + usableH - (val / maxVal) * usableH;
    return { x, y, val };
  });

  // Build smooth curve using cubic bezier
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="text-[10px] font-bold uppercase tracking-[1.5px] mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </div>
      <svg viewBox={`0 0 100 ${chartH}`} className="w-full" preserveAspectRatio="none" style={{ height: '140px', overflow: 'visible' }}>
        {/* Curved connecting line */}
        <path d={pathD} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />

        {/* Drop lines and dots */}
        {points.map((p, i) => (
          <g key={i}>
            {/* Vertical drop line */}
            <line
              x1={p.x} y1={p.y}
              x2={p.x} y2={chartH - padBot}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="0.3"
              strokeDasharray="1 1"
              vectorEffect="non-scaling-stroke"
            />
            {/* Value label above dot */}
            <text
              x={p.x}
              y={p.y - 5}
              textAnchor="middle"
              fill="rgba(255,255,255,0.6)"
              fontSize="3.5"
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {p.val}
            </text>
            {/* White dot */}
            <circle cx={p.x} cy={p.y} r="1.5" fill="white" />
          </g>
        ))}
      </svg>
      {/* Day labels - same flex layout as bar chart */}
      <div className="flex items-end justify-between mt-2" style={{ gap: '12px' }}>
        {days.map((d, i) => (
          <div key={i} className="text-[9px] font-bold uppercase text-center" style={{ color: 'rgba(255,255,255,0.3)', flex: '1', maxWidth: '28px' }}>
            {d}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const weightExercises = [
    { name: 'Bench Press', weight: 120 },
    { name: 'Squats', weight: 180 },
    { name: 'Deadlift', weight: 160 },
    { name: 'OHP', weight: 60 },
  ];
  const totalWeight = weightExercises.reduce((sum, e) => sum + e.weight, 0);

  const cardioData = [5.2, 0, 8.1, 3.4, 6.7, 10.2, 0];
  const weightsData = [320, 0, 520, 280, 0, 460, 0];
  const calorieData = [2100, 1850, 2400, 1950, 2200, 2600, 1800];

  return (
    <div className="space-y-8">
      {/* Hero Metric */}
      <section className="pt-4">
        <div className="flex flex-col items-start">
          <div className="text-[4.5rem] font-extrabold leading-none tracking-[-3px] text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 800 }}>
            33,5
          </div>
          <div className="text-[24px] font-bold tracking-[2.4px] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
            KM
          </div>
        </div>
        <div className="mt-8 text-[20px] font-light text-white leading-relaxed max-w-xs">
          <span>You burned </span>
          <span className="font-bold">385 calories</span>
          <span> and moved for </span>
          <span className="font-bold">1 h 17 minutes</span>
        </div>
      </section>

      {/* Total Weights Box */}
      <section>
        <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell size={18} color="white" />
              <span className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Weights Today</span>
            </div>
          </div>
          <div className="text-4xl font-black text-white tracking-tight">
            {totalWeight} <span className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>KG</span>
          </div>
          <div className="mt-4 space-y-2">
            {weightExercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-white/60">{ex.name}</span>
                <span className="text-[12px] font-bold text-white">{ex.weight} kg</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tracker Weekly - Cardio */}
      <section>
        <BarChart data={cardioData} maxVal={12} label="Tracker Weekly — Cardio" unit="km" />
      </section>

      {/* Tracker Weekly - Weights */}
      <section>
        <BarChart data={weightsData} maxVal={600} label="Tracker Weekly — Weights" unit="kg" />
      </section>

      {/* Tracker Weekly - Calories */}
      <section>
        <ScatterChart data={calorieData} maxVal={3000} label="Tracker Weekly — Calories" />
      </section>
    </div>
  );
};
