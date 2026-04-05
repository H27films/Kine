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
  const dotCount = 20;
  const ringRadius = 24;
  const dotRadius = 2.2;
  const clampedPct = Math.min(Math.max(pct, 0), 1);
  const filledCount = Math.round(clampedPct * dotCount);
  const pctDisplay = Math.round(clampedPct * 100);
  const filterId = `dot-glow-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ display: 'block' }}>
          <defs>
            <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="1.8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Empty dots */}
          {Array.from({ length: dotCount }, (_, i) => {
            if (i < filledCount) return null;
            const angle = (i / dotCount) * 2 * Math.PI - Math.PI / 2;
            const cx = size / 2 + ringRadius * Math.cos(angle);
            const cy = size / 2 + ringRadius * Math.sin(angle);
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={dotRadius}
                fill="rgba(255,255,255,0.08)"
              />
            );
          })}

          {/* Filled dots with glow */}
          <g filter={`url(#${filterId})`}>
            {Array.from({ length: dotCount }, (_, i) => {
              if (i >= filledCount) return null;
              const angle = (i / dotCount) * 2 * Math.PI - Math.PI / 2;
              const cx = size / 2 + ringRadius * Math.cos(angle);
              const cy = size / 2 + ringRadius * Math.sin(angle);
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={dotRadius}
                  fill="rgba(200,220,255,0.95)"
                />
              );
            })}
          </g>
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
              color: 'rgba(255,255,255,0.5)',
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
          fontSize: '11px',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.75)',
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
