import React from 'react';

const weekBars = [40, 65, 55, 85, 75, 90, 45];
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const specs = [
  { label: 'Duration', value: '52:18' },
  { label: 'Avg Power', value: '245W' },
  { label: 'Metabolic Rate', value: '820kcal' },
  { label: 'Efficiency Index', value: '0.94' },
];

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-12">
      {/* Hero Header */}
      <section className="space-y-2 pt-4">
        <h1 className="text-[2.75rem] font-black leading-none tracking-tighter text-white">
          HISTORICAL<br />ANALYTICS
        </h1>
        <div className="flex items-center gap-3">
          <span className="h-px w-12" style={{ backgroundColor: '#ffffff' }} />
          <p className="text-[0.75rem] uppercase tracking-widest font-bold" style={{ color: '#c6c6c6' }}>Performance Monograph 042-B</p>
        </div>
      </section>

      {/* Primary Metric */}
      <section>
        <div className="flex items-baseline gap-4 flex-wrap">
          <div className="text-[5rem] font-black leading-none tracking-tighter text-white">92.4</div>
          <div className="flex flex-col">
            <span className="text-[1rem] uppercase tracking-widest font-black text-white">Volume (KG)</span>
            <span className="text-[0.75rem]" style={{ color: '#c6c6c6' }}>+12% vs last session</span>
          </div>
        </div>
        <div className="mt-8 w-full" style={{ borderTop: '1px solid rgba(71,71,71,0.2)' }} />
      </section>

      {/* Main Chart */}
      <section className="p-6 rounded-lg space-y-8" style={{ backgroundColor: '#121212' }}>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[0.75rem] uppercase tracking-widest mb-1" style={{ color: '#c6c6c6' }}>Weekly Intensity</p>
            <h2 className="text-2xl font-black text-white">LOAD TRENDS</h2>
          </div>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ffffff' }} />
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#474747' }} />
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#474747' }} />
          </div>
        </div>
        <div className="h-64 relative flex items-end justify-between gap-2 overflow-hidden">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between opacity-10">
            {[0, 1, 2, 3].map((i) => <div key={i} className="w-full" style={{ borderBottom: '1px solid white' }} />)}
          </div>
          <div className="w-full h-full flex items-end gap-2 px-2 relative z-10">
            {weekBars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm relative"
                style={{
                  height: `${h}%`,
                  backgroundColor: i === 3 ? '#ffffff' : '#353535',
                  boxShadow: i === 3 ? '0 0 20px rgba(255,255,255,0.2)' : 'none',
                }}
              >
                {i === 3 && (
                  <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-white px-2 py-1 rounded whitespace-nowrap"
                    style={{ backgroundColor: '#353535' }}
                  >
                    2.4k
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between text-[0.65rem] uppercase tracking-widest font-bold" style={{ color: '#c6c6c6' }}>
          {weekDays.map((d, i) => (
            <span key={d} style={{ color: i === 3 ? '#ffffff' : '#c6c6c6' }}>{d}</span>
          ))}
        </div>
      </section>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg p-6 flex flex-col justify-between h-40" style={{ backgroundColor: '#121212' }}>
          <div>
            <p className="text-[0.6rem] uppercase tracking-widest font-black" style={{ color: '#c6c6c6' }}>Average Heart Rate</p>
            <div className="text-4xl font-black text-white mt-2">
              142 <span className="text-sm font-light" style={{ color: '#c6c6c6' }}>BPM</span>
            </div>
          </div>
          <div className="w-full h-8 flex items-center">
            <svg className="w-full h-full" viewBox="0 0 100 20" fill="none" style={{ stroke: 'rgba(255,255,255,0.3)' }}>
              <path d="M0 10 L10 12 L20 8 L30 15 L40 5 L50 12 L60 10 L70 18 L80 12 L90 15 L100 8" strokeWidth="1" />
            </svg>
          </div>
        </div>
        <div className="rounded-lg p-6 flex flex-col justify-between h-40" style={{ backgroundColor: '#121212', borderLeft: '2px solid #ffffff' }}>
          <div>
            <p className="text-[0.6rem] uppercase tracking-widest font-black" style={{ color: '#c6c6c6' }}>Total Distance</p>
            <div className="text-4xl font-black text-white mt-2">
              18.2 <span className="text-sm font-light" style={{ color: '#c6c6c6' }}>KM</span>
            </div>
          </div>
          <div className="text-[0.6rem] uppercase tracking-widest font-black text-white">Target: 20.0 KM</div>
        </div>
      </div>

      {/* Session Specifications */}
      <section className="space-y-6 pt-4">
        <h3 className="text-[0.75rem] uppercase tracking-[0.3em] font-bold" style={{ color: '#c6c6c6' }}>SESSION SPECIFICATIONS</h3>
        <div className="grid grid-cols-2 gap-0.5 rounded overflow-hidden" style={{ backgroundColor: 'rgba(71,71,71,0.2)' }}>
          {specs.map((s) => (
            <div key={s.label} className="p-6" style={{ backgroundColor: '#121212' }}>
              <p className="text-[0.6rem] uppercase mb-1" style={{ color: '#c6c6c6' }}>{s.label}</p>
              <p className="text-xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recovery Window */}
      <section className="rounded-lg p-8 relative overflow-hidden" style={{ backgroundColor: '#121212' }}>
        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="space-y-4 text-center">
            <h4 className="text-3xl font-black text-white leading-tight">RECOVERY<br />WINDOW</h4>
            <p className="text-sm leading-relaxed" style={{ color: '#c6c6c6' }}>
              Based on your intensity profile and sleep telemetry, we recommend 14 hours of zone 1 activity before next maximal effort.
            </p>
          </div>
          <div className="relative flex items-center justify-center w-48 h-48">
            <svg className="w-full h-full -rotate-90">
              <circle cx="96" cy="96" r="80" fill="transparent" stroke="#2a2a2a" strokeWidth="8" />
              <circle cx="96" cy="96" r="80" fill="transparent" stroke="white" strokeWidth="8" strokeDasharray="502" strokeDashoffset="120" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-white">72%</span>
              <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: '#c6c6c6' }}>Primed</span>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 text-[12rem] font-black select-none pointer-events-none" style={{ color: 'rgba(255,255,255,0.03)' }}>
          DATA+
        </div>
      </section>
    </div>
  );
};
