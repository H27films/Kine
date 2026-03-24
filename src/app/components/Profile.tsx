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

export const Profile: React.FC<ProfileProps> = ({ onNavigate: _onNavigate }) => {
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center py-8">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#1a1a1a' }}>
          <User size={40} color="#666" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">ATHLETE</h2>
        <p className="text-sm" style={{ color: '#666' }}>Member since 2024</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl p-4" style={{ backgroundColor: '#121212' }}>
              <Icon size={18} color="#666" />
              <p className="text-2xl font-black mt-2">{stat.value}</p>
              <p className="text-xs" style={{ color: '#666' }}>{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Settings */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#121212' }}>
        <h3 className="text-sm font-bold px-4 pt-4 pb-2" style={{ color: '#666' }}>Settings</h3>
        {settings.map((item) => (
          <div key={item} className="flex items-center justify-between px-4 py-3 cursor-pointer" style={{ borderBottom: '1px solid #1a1a1a' }}>
            <span className="text-sm">{item}</span>
            <ChevronRight size={16} color="#444" />
          </div>
        ))}
      </div>
    </div>
  );
};
