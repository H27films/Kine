import React, { useState } from 'react';
import { Page } from '../../types';

interface LogCardioProps {
  onNavigate: (page: Page) => void;
}

const tabs: { label: string; page: Page }[] = [
  { label: 'Weights', page: 'weights' },
  { label: 'Cardio', page: 'cardio' },
  { label: 'Calories', page: 'calories' },
];

const heartRateBars = [40, 55, 70, 85, 95, 90, 80, 65, 50, 45, 40, 35, 60, 85, 100];

export const LogCardio: React.FC<LogCardioProps> = ({ onNavigate }) => {
  const [distance, setDistance] = useState('12.45');
  const [minutes, setMinutes] = useState('58');
  const [seconds, setSeconds] = useState('12');

  return (
    <div>
      {/* Tab Navigation */}
      <nav className="flex gap-8 mb-12 items-end">
        {tabs.map((tab) => (
          <button key={tab.page} onClick={() => onNavigate(tab.page)} className="flex flex-col items-center">
            <span className="uppercase tracking-widest text-[10px] transition-colors" style={{ color: tab.page === 'cardio' ? '#ffffff' : 'rgba(226,226,226,0.5)', fontWeight: tab.page === 'cardio' ? 700 : 400 }}>
              {tab.label}
            </span>
            {tab.page === 'cardio' && <div className="h-1 w-1 rounded-full mt-1" style={{ backgroundColor: '#ffffff' }} />}
          </button>
        ))}
      </nav>

      <header className="mb-16">
        <h1 className="text-[2rem] font-black tracking-tighter leading-none mb-2 text-white">LOG PERFORMANCE</h1>
        <p className="text-[0.75rem] uppercase tracking-[0.2em] font-medium" style={{ color: '#c6c6c6' }}>Cardio • Session 042</p>
      </header>

      {/* Distance Input */}
      <section className="mb-16">
        <label className="text-[0.75rem] uppercase tracking-[0.3em] font-bold block mb-2" style={{ color: '#c6c6c6' }}>Distance</label>
        <div className="flex items-baseline gap-4">
          <input type="text" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="00.00" className="text-[4.5rem] font-black tracking-tighter text-white w-full p-0" style={{ backgroundColor: 'transparent', border: 'none' }} />
          <span className="text-[1.5rem] font-black tracking-tighter" style={{ color: '#c6c6c6' }}>KM</span>
        </div>
        <div className="h-px w-full" style={{ backgroundColor: 'rgba(71,71,71,0.2)' }} />
      </section>

      {/* Duration Input */}
      <section className="mb-16">
        <label className="text-[0.75rem] uppercase tracking-[0.3em] font-bold block mb-2" style={{ color: '#c6c6c6' }}>Duration</label>
        <div className="flex items-baseline gap-4">
          <div className="flex items-baseline gap-2">
            <input type="text" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="00" className="text-[3.5rem] font-black tracking-tighter text-white w-20 text-right p-0" style={{ backgroundColor: 'transparent', border: 'none' }} />
            <span className="text-[0.75rem] uppercase tracking-widest font-bold" style={{ color: '#c6c6c6' }}>MIN</span>
          </div>
          <div className="flex items-baseline gap-2">
            <input type="text" value={seconds} onChange={(e) => setSeconds(e.target.value)} placeholder="00" className="text-[3.5rem] font-black tracking-tighter text-white w-20 text-right p-0" style={{ backgroundColor: 'transparent', border: 'none' }} />
            <span className="text-[0.75rem] uppercase tracking-widest font-bold" style={{ color: '#c6c6c6' }}>SEC</span>
          </div>
        </div>
        <div className="h-px w-full" style={{ backgroundColor: 'rgba(71,71,71,0.2)' }} />
      </section>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden mb-16" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div className="p-6" style={{ backgroundColor: '#121212' }}>
          <label className="text-[10px] uppercase tracking-widest font-bold block mb-4" style={{ color: '#c6c6c6' }}>Avg Pace</label>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">4&apos;42&quot;</span>
            <span className="text-[10px] uppercase font-bold" style={{ color: '#c6c6c6' }}>/km</span>
          </div>
        </div>
        <div className="p-6" style={{ backgroundColor: '#121212' }}>
          <label className="text-[10px] uppercase tracking-widest font-bold block mb-4" style={{ color: '#c6c6c6' }}>Intensity</label>
          <span className="text-2xl font-black text-white">ZONE 4</span>
        </div>
      </div>

      {/* Heart Rate Telemetry */}
      <section className="mb-20">
        <div className="p-8 rounded-xl relative overflow-hidden" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="relative z-10">
            <h3 className="text-[0.75rem] uppercase tracking-widest text-white font-bold mb-8">HEART RATE TELEMETRY</h3>
            <div className="flex items-end gap-1 h-32">
              {heartRateBars.map((h, i) => (
                <div key={i} className="w-2 rounded-t-full" style={{ height: `${h}%`, backgroundColor: h >= 80 ? '#ffffff' : h >= 50 ? `rgba(255,255,255,${h / 150})` : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
            <div className="mt-4 flex justify-between text-[10px] uppercase tracking-widest font-bold" style={{ color: '#c6c6c6' }}>
              <span>00:00</span><span>164 BPM AVG</span><span>58:12</span>
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.05, background: 'radial-gradient(circle at top right, white, transparent, transparent)' }} />
        </div>
      </section>

      <button className="w-full rounded-full py-5 text-[0.75rem] uppercase tracking-[0.4em] font-black active:scale-95 transition-all" style={{ backgroundColor: '#ffffff', color: '#000000', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}>
        Commit Session
      </button>
    </div>
  );
};
