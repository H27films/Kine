import React, { useState } from 'react';
import { Dumbbell, ChevronLeft, ChevronRight, Bike, Footprints, Waves } from 'lucide-react';

// Weekly data per activity type (index 0 = this week)
const activityWeeklyData: Record<string, number[]> = {
  Run:   [4.3, 0, 5.1, 3.2, 6.0, 0, 3.8],
  Row:   [2.0, 1.5, 0, 2.8, 0, 3.1, 1.2],
  Cycle: [15.2, 0, 12.0, 18.5, 0, 10.3, 14.1],
  Walk:  [12.0, 8.5, 10.2, 0, 9.4, 11.0, 7.6],
};

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

type ChartTab = 'Cardio' | 'Weights' | 'Calories';

const chartConfig: Record<ChartTab, { weeks: number[][]; maxVal: number; unit: string }> = {
  Cardio:   { weeks: cardioWeeks,  maxVal: 12,   unit: 'km' },
  Weights:  { weeks: weightsWeeks, maxVal: 600,  unit: 'kg' },
  Calories: { weeks: calorieWeeks, maxVal: 2600, unit: '' },
};

const WeeklyChart: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ChartTab>('Cardio');
  const [weekIndices, setWeekIndices] = useState<Record<ChartTab, number>>({
    Cardio: 0,
    Weights: 0,
    Calories: 0,
  });

  const weekIndex = weekIndices[activeTab];
  const { weeks, maxVal, unit } = chartConfig[activeTab];
  const data = weeks[weekIndex];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekLabel = `${TOTAL_WEEKS - weekIndex}`;

  const onPrev = () =>
    setWeekIndices((prev) => ({ ...prev, [activeTab]: Math.min(prev[activeTab] + 1, TOTAL_WEEKS - 1) }));
  const onNext = () =>
    setWeekIndices((prev) => ({ ...prev, [activeTab]: Math.max(prev[activeTab] - 1, 0) }));

  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          WEEKLY
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onPrev} disabled={weekIndex >= TOTAL_WEEKS - 1} className="transition-opacity" style={{ opacity: weekIndex >= TOTAL_WEEKS - 1 ? 0.2 : 0.6 }}>
            <ChevronLeft size={16} color="white" />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/50 min-w-[50px] text-center">{weekLabel}</span>
          <button onClick={onNext} disabled={weekIndex <= 0} className="transition-opacity" style={{ opacity: weekIndex <= 0 ? 0.2 : 0.6 }}>
            <ChevronRight size={16} color="white" />
          </button>
        </div>
      </div>
      <div className="flex gap-4 mb-5">
        {(['Cardio', 'Weights', 'Calories'] as ChartTab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="text-[11px] font-bold uppercase tracking-[1px] pb-1 transition-all" style={{ color: activeTab === tab ? '#ffffff' : 'rgba(255,255,255,0.3)', borderBottom: activeTab === tab ? '2px solid #ffffff' : '2px solid transparent' }}>
            {tab}
          </button>
        ))}
      </div>
      <div className="flex items-end justify-between h-32" style={{ gap: '12px' }}>
        {data.map((val, i) => {
          const pct = maxVal > 0 ? val / maxVal : 0;
          const brightness = Math.round(80 + pct * 175);
          const barColor = val > 0 ? `rgb(${brightness},${brightness},${brightness})` : 'rgba(255,255,255,0.05)';
          return (
            <div key={i} className="flex flex-col items-center h-full justify-end" style={{ flex: '1', maxWidth: '28px' }}>
              <div className="text-[8px] font-bold text-white/60 mb-1">{val > 0 ? (unit ? `${val}${unit}` : `${val}`) : ''}</div>
              <div className="w-full min-h-[4px] transition-all" style={{ height: `${Math.max(pct * 100, 4)}%`, backgroundColor: barColor, borderRadius: '4px' }} />
              <div className="text-[9px] font-bold uppercase mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{days[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  const exercises = weightsByDay[dayOffset] || [];
  const totalWeight = exercises.reduce((sum, e) => sum + e.weight, 0);

  return (
    <div className="space-y-8">
      <section className="pt-4">
        <div className="flex items-start">
          <div className="text-[4rem] font-black leading-none tracking-tighter text-white">33.5</div>
          <div className="flex flex-col justify-center ml-4 pt-3">
            <div className="text-[13px] font-black uppercase tracking-[2px] text-white">MOVEMENT (KM)</div>
            <div className="text-[11px] font-medium mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Yesterday 8.1 km</div>
          </div>
        </div>
        <div className="flex items-center gap-5 mt-5">
          {[
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="17" cy="4" r="2"/><path d="M15.6 7.6L13 10l-3-3-4 4"/><path d="M3 17l3-3 3 3 4-4 2 2 3.5-3.5"/><path d="M10 10l-2 8h3l1 4"/></svg>, label: 'Run', km: 4.3 },
            { icon: <Waves size={18} />, label: 'Row', km: 2.0 },
            { icon: <Bike size={18} />, label: 'Cycle', km: 15.2 },
            { icon: <Footprints size={18} />, label: 'Walk', km: 12.0 },
          ].filter(a => a.km > 0).map((activity, i) => (
            <div key={i} className="flex items-center gap-2 cursor-pointer transition-opacity" style={{ opacity: selectedActivity && selectedActivity !== activity.label ? 0.4 : 1 }} onClick={() => setSelectedActivity(selectedActivity === activity.label ? null : activity.label)}>
              <div className="text-white/60">{activity.icon}</div>
              <div className="text-[12px] font-bold text-white/80">{activity.label} {activity.km}km</div>
            </div>
          ))}
        </div>
        {selectedActivity && activityWeeklyData[selectedActivity] && (() => {
          const data = activityWeeklyData[selectedActivity];
          const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
          const maxVal = Math.max(...data);
          const chartH = 90;
          const getBottom = (val: number) => maxVal > 0 ? (val / maxVal) * chartH : 0;
          return (
            <div className="mt-8 relative" style={{ height: `${chartH + 30}px` }}>
              <div className="flex items-end justify-between relative" style={{ height: `${chartH}px` }}>
                {data.map((val, i) => {
                  const bottom = getBottom(val);
                  return (
                    <div key={i} className="flex flex-col items-center h-full justify-end relative" style={{ flex: '1' }}>
                      {val > 0 && (
                        <>
                          <div className="absolute left-0 right-0 flex flex-col items-center" style={{ bottom: `${bottom}px` }}>
                            <div className="text-[9px] font-bold text-white/70 mb-1 whitespace-nowrap">{val}</div>
                            <div className="w-[7px] h-[7px] rounded-full bg-white" />
                          </div>
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-0" style={{ height: `${bottom}px`, width: '1px', backgroundColor: 'rgba(255,255,255,0.25)' }} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                {days.map((d, i) => (
                  <div key={i} className="text-[9px] font-bold uppercase text-center" style={{ flex: '1', color: 'rgba(255,255,255,0.3)' }}>{d}</div>
                ))}
              </div>
            </div>
          );
        })()}
        <div className="mt-6 text-[20px] font-light text-white leading-relaxed max-w-xs">
          You burned <span className="font-bold">385 Calories</span>
        </div>
      </section>
      <section>
        <div className="rounded-lg p-5" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell size={16} color="white" />
              <span className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Weights</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setDayOffset((prev) => Math.max(prev - 1, -6))} disabled={dayOffset <= -6} className="transition-opacity" style={{ opacity: dayOffset <= -6 ? 0.2 : 0.6 }}>
                <ChevronLeft size={18} color="white" />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/50 min-w-[80px] text-center">{getDayLabel(dayOffset)}</span>
              <button onClick={() => setDayOffset((prev) => Math.min(prev + 1, 0))} disabled={dayOffset >= 0} className="transition-opacity" style={{ opacity: dayOffset >= 0 ? 0.2 : 0.6 }}>
                <ChevronRight size={18} color="white" />
              </button>
            </div>
          </div>
          {exercises.length > 0 ? (
            <>
              <div className="text-4xl font-black text-white tracking-tight">{totalWeight} <span className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>KG</span></div>
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
      <section><WeeklyChart /></section>
    </div>
  );
};
