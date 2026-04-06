import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { supabase, currentWeekMonday, weeksAgoMonday } from '../../lib/supabase';

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];
const WEEKLY_MAX = 30000;

interface WeeklyGroupData {
  group: string;
  total: number;
  lastWeek: number;
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.03em',
  textTransform: 'uppercase', color: '#ffffff', marginBottom: '1.25rem',
};

const WeeklyVolumeSection: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklyGroupData[]>([]);

  useEffect(() => {
    const loadWeekly = async () => {
      const thisMonday = currentWeekMonday();
      const lastMonday = weeksAgoMonday(1);

      const [{ data: thisWeek }, { data: lastWeek }] = await Promise.all([
        supabase.from('workouts').select('type, total_weight').in('type', WEIGHT_TYPES).gte('date', thisMonday),
        supabase.from('workouts').select('type, total_weight').in('type', WEIGHT_TYPES).gte('date', lastMonday).lt('date', thisMonday),
      ]);

      const sumByType = (rows: any[] | null, type: string) =>
        (rows || []).filter(r => r.type === type).reduce((s, r) => s + Number(r.total_weight || 0), 0);

      const groups = ['CHEST', 'BACK', 'LEGS'].map(t => ({
        group: t.charAt(0) + t.slice(1).toLowerCase(),
        total: sumByType(thisWeek, t),
        lastWeek: sumByType(lastWeek, t),
      }));
      setWeeklyData(groups);
    };
    loadWeekly();
  }, []);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <p style={{ ...sectionLabelStyle, marginBottom: 0 }}>Weekly</p>
        <Calendar size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
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
                    Last week: {Math.round(lastWeek).toLocaleString()}kg
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
