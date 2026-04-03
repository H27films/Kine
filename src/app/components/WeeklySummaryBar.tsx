import React, { useState, useEffect } from 'react';
import { supabase, weeksAgoMonday } from '../../lib/supabase';
import { Dumbbell, Activity, Bike, Flame } from 'lucide-react';

const TOTAL_CARDIO_IDS = [82, 83, 87];

interface WeeklyStats {
  chest: number;
  back: number;
  legs: number;
  cardio: number;
  avgCalories: number | null;
}

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
        icon={<Bike size={14} />}
        label="Cardio"
        value={`${stats.cardio} km`}
      />
      <StatCol
        icon={<Flame size={14} />}
        label="Avg Cal"
        value={stats.avgCalories !== null ? `${stats.avgCalories.toLocaleString()}` : '—'}
      />
    </div>
  );
};
