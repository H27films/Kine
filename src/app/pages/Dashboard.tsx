import React, { useState } from 'react';
import { Dumbbell, ChevronLeft, ChevronRight, Bike, Footprints, Waves } from 'lucide-react';

// Weekly mock data (index 0 = current week, up to 6 = 7 weeks ago)
const cardioWeeks: number[][] = [
  [5.2, 0, 8.1, 3.4, 6.7, 10.2, 0],
  [4.0, 6.5, 0, 7.2, 5.1, 9.0, 3.3],
  [0, 3.8, 5.5, 0, 8.0, 4.2, 6.1],
  [7.0, 0, 4.3, 6.8, 0, 5.5, 8.9],
  [3.2, 5.0, 7.7, 0, 4.1, 0, 6.3],
  [0, 8.2, 3.1, 5.9, 7.4, 0, 4.8],
  [6.0, 4.5, 0, 3.7, 0, 7.1, 5.6],
];

const weightsWeeks: number[][] = [
  [320, 0, 520, 280, 0, 460, 0],
  [400, 350, 0, 500, 280, 0, 420],
  [0, 300, 450, 0, 380, 520, 0],
  [480, 0, 360, 420, 0, 300, 500],
  [0, 440, 0, 380, 520, 0, 350],
  [300, 0, 480, 0, 420, 360, 0],
  [0, 380, 300, 450, 0, 500, 280],
];

const calorieWeeks: number[][] = [
  [2100, 1850, 2400, 1950, 2200, 2600, 1800],
  [1900, 2300, 2000, 2500, 1750, 2100, 2400],
  [2200, 1800, 2600, 2000, 2350, 1900, 2100],
  [2500, 2100, 1800, 2300, 1950, 2600, 2000],
  [1800, 2400, 2200, 1900, 2600, 2000, 2350],
  [2300, 1950, 2500, 2100, 1800, 2400, 1900],
  [2000, 2600, 1900, 2200, 2400, 1750, 2100],
];

const TOTAL_WEEKS = 7;

const BarChart: React.FC<{ data: number[]; maxVal: number; label: string; unit: string; weekIndex: number; onPrev: () => void; onNext: () => void }> = ({ data, maxVal, label, unit, weekIndex, onPrev, onNext }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekLabel = `${TOTAL_WEEKS - weekIndex}`;
  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            disabled={weekIndex >= TOTAL_WEEKS - 1}
            className="transition-opacity"
            style={{ opacity: weekIndex >= TOTAL_WEEKS - 1 ? 0.2 : 0.6 }}
          >
            <ChevronLeft size={16} color="white" />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/50 min-w-[50px] text-center">
            {weekLabel}
          </span>
          <button
            onClick={onNext}
            disabled={weekIndex <= 0}
            className="transition-opacity"
            style={{ opacity: weekIndex <= 0 ? 0.2 : 0.6 }}
          >
            <ChevronRight size={16} color="white" />
          </button>
        </div>
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

const ScatterChart: React.FC<{ data: number[]; minVal: number; maxVal: number; label: string; weekIndex: number; onPrev: () => void; onNext: () => void }> = ({ data, minVal, maxVal, label, weekIndex, onPrev, onNext }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartHeight = 128;
  const range = maxVal - minVal;
  const weekLabel = `${TOTAL_WEEKS - weekIndex}`;

  const getPosition = (val: number, index: number) => {
    const pct = range > 0 ? (val - minVal) / range : 0;
    const clampedPct = Math.max(0, Math.min(1, pct));
    return {
      x: ((index + 0.5) / 7) * 100,
      y: (1 - clampedPct) * 100,
      bottomPx: clampedPct * chartHeight,
    };
  };

  const buildCurvedPath = () => {
    const points = data.map((val, i) => getPosition(val, i));
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const tension = 0.3;
      const dx = p1.x - p0.x;
      const cp1x = p0.x + dx * tension;
      const cp1y = p0.y;
      const cp2x = p1.x - dx * tension;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            disabled={weekIndex >= TOTAL_WEEKS - 1}
            className="transition-opacity"
            style={{ opacity: weekIndex >= TOTAL_WEEKS - 1 ? 0.2 : 0.6 }}
          >
            <ChevronLeft size={16} color="white" />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/50 min-w-[50px] text-center">
            {weekLabel}
          </span>
          <button
            onClick={onNext}
            disabled={weekIndex <= 0}
            className="transition-opacity"
            style={{ opacity: weekIndex <= 0 ? 0.2 : 0.6 }}
          >
            <ChevronRight size={16} color="white" />
          </button>
        </div>
      </div>
      <div className="flex items-end justify-between relative" style={{ gap: '12px', height: `${chartHeight}px` }}>
        <svg
          className="absolute inset-0 pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <path
            d={buildCurvedPath()}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {data.map((val, i) => {
          const { bottomPx } = getPosition(val, i);
          return (
            <div key={i} className="flex flex-col items-center h-full justify-end relative" style={{ flex: '1', maxWidth: '28px' }}>
              <div className="absolute left-0 right-0 flex flex-col items-center" style={{ bottom: `${bottomPx}px` }}>
                <div className="text-[8px] font-bold text-white/60 mb-1 whitespace-nowrap">{val}</div>
                <div className="w-[7px] h-[7px] rounded-full bg-white" />
              </div>
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-0"
                style={{
                  height: `${bottomPx}px`,
                  width: '1px',
                  backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 3px, transparent 3px, transparent 6px)',
                }}
              />
              <div className="absolute -bottom-6 text-[9px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {days[i]}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: '14px' }} />
    </div>
  );
};

// Mock data per day (0 = today, -1 = yesterday, etc.)
const weightsByDay: Record<number, { name: string; weight: number }[]> = {
  0: [
    { name: 'Bench Press', weight: 120 },
    { name: 'Squats', weight: 180 },
    { name: 'Deadlift', weight: 160 },
    { name: 'OHP', weight: 60 },
  ],
  [-1]: [
    { name: 'Bench Press', weight: 100 },
    { name: 'Pull Ups', weight: 80 },
    { name: 'Rows', weight: 140 },
  ],
  [-2]: [
    { name: 'Squats', weight: 200 },
    { name: 'Leg Press', weight: 300 },
    { name: 'Lunges', weight: 60 },
  ],
  [-3]: [
    { name: 'Bench Press', weight: 110 },
    { name: 'Incline Press', weight: 80 },
    { name: 'Flyes', weight: 40 },
  ],
  [-4]: [],
  [-5]: [
    { name: 'Deadlift', weight: 180 },
    { name: 'Rows', weight: 120 },
  ],
  [-6]: [
    { name: 'Squats', weight: 190 },
    { name: 'OHP', weight: 55 },
    { name: 'Lateral Raises', weight: 20 },
  ],
};

const getDayLabel = (offset: number): string => {
  if (offset === 0) return 'Today';
  if (offset === -1) return 'Yesterday';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const Dashboard: React.FC = () => {
  const [dayOffset, setDayOffset] = useState(0);
  const [cardioWeek, setCardioWeek] = useState(0);
  const [weightsWeek, setWeightsWeek] = useState(0);
  const [calorieWeek, setCalorieWeek] = useState(0);

  const exercises = weightsByDay[dayOffset] || [];
  const totalWeight = exercises.reduce((sum, e) => sum + e.weight, 0);

  return (
    <div className="space-y-8">
      {/* Hero Metric */}
      <section className="pt-4">
        <div className="flex items-start justify-between">
          {/* Left: Big number + activity icons below */}
          <div className="flex flex-col items-start">
            <div className="text-[4.5rem] leading-none tracking-[-3px] text-white" style={{ fontFamily: '"SF Pro Display", "Helvetica Neue", Arial, sans-serif', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              33.5
            </div>
            <div className="text-[24px] font-bold tracking-[2.4px] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
              KM
            </div>
            {/* Activity icons row */}
            <div className="flex items-center gap-4 mt-4">
              {[
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="17" cy="4" r="2"/><path d="M15.6 7.6L13 10l-3-3-4 4"/><path d="M3 17l3-3 3 3 4-4 2 2 3.5-3.5"/><path d="M10 10l-2 8h3l1 4"/></svg>, label: 'Run', km: 4.3 },
                { icon: <Waves size={14} />, label: 'Row', km: 2.0 },
                { icon: <Bike size={14} />, label: 'Cycle', km: 15.2 },
                { icon: <Footprints size={14} />, label: 'Walk', km: 12.0 },
              ].filter(a => a.km > 0).map((activity, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="text-white/60">{activity.icon}</div>
                  <div className="text-[10px] font-bold text-white/80">{activity.km}km</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Mini weekly running bar chart */}
          <div className="flex flex-col items-end pt-1" style={{ width: '120px' }}>
            <div className="text-[9px] font-bold uppercase tracking-[1px] text-white/40 mb-2">This Week</div>
            <div className="flex items-end gap-[3px] w-full" style={{ height: '48px' }}>
              {[4.3, 0, 6.1, 3.2, 5.8, 7.4, 0].map((val, i) => {
                const maxVal = 8;
                const pct = maxVal > 0 ? val / maxVal : 0;
                const brightness = Math.round(80 + pct * 175);
                const barColor = val > 0 ? `rgb(${brightness},${brightness},${brightness})` : 'rgba(255,255,255,0.05)';
                return (
                  <div key={i} className="flex flex-col items-center flex-1" style={{ height: '100%', justifyContent: 'flex-end' }}>
                    <div
                      className="w-full min-h-[3px]"
                      style={{
                        height: `${Math.max(pct * 100, 6)}%`,
                        backgroundColor: barColor,
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex w-full mt-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className="flex-1 text-center text-[7px] font-bold text-white/25">{d}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 text-[20px] font-light text-white leading-relaxed max-w-xs">
          You burned <span className="font-bold">385 Calories</span>
        </div>
      </section>

      {/* Weights Box */}
      <section>
        <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell size={16} color="white" />
              <span className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Weights</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDayOffset((prev) => Math.max(prev - 1, -6))}
                disabled={dayOffset <= -6}
                className="transition-opacity"
                style={{ opacity: dayOffset <= -6 ? 0.2 : 0.6 }}
              >
                <ChevronLeft size={18} color="white" />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/50 min-w-[80px] text-center">
                {getDayLabel(dayOffset)}
              </span>
              <button
                onClick={() => setDayOffset((prev) => Math.min(prev + 1, 0))}
                disabled={dayOffset >= 0}
                className="transition-opacity"
                style={{ opacity: dayOffset >= 0 ? 0.2 : 0.6 }}
              >
                <ChevronRight size={18} color="white" />
              </button>
            </div>
          </div>

          {exercises.length > 0 ? (
            <>
              <div className="text-4xl font-black text-white tracking-tight">
                {totalWeight} <span className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>KG</span>
              </div>
              <div className="mt-4 space-y-2">
                {exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-white/60">{ex.name}</span>
                    <span className="text-[12px] font-bold text-white">{ex.weight} kg</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[13px] text-white/30 font-medium py-4">No weights logged</div>
          )}
        </div>
      </section>

      {/* Tracker Weekly - Cardio */}
      <section>
        <BarChart
          data={cardioWeeks[cardioWeek]}
          maxVal={12}
          label="Tracker Weekly — Cardio"
          unit="km"
          weekIndex={cardioWeek}
          onPrev={() => setCardioWeek((prev) => Math.min(prev + 1, TOTAL_WEEKS - 1))}
          onNext={() => setCardioWeek((prev) => Math.max(prev - 1, 0))}
        />
      </section>

      {/* Tracker Weekly - Weights */}
      <section>
        <BarChart
          data={weightsWeeks[weightsWeek]}
          maxVal={600}
          label="Tracker Weekly — Weights"
          unit="kg"
          weekIndex={weightsWeek}
          onPrev={() => setWeightsWeek((prev) => Math.min(prev + 1, TOTAL_WEEKS - 1))}
          onNext={() => setWeightsWeek((prev) => Math.max(prev - 1, 0))}
        />
      </section>

      {/* Tracker Weekly - Calories */}
      <section>
        <ScatterChart
          data={calorieWeeks[calorieWeek]}
          minVal={500}
          maxVal={2500}
          label="Tracker Weekly — Calories"
          weekIndex={calorieWeek}
          onPrev={() => setCalorieWeek((prev) => Math.min(prev + 1, TOTAL_WEEKS - 1))}
          onNext={() => setCalorieWeek((prev) => Math.max(prev - 1, 0))}
        />
      </section>
    </div>
  );
};
