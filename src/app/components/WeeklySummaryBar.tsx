import React, { useState, useEffect } from 'react';
import { supabase, weeksAgoMonday } from '../../lib/supabase';
import { Dumbbell, Flame } from 'lucide-react';

const TOTAL_CARDIO_IDS = [82, 83, 87];

interface WeeklyStats {
  chest: number;
  back: number;
  legs: number;
  cardio: number;
  avgCalories: number | null;
}

const RunnerIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="14" cy="3" r="2" />
    <path d="M10.5 8.5L7 10l1 3 3-1.5V15l-3.5 4h2.5l3-3.5 2 3.5H18l-3-6V9.5l2.5 2 1.5-2L16 7.5 14 7l-1.5 1-2-.5z" />
  </svg>
);

const StatCol: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
    <div style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <div
      className="font-bold uppercase tracking-widest"
      style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px' }}
    >
      {label}
    </div>
    <div
      className="font-bold"
      style={{ fontSize: '13px', color: '#ffffff' }}
    >
      {value}
    </div>
  </div>
);

export const WeeklySummaryBar: React.FC = () => {
  const [stats, setStats] = useState<WeeklyStats>({
    chest: 0,
    back: 0,
    legs: 0,
    cardio: 0,
    avgCalories: null,
  });

  useEffect(() => {
    const load = async () => {
      const monday = weeksAgoMonday(0);

      const [{ data: weightsData }, { data: cardioData }, { data: calData }] = await Promise.all([
        supabase
          .from('workouts')
          .select('type, total_weight')
          .in('type', ['CHEST', 'BACK', 'LEGS'])
          .gte('date', monday),
        supabase
          .from('workouts')
          .select('total_cardio')
          .in('exercise_id', TOTAL_CARDIO_IDS)
          .gte('date', monday),
        supabase
          .from('workouts')
          .select('calories')
          .eq('type', 'MEASUREMENT')
          .gte('date', monday)
          .not('calories', 'is', null),
      ]);

      const sumByType = (rows: any[] | null, type: string) =>
        (rows || []).filter(r => r.type === type).reduce((s: number, r: any) => s + Number(r.total_weight || 0), 0);

      const chest = sumByType(weightsData, 'CHEST');
      const back = sumByType(weightsData, 'BACK');
      const legs = sumByType(weightsData, 'LEGS');
      const cardio = +(((cardioData || []).reduce((s: number, r: any) => s + Number(r.total_cardio || 0), 0)).toFixed(1));

      const calValues = (calData || [])
        .map((r: any) => Number(r.calories || 0))
        .filter(v => v > 0);
      const avgCalories = calValues.length > 0
        ? Math.round(calValues.reduce((s, v) => s + v, 0) / calValues.length)
        : null;

      setStats({ chest, back, legs, cardio, avgCalories });
    };
    load();
  }, []);

  const fmtWeight = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        paddingTop: '10px',
        paddingBottom: '14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        marginBottom: '4px',
      }}
    >
      <StatCol
        icon={<Dumbbell size={14} />}
        label="Chest"
        value={fmtWeight(stats.chest) + ' kg'}
      />
      <StatCol
        icon={<Dumbbell size={14} />}
        label="Back"
        value={fmtWeight(stats.back) + ' kg'}
      />
      <StatCol
        icon={<Dumbbell size={14} />}
        label="Legs"
        value={fmtWeight(stats.legs) + ' kg'}
      />
      <StatCol
        icon={<RunnerIcon size={14} />}
        label="Cardio"
        value={`${stats.cardio} km`}
      />
      <StatCol
        icon={<Flame size={14} />}
        label="Cal"
        value={stats.avgCalories !== null ? `${stats.avgCalories.toLocaleString()}` : '\u2014'}
      />
    </div>
  );
};
