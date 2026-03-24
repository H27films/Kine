import React from 'react';
import { Heart, Mountain, TrendingUp, Zap, ChevronRight } from 'lucide-react';

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Hero Metric */}
      <section className="pt-4">
        <div className="flex flex-col items-start">
          <div className="text-[5rem] font-black leading-none tracking-[-4px] text-white" style={{ textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>
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

      {/* Bento Grid */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-lg p-5 flex flex-col justify-between min-h-[160px]" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between">
            <Heart size={18} color="white" />
            <span className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Heart Rate</span>
          </div>
          <div>
            <div className="text-4xl font-black text-white">142</div>
            <div className="text-[12px] font-bold uppercase tracking-[-0.6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>BPM AVG</div>
          </div>
        </div>

        <div className="rounded-lg p-5 flex flex-col justify-between min-h-[160px]" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between">
            <Mountain size={18} color="white" />
            <span className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Elevation</span>
          </div>
          <div>
            <div className="text-4xl font-black text-white">482</div>
            <div className="text-[12px] font-bold uppercase tracking-[-0.6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>METERS</div>
          </div>
        </div>
      </section>

      {/* Route Map Placeholder */}
      <section className="rounded-xl overflow-hidden relative" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="h-48 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)' }}>
          <div className="text-center">
            <Mountain size={32} style={{ color: 'rgba(255,255,255,0.2)' }} className="mx-auto mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Route Map</span>
          </div>
        </div>
        <div className="p-5 flex justify-between items-center">
          <div>
            <div className="text-sm font-bold text-white uppercase tracking-tight">Morning Trail Run</div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Tokyo, Japan • 6:42 AM</div>
          </div>
          <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </div>
      </section>

      {/* Stats Rows */}
      <section className="space-y-3">
        <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <TrendingUp size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Average Pace</div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-white tracking-tighter">4&apos;42&quot;</span>
            <span className="text-[10px] font-bold uppercase ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>/km</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <Zap size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Peak Power</div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-white tracking-tighter">320</span>
            <span className="text-[10px] font-bold uppercase ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>W</span>
          </div>
        </div>
      </section>
    </div>
  );
};
