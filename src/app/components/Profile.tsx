import React from 'react';
import { User, Trophy, Target, Activity, Calendar, ChevronRight } from 'lucide-react';
import { Page } from '../../types';

interface ProfileProps {
  onNavigate: (page: Page) => void;
}

const stats = [
  { icon: Trophy, value: '47', label: 'Workouts' },
  { icon: Target, value: '92%', label: 'Goal Rate' },
  { icon: Activity, value: '284', label: 'Total Hours' },
  { icon: Calendar, value: '23', label: 'Day Streak' },
];

const settings = [
  'Personal Information',
  'Goals & Preferences',
  'Notifications',
  'Connected Devices',
];

export const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  return (
    <div>
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-12 pt-4">
        <div
          className="rounded-full w-[120px] h-[120px] flex items-center justify-center mb-6"
          style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <User size={64} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </div>
        <h2 className="text-[32px] font-black tracking-[-1.6px] mb-2 text-white">ATHLETE</h2>
        <p className="text-sm tracking-[1.4px] uppercase" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Member since 2024
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg p-6"
              style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Icon size={24} className="text-white mb-4" />
              <div className="text-[32px] font-black leading-none mb-2 text-white">{stat.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <h3 className="text-[18px] font-black tracking-[-0.9px] uppercase mb-4 text-white">Settings</h3>
        {settings.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between p-5 rounded cursor-pointer active:scale-[0.98] transition-all"
            style={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="font-bold text-sm text-white">{item}</div>
            <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        ))}
      </div>
    </div>
  );
};
