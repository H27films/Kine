import React, { useState } from 'react';
import { Dumbbell, ChevronRight, Minus, Plus, Clock } from 'lucide-react';
import { Page } from '../../types';

interface LogWeightsProps {
  onNavigate: (page: Page) => void;
}

const tabs: { label: string; page: Page }[] = [
  { label: 'Weights', page: 'weights' },
  { label: 'Cardio', page: 'cardio' },
  { label: 'Calories', page: 'calories' },
];

const muscleGroups = [
  { name: 'Back', id: 'back' },
  { name: 'Legs', id: 'legs' },
];

const recentLogs = [
  { name: 'Dumbbell Flyes', sets: 3, reps: 12, weight: 24.5 },
  { name: 'Incline Press', sets: 4, reps: 10, weight: 80.0 },
  { name: 'Cable Crossover', sets: 3, reps: 15, weight: 15.0 },
];

export const LogWeights: React.FC<LogWeightsProps> = ({ onNavigate }) => {
  const [reps, setReps] = useState(12);
  const [weight, setWeight] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('chest');

  return (
    <div>
      {/* Tab Navigation */}
      <nav className="flex justify-between items-center mb-10 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.page}
            onClick={() => onNavigate(tab.page)}
            className="flex-1 py-3 text-center transition-all"
            style={{
              borderBottom: tab.page === 'weights' ? '2px solid #ffffff' : '2px solid transparent',
              color: tab.page === 'weights' ? '#ffffff' : 'rgba(198,198,198,0.4)',
              fontWeight: tab.page === 'weights' ? 700 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Muscle Group Selection */}
      <section className="mb-12">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white">Target</h2>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: '#c6c6c6' }}>Select Muscle Group</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => setSelectedMuscle('chest')}
            className="p-6 rounded-lg flex flex-col justify-between aspect-square cursor-pointer active:scale-95 duration-200"
            style={{
              backgroundColor: '#2a2a2a',
              border: selectedMuscle === 'chest' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <Dumbbell size={32} color="white" />
            <span className="font-black uppercase tracking-tight text-xl text-white">Chest</span>
          </div>
          <div className="grid grid-rows-2 gap-3">
            {muscleGroups.map((mg) => (
              <div
                key={mg.id}
                onClick={() => setSelectedMuscle(mg.id)}
                className="p-4 rounded-lg flex items-center justify-between cursor-pointer active:scale-95 duration-200"
                style={{
                  backgroundColor: '#1b1b1b',
                  border: selectedMuscle === mg.id ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                }}
              >
                <span className="font-bold uppercase tracking-widest text-xs text-white">{mg.name}</span>
                <ChevronRight size={16} style={{ color: '#c6c6c6' }} />
              </div>
            ))}
          </div>
          <div
            onClick={() => setSelectedMuscle('shoulders')}
            className="col-span-2 p-4 rounded-lg flex items-center justify-between cursor-pointer active:scale-95 duration-200"
            style={{
              backgroundColor: '#1b1b1b',
              border: selectedMuscle === 'shoulders' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
            }}
          >
            <span className="font-bold uppercase tracking-widest text-xs text-white">Shoulders &amp; Arms</span>
            <ChevronRight size={16} style={{ color: '#c6c6c6' }} />
          </div>
        </div>
      </section>

      {/* New Entry */}
      <section className="mb-12 p-8 rounded-xl" style={{ backgroundColor: '#0e0e0e', border: '1px solid rgba(71,71,71,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: '#c6c6c6' }}>New Entry: Bench Press</h3>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="00"
              className="text-6xl font-black tracking-tighter text-white w-32 p-0"
              style={{ backgroundColor: 'transparent', border: 'none', color: '#ffffff' }}
            />
            <span className="text-xl font-bold uppercase tracking-widest" style={{ color: '#c6c6c6' }}>KG</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#c6c6c6' }}>Repetitions</label>
            <div className="flex items-center justify-between rounded-full px-4 py-2" style={{ backgroundColor: '#1b1b1b' }}>
              <button onClick={() => setReps(Math.max(1, reps - 1))} className="hover:text-white transition-colors" style={{ color: '#c6c6c6' }}>
                <Minus size={18} />
              </button>
              <span className="text-xl font-black text-white">{reps}</span>
              <button onClick={() => setReps(reps + 1)} className="hover:text-white transition-colors" style={{ color: '#c6c6c6' }}>
                <Plus size={18} />
              </button>
            </div>
          </div>
          <button className="font-black uppercase tracking-widest text-xs px-8 py-4 rounded-full mt-6 active:scale-90 duration-150" style={{ backgroundColor: '#ffffff', color: '#1a1c1c', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}>
            Log Set
          </button>
        </div>
      </section>

      {/* Recent Logs */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black tracking-tight uppercase text-white">Recent Logs</h2>
          <Clock size={18} style={{ color: '#c6c6c6' }} />
        </div>
        <div className="space-y-4">
          {recentLogs.map((log, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg transition-colors" style={{ backgroundColor: '#1b1b1b' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#353535' }}>
                <Dumbbell size={18} color="white" />
              </div>
              <div className="flex-grow">
                <h4 className="font-bold text-sm uppercase tracking-tight text-white">{log.name}</h4>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: '#c6c6c6' }}>{log.sets} Sets • {log.reps} Reps</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-black tracking-tighter text-white">{log.weight.toFixed(1)}</div>
                <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#c6c6c6' }}>Kilos</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
