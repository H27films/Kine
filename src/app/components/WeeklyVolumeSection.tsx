import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, getISOWeek } from '../../lib/supabase';

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];
const WEEKLY_MAX = 30000;

interface WeeklyGroupData {
  group: string;
  total: number;
  lastWeek: number;
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: '#1a1a1a',
  marginBottom: '1.25rem',
  fontFamily: "'Archivo', sans-serif",
};

const WeeklyVolumeSection: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklyGroupData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [weekIdx, setWeekIdx] = useState(0);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [currentWeek] = useState<number>(() => getISOWeek(new Date()));

  const loadWeeklyData = async (weeks: number[], idx: number) => {
    const selectedWeek = idx === 0 ? currentWeek : (weeks[idx - 1] ?? currentWeek);
    const prevWeek = idx === 0 ? (weeks[0] ?? currentWeek - 1) : (weeks[idx] ?? selectedWeek - 1);

    const [{ data: thisWeek }, { data: lastWeekData }] = await Promise.all([
      supabase.from('workouts').select('type, total_weight').in('type', WEIGHT_TYPES).eq('week', selectedWeek),
      supabase.from('workouts').select('type, total_weight').in('type', WEIGHT_TYPES).eq('week', prevWeek),
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

  useEffect(() => {
    if (availableWeeks.length === 0) return;
    loadWeeklyData(availableWeeks, weekIdx);
  }, [weekIdx]);

  const canGoBack = weekIdx < availableWeeks.length - 1;
  const canGoForward = weekIdx > 0;

  const displayedWeekNumber = weekIdx === 0 ? currentWeek : (availableWeeks[weekIdx - 1] ?? currentWeek);

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
                <ChevronLeft size={18} color="#1a1a1a" />
              </button>
              <button
                onClick={() => setWeekIdx(i => i - 1)}
                disabled={!canGoForward}
                style={{ opacity: canGoForward ? 0.6 : 0.2, background: 'none', border: 'none', cursor: canGoForward ? 'pointer' : 'default', padding: 0 }}
              >
                <ChevronRight size={18} color="#1a1a1a" />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => { setShowWeekPicker(!showWeekPicker); setWeekIdx(0); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
        >
          {showWeekPicker ? (
            <span style={{ color: '#1a1a1a', fontWeight: 800, fontSize: '0.85rem', fontFamily: "'Archivo', sans-serif" }}>
              {displayedWeekNumber}
            </span>
          ) : (
            <Calendar size={18} style={{ color: 'rgba(26,26,26,0.8)' }} />
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
                  <span style={{ color: '#1a1a1a', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em', display: 'block', fontFamily: "'Archivo', sans-serif", textTransform: 'uppercase' }}>{group}</span>
                  <span style={{ color: 'rgba(26,26,26,0.75)', fontSize: '12px', fontWeight: 400, marginTop: '1px', display: 'block', fontFamily: "'Archivo', sans-serif" }}>
                    {weekIdx === 0 ? 'Last week' : 'Previous'}: {Math.round(lastWeek).toLocaleString()}kg
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  <span style={{ color: '#1a1a1a', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Archivo', sans-serif" }}>{Math.round(total).toLocaleString()}</span>
                  <span style={{ color: 'rgba(26,26,26,0.45)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Archivo', sans-serif" }}>kg</span>
                </div>
              </div>
              <div style={{ height: '44px', width: '100%', backgroundColor: 'rgba(26,26,26,0.1)', borderRadius: '999px', overflow: 'hidden', padding: '5px' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#1a1a1a', borderRadius: '999px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WeeklyVolumeSection;