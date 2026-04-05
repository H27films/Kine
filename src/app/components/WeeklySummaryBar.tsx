import React, { useState, useEffect } from 'react';
import { supabase, weeksAgoMonday } from '../../lib/supabase';

const TOTAL_CARDIO_IDS = [82, 83, 87];

const TARGETS = {
  chest: 27500,
  back: 27500,
  legs: 30000,
  cardio: 100,
  cal: 1500,
};

interface WeeklyStats {
  chest: number;
  back: number;
  legs: number;
  cardio: number;
  avgCalories: number | null;
}

interface ProgressRingProps {
  label: string;
  value: string;
  pct: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ label, value, pct }) => {
  const size = 60;
  const strokeWidth = 4;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(pct, 0), 1);
  const pctDisplay = Math.round(clampedPct * 100);
  const offset = circumference * (1 - clampedPct);
  const filterId = `arc-glow-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ display: 'block' }}>
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />

          {/* Filled arc with glow */}
          {clampedPct > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(200,220,255,0.95)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              filter={`url(#${filterId})`}
            />
          )}
        </svg>

        {/* Centre label + % */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              color: 'rgba(255,255,255,0.75)',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '11px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1,
            }}
          >
            {pctDisplay}%
          </div>
        </div>
      </div>

      {/* Total value below ring */}
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '13px',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.95)',
          letterSpacing: '0.5px',
          textAlign: 'center',
          lineHeight: 1,
          textTransform: 'uppercase',
        }}
      >
        {value}
      </div>
    </div>
  );
};

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

      const [{ data: weightsData }, { data: cardioData }, { data: calData }] =
        await Promise.all([
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
        (rows || [])
          .filter(r => r.type === type)
          .reduce((s: number, r: any) => s + Number(r.total_weight || 0), 0);

      const chest = sumByType(weightsData, 'CHEST');
      const back = sumByType(weightsData, 'BACK');
      const legs = sumByType(weightsData, 'LEGS');
      const cardio = +(
        (cardioData || [])
          .reduce((s: number, r: any) => s + Number(r.total_cardio || 0), 0)
          .toFixed(1)
      );

      const calValues = (calData || [])
        .map((r: any) => Number(r.calories || 0))
        .filter(v => v > 0);
      const avgCalories =
        calValues.length > 0
          ? Math.round(calValues.reduce((s, v) => s + v, 0) / calValues.length)
          : null;

      setStats({ chest, back, legs, cardio, avgCalories });
    };
    load();
  }, []);

  const fmtWeight = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k KG` : `${Math.round(v)} KG`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: '10px',
        paddingBottom: '10px',
      }}
    >
      <ProgressRing
        label="Chest"
        value={fmtWeight(stats.chest)}
        pct={stats.chest / TARGETS.chest}
      />
      <ProgressRing
        label="Back"
        value={fmtWeight(stats.back)}
        pct={stats.back / TARGETS.back}
      />
      <ProgressRing
        label="Legs"
        value={fmtWeight(stats.legs)}
        pct={stats.legs / TARGETS.legs}
      />
      <ProgressRing
        label="Cardio"
        value={`${stats.cardio} KM`}
        pct={stats.cardio / TARGETS.cardio}
      />
      <ProgressRing
        label="Cal"
        value={
          stats.avgCalories !== null
            ? `${stats.avgCalories.toLocaleString()} KCAL`
            : '\u2014'
        }
        pct={stats.avgCalories !== null ? stats.avgCalories / TARGETS.cal : 0}
      />
    </div>
  );
};
