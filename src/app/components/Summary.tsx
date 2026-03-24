import React from 'react';
import { Activity, Flame, Timer, TrendingUp, Calendar } from 'lucide-react';

export const Summary: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Weekly Overview */}
      <section>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Weekly Summary
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-5 flex flex-col justify-between min-h-[140px]" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <Flame size={18} color="white" />
              <span className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Calories</span>
            </div>
            <div>
              <div className="text-4xl font-black text-white">2,840</div>
              <div className="text-[12px] font-bold uppercase tracking-[-0.6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>BURNED</div>
            </div>
          </div>

          <div className="rounded-lg p-5 flex flex-col justify-between min-h-[140px]" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <Timer size={18} color="white" />
              <span className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Duration</span>
            </div>
            <div>
              <div className="text-4xl font-black text-white">5h 42</div>
              <div className="text-[12px] font-bold uppercase tracking-[-0.6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>TOTAL</div>
            </div>
          </div>

          <div className="rounded-lg p-5 flex flex-col justify-between min-h-[140px]" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <Activity size={18} color="white" />
              <span className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Sessions</span>
            </div>
            <div>
              <div className="text-4xl font-black text-white">6</div>
              <div className="text-[12px] font-bold uppercase tracking-[-0.6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>THIS WEEK</div>
            </div>
          </div>

          <div className="rounded-lg p-5 flex flex-col justify-between min-h-[140px]" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <TrendingUp size={18} color="white" />
              <span className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Distance</span>
            </div>
            <div>
              <div className="text-4xl font-black text-white">28.4</div>
              <div className="text-[12px] font-bold uppercase tracking-[-0.6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>KM TOTAL</div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Recent Activity
        </div>
        <div className="space-y-3">
          {[
            { day: 'Today', activity: 'Morning Trail Run', stat: '5.2 km', time: '32 min' },
            { day: 'Yesterday', activity: 'Upper Body Weights', stat: '12 sets', time: '45 min' },
            { day: 'Monday', activity: 'HIIT Cardio', stat: '420 cal', time: '28 min' },
            { day: 'Sunday', activity: 'Lower Body Weights', stat: '15 sets', time: '52 min' },
          ].map((item) => (
            <div
              key={item.day}
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-3">
                <Calendar size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <div>
                  <div className="text-sm font-bold text-white">{item.activity}</div>
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.day}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-white">{item.stat}</div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
