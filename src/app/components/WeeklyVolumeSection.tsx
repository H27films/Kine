import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];
const WEEKLY_MAX = 30000;

interface WeeklyGroupData {
  group: string;
  total: number;
  lastWeek: number;
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '15px', fontWeight: 900, letterSpacing: '0.2em',
  textTransform: 'uppercase', color: '#ffffff', marginBottom: '1.25rem',
};

const WeeklyVolumeSection: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklyGroupData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [weekIdx, setWeekIdx] = useState(0);
  const [showWeekPicker, setShowWeekPicker] = useState(false);

  const loadWeeklyData = async (weeks: number[], idx: number) => {
    if (weeks.length === 0) return;
    const currentWeek = weeks[idx] ?? 0;
    const lastWeek = weeks[idx + 1] ?? 0;

    const [{ data: thisWeek }, { data: lastWeekData }] = await Promise.all([
      supabase.from('workouts').select('type, total_weight').in('type', WEIGHT_TYPES).eq('week', currentWeek),
      supabase.from('workouts').select('type, total_weight').in('type', WEIGHT_TYPES).eq('week', lastWeek),
    ]);

    const sumByType = (rows: any[] | null, type: string) =>
      (rows || []).filter(r => r.type === type).reduce((s, r) => s + Number(r.total_weight || 0), 0);

    const groups = ['CHEST', 'BACK', 'LEGS'].map(t => ({
      group: t.charAt(0) + t.slice(1).toLowerCase(),
      total: sumByType(thisWeek, t),
      lastWeek: sumByType(lastWeekData, t),
    }));
    setWeeklyData(groups);
  };

  // On mount: fetch weeks then immediately load weekly data — no extra round trip
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('week')
        .in('type', WEIGHT_TYPES)
        .not('week', 'is', null);
      if (!data) return;
      const weeks = [...new Set((data as any[]).map(r => Number(r.week)))]
        .filter(w => !isNaN(w))
        .sort((a, b) => b - a);
      setAvailableWeeks(weeks);
      await loadWeeklyData(weeks, 0);
    };
    init();
  }, []);

  // When user navigates weeks (not on initial mount)
  useEffect(() => {
    if (availableWeeks.length === 0) return;
    loadWeeklyData(availableWeeks, weekIdx);
  }, [weekIdx]);

  const canGoBack = weekIdx < availableWeeks.length - 1;
  const canGoForward = weekIdx > 0;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p style={{ ...sectionLabelStyle, marginBottom: 0 }}>Weekly</p>
          {showWeekPicker && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setWeekIdx(i => i + 1)}
                disabled={!canGoBack}
                style={{ opacity: canGoBack ? 0.6 : 0.2, background: 'none', border: 'none', cursor: canGoBack ? 'pointer' : 'default', padding: 0 }}
              >
                <ChevronLeft size={18} color="white" />
              </button>
              <button
                onClick={() => setWeekIdx(i => i - 1)}
                disabled={!canGoForward}
                style={{ opacity: canGoForward ? 0.6 : 0.2, background: 'none', border: 'none', cursor: canGoForward ? 'pointer' : 'default', padding: 0 }}
              >
                <ChevronRight size={18} color="white" />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => { setShowWeekPicker(!showWeekPicker); setWeekIdx(0); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
        >
          {showWeekPicker ? (
            <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.85rem' }}>{availableWeeks[weekIdx]}</span>
          ) : (
            <Calendar size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
          )}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {weeklyData.map(({ group, total, lastWeek }) => {
          const pct = Math.min((total / WEEKLY_MAX) * 100, 100);
          return (
            <div key={group}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.6rem', paddingLeft: '2px', paddingRight: '2px' }}>
                <div>
                  <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', display: 'block' }}>{group}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: 400, marginTop: '1px', display: 'block' }}>
                    {weekIdx === 0 ? 'Last week' : 'Previous'}: {Math.round(lastWeek).toLocaleString()}kg
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.02em', lineHeight: 1 }}>{Math.round(total).toLocaleString()}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>kg</span>
                </div>
              </div>
              <div style={{ height: '44px', width: '100%', backgroundColor: '#1f1f1f', borderRadius: '999px', overflow: 'hidden', padding: '5px' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #c6c6c7 0%, #ffffff 100%)', borderRadius: '999px', boxShadow: '0 0 14px rgba(255,255,255,0.25)', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WeeklyVolumeSection;
