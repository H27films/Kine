import React from 'react';
import { Dumbbell } from 'lucide-react';

const WeeklyChart: React.FC<{ data: number[]; maxVal: number; color: string; label: string; unit: string }> = ({ data, maxVal, color, label, unit }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="text-[10px] font-bold uppercase tracking-[1.5px] mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </div>
      <div className="flex items-end justify-between gap-2 h-28">
        {data.map((val, i) => (
          <div key={i} className="flex flex-col items-center flex-1 h-full justify-end">
            <div className="text-[9px] font-bold text-white mb-1">{val > 0 ? `${val}${unit}` : ''}</div>
            <div
              className="w-full rounded-sm min-h-[4px] transition-all"
              style={{
                height: `${Math.max((val / maxVal) * 100, 4)}%`,
                backgroundColor: val > 0 ? color : 'rgba(255,255,255,0.05)',
              }}
            />
            <div className="text-[9px] font-bold uppercase mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {days[i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  // Sample data
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
        <WeeklyChart
          data={cardioData}
          maxVal={12}
          color="#4ade80"
          label="Tracker Weekly — Cardio"
          unit="km"
        />
      </section>

      {/* Tracker Weekly - Weights */}
      <section>
        <WeeklyChart
          data={weightsData}
          maxVal={600}
          color="#60a5fa"
          label="Tracker Weekly — Weights"
          unit="kg"
        />
      </section>

      {/* Tracker Weekly - Calories */}
      <section>
        <WeeklyChart
          data={calorieData}
          maxVal={3000}
          color="#f97316"
          label="Tracker Weekly — Calories"
          unit=""
        />
      </section>
    </div>
  );
};
