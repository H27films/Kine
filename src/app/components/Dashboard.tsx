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
  const chartHeight = 128; // matches h-32

  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="text-[10px] font-bold uppercase tracking-[1.5px] mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </div>
      <div className="flex items-end justify-between relative" style={{ gap: '12px', height: `${chartHeight}px` }}>
        {/* SVG overlay for connecting line - positioned absolutely */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          {/* We'll draw connecting lines between dots using percentage positions */}
          {data.map((val, i) => {
            if (i >= data.length - 1) return null;
            const nextVal = data[i + 1];
            const pct1 = val / maxVal;
            const pct2 = nextVal / maxVal;
            // Each column center: (i + 0.5) / 7 * 100%
            const x1 = ((i + 0.5) / 7) * 100;
            const y1 = (1 - pct1) * 100;
            const x2 = ((i + 1.5) / 7) * 100;
            const y2 = (1 - pct2) * 100;
            return (
              <line
                key={`line-${i}`}
                x1={`${x1}%`} y1={`${y1}%`}
                x2={`${x2}%`} y2={`${y2}%`}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />
            );
          })}
        </svg>

        {data.map((val, i) => {
          const pct = maxVal > 0 ? val / maxVal : 0;
          const bottomPx = pct * chartHeight;
          return (
            <div key={i} className="flex flex-col items-center h-full justify-end relative" style={{ flex: '1', maxWidth: '28px' }}>
              {/* Dot column container */}
              <div className="absolute left-0 right-0 flex flex-col items-center" style={{ bottom: `${bottomPx}px` }}>
                {/* Value */}
                <div className="text-[8px] font-bold text-white/60 mb-1 whitespace-nowrap">{val}</div>
                {/* Dot */}
                <div className="w-[7px] h-[7px] rounded-full bg-white" />
              </div>
              {/* Dashed drop line */}
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-0"
                style={{
                  height: `${bottomPx}px`,
                  width: '1px',
                  backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 3px, transparent 3px, transparent 6px)',
                }}
              />
              {/* Day label */}
              <div className="absolute -bottom-6 text-[9px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {days[i]}
              </div>
            </div>
          );
        })}
      </div>
      {/* Spacer for day labels */}
      <div style={{ height: '20px' }} />
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
