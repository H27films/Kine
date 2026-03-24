import React, { useState } from 'react';
import { Page } from '../../types';

interface LogCaloriesProps {
  onNavigate: (page: Page) => void;
}

const tabs: { label: string; page: Page }[] = [
  { label: 'Weights', page: 'weights' },
  { label: 'Cardio', page: 'cardio' },
  { label: 'Calories', page: 'calories' },
];

const weeklyBars = [60, 45, 80, 95, 70, 55, 75];
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthlyBars = [30, 40, 35, 60, 55, 45, 70, 65, 50, 40, 80, 75, 60, 50, 45];

type FoodRating = 'bad' | 'ok' | 'good';

export const LogCalories: React.FC<LogCaloriesProps> = ({ onNavigate }) => {
  const [calories, setCalories] = useState('1420');
  const [foodRating, setFoodRating] = useState<FoodRating>('ok');
  const [bodyWeight, setBodyWeight] = useState('78.5');
  const [bodyFat, setBodyFat] = useState('14.2');
  const [muscleMass, setMuscleMass] = useState('64.1');

  const ratingButtons: { label: string; value: FoodRating }[] = [
    { label: 'Bad', value: 'bad' },
    { label: 'Ok', value: 'ok' },
    { label: 'Good', value: 'good' },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <nav className="flex items-end justify-start gap-8 mb-12 overflow-x-auto hide-scrollbar" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.page}
            onClick={() => onNavigate(tab.page)}
            className="pb-4 text-[10px] uppercase tracking-[0.2em] transition-colors"
            style={{
              color: tab.page === 'calories' ? '#ffffff' : 'rgba(161,161,170,1)',
              fontWeight: 700,
              borderBottom: tab.page === 'calories' ? '2px solid #ffffff' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Total Calories Input */}
      <section className="mb-16 space-y-12">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color: 'rgba(161,161,170,1)' }}>Total Calories</label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="0000"
            className="w-full text-7xl font-black tracking-tighter text-white p-0"
            style={{ backgroundColor: 'transparent', border: 'none' }}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] mt-2 block" style={{ color: 'rgba(161,161,170,1)' }}>kcal today</span>
        </div>

        {/* Food Rating */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color: 'rgba(161,161,170,1)' }}>Food Rating</label>
          <div className="flex gap-2">
            {ratingButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setFoodRating(btn.value)}
                className="flex-1 py-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                style={{
                  backgroundColor: '#121212',
                  border: foodRating === btn.value ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.05)',
                  color: foodRating === btn.value ? '#ffffff' : 'rgba(161,161,170,1)',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Performance Trends */}
      <section className="mb-16">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8" style={{ color: 'rgba(161,161,170,1)' }}>Performance Trends</h3>
        <div className="space-y-10">
          {/* Weekly */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest mb-4 block" style={{ color: 'rgba(161,161,170,0.8)' }}>Calories: This Week</span>
            <div className="flex items-end justify-between h-32 gap-2">
              {weeklyBars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${h}%`,
                    backgroundColor: i === weeklyBars.length - 1 ? '#ffffff' : i === 3 ? '#3f3f46' : '#18181b',
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[8px] font-bold uppercase tracking-tighter" style={{ color: 'rgba(82,82,91,1)' }}>
              {weekDays.map((d) => <span key={d}>{d}</span>)}
            </div>
          </div>

          {/* Monthly */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest mb-4 block" style={{ color: 'rgba(161,161,170,0.8)' }}>Calories: This Month</span>
            <div className="flex items-end justify-between h-16 gap-1">
              {monthlyBars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${h}%`,
                    backgroundColor: i === 10 ? '#ffffff' : h >= 60 ? '#3f3f46' : 'rgba(24,24,27,0.5)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Body Measurements */}
      <section className="mb-8">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-6" style={{ color: 'rgba(161,161,170,1)' }}>Body Measurements</h3>
        <div className="grid grid-cols-1 gap-4">
          {[
            { label: 'Body Weight (KG)', value: bodyWeight, onChange: setBodyWeight },
            { label: 'Body Fat (%)', value: bodyFat, onChange: setBodyFat },
            { label: 'Muscle Mass (KG)', value: muscleMass, onChange: setMuscleMass },
          ].map((field) => (
            <div key={field.label} className="flex justify-between items-center p-5 rounded-lg" style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(161,161,170,0.8)' }}>{field.label}</label>
              <input
                type="number"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                step="0.1"
                className="text-right text-lg font-black tracking-tight text-white p-0 w-24"
                style={{ backgroundColor: 'transparent', border: 'none' }}
              />
            </div>
          ))}
        </div>
        <button className="w-full font-black uppercase tracking-widest text-[10px] py-5 rounded-full mt-8 active:scale-[0.98] transition-all" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
          Update Metrics
        </button>
      </section>
    </div>
  );
};
