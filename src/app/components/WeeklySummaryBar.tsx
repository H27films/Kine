import React, { useState, useEffect } from 'react';
import { supabase, weeksAgoMonday } from '../../lib/supabase';

const TOTAL_CARDIO_IDS = [82, 83, 87];
const WEIGHT_MAX = 30000;
const CARDIO_MAX = 100;
const CALORIES_MAX = 2500;

interface WeeklyStats {
  chest: number;
  back: number;
  legs: number;
  cardio: number;
  avgCalories: number | null;
}

const StatRow: React.FC<{ label: string; value: string; pct: number }> = ({ label, value, pct }) => (
  <div className="flex items-center gap-3">
    <div
      className="text-[10px] font-bold uppercase tracking-[1.5px] flex-shrink-0"
      style={{ color: 'rgba(255,255,255,0.35)', width: '3rem' }}
    >
      {label}
    </div>
    <div
      className="flex-1 rounded-full overflow-hidden"
      style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.08)' }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(Math.max(pct * 100, 0), 100)}%`,
          background: pct > 0 ? 'linear-gradient(90deg, #777 0%, #ffffff 100%)' : 'transparent',
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
    <div
      className="text-right flex-shrink-0 font-bold"
      style={{ fontSize: '11px', color: '#ffffff', width: '5rem' }}
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
    v >= 1000 ? `${(v / 1000).toFixed(1)}k kg` : `${Math.round(v)} kg`;

  return (
    <div style={{ paddingTop: '8px', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <StatRow label="Chest" value={fmtWeight(stats.chest)} pct={stats.chest / WEIGHT_MAX} />
      <StatRow label="Back" value={fmtWeight(stats.back)} pct={stats.back / WEIGHT_MAX} />
      <StatRow label="Legs" value={fmtWeight(stats.legs)} pct={stats.legs / WEIGHT_MAX} />
      <StatRow label="Cardio" value={`${stats.cardio} km`} pct={stats.cardio / CARDIO_MAX} />
      <StatRow
        label="Avg Cal"
        value={stats.avgCalories !== null ? `${stats.avgCalories.toLocaleString()} kcal` : '—'}
        pct={stats.avgCalories !== null ? stats.avgCalories / CALORIES_MAX : 0}
      />
    </div>
  );
};
