import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StravaActivity {
  id: number;
  activity_id: number;
  date: string;
  type: string;
  distance_km: number;
  name: string;
  time_formatted: string;
  workout_calories: number | null;
}

interface StravaViewerProps {
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  Run: '#FC4C02',
  Walk: '#1a1a1a',
  Ride: '#1a1a1a',
  Rowing: '#1a1a1a',
  WeightTraining: '#1a1a1a',
  Elliptical: '#1a1a1a',
  VirtualRide: '#1a1a1a',
  Hike: '#1a1a1a',
  CrossTrainer: '#1a1a1a',
};

const TYPE_LABELS: Record<string, string> = {
  Run: 'RUN',
  Walk: 'WALK',
  Ride: 'RIDE',
  Rowing: 'ROW',
  WeightTraining: 'WEIGHTS',
  Elliptical: 'ELLIPTICAL',
  VirtualRide: 'VIRTUAL RIDE',
  Hike: 'HIKE',
  CrossTrainer: 'CROSS TRAINER',
};

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
};

const StravaViewer: React.FC<StravaViewerProps> = ({ onClose }) => {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [editingId, setEditingId] = useState<number | null>(null);

  const filters = ['All', 'Run', 'Walk', 'Ride', 'Rowing', 'WeightTraining', 'CrossTrainer'];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('strava')
        .select('*')
        .order('date', { ascending: false });
      setActivities((data as StravaActivity[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleTypeChange = async (activity: StravaActivity, newType: string) => {
    const newName = newType === 'CrossTrainer'
      ? activity.name.replace(/walk/gi, 'Cross Trainer')
      : activity.name.replace(/cross trainer/gi, 'Walk');
    const { error } = await supabase
      .from('strava')
      .update({ type: newType, name: newName })
      .eq('id', activity.id);
    if (!error) {
      setActivities(prev => prev.map(a =>
        a.id === activity.id ? { ...a, type: newType, name: newName } : a
      ));
    }
    setEditingId(null);
  };

  const filtered = filter === 'All'
    ? activities
    : activities.filter(a => a.type === filter);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: '#f2f2f2',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'JetBrains Mono', monospace",
        animation: 'slideUp 0.25s ease',
      }}
      onClick={() => setEditingId(null)}
    >

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <span style={{
          fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em',
          color: '#1a1a1a', textTransform: 'uppercase',
        }}>
          Strava Data
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(26,26,26,0.45)', letterSpacing: '0.1em' }}>
            {filtered.length} ACTIVITIES
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#1a1a1a' }}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{
        display: 'flex', gap: '8px', padding: '12px 20px',
        overflowX: 'auto', scrollbarWidth: 'none',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: '999px', flexShrink: 0,
              backgroundColor: filter === f ? '#1a1a1a' : 'rgba(0,0,0,0.06)',
              color: filter === f ? '#f2f2f2' : '#1a1a1a',
              border: 'none', cursor: 'pointer',
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {TYPE_LABELS[f] || f}
          </button>
        ))}
      </div>

      {/* Activity list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(26,26,26,0.35)', fontSize: '12px' }}>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(26,26,26,0.35)', fontSize: '12px' }}>
            No activities
          </div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              {/* Left: name + date + type */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '9px', fontWeight: 500, color: '#1a1a1a',
                    letterSpacing: '0.02em', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: '160px',
                  }}>
                    {a.name}
                  </span>
                  <span style={{ fontSize: '9px', color: 'rgba(26,26,26,0.35)', letterSpacing: '0.05em' }}>
                    {formatDate(a.date)}
                  </span>
                </div>

                {/* Type label — tappable if Walk */}
                <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                  <div
                    onClick={() => a.type === 'Walk' ? setEditingId(editingId === a.id ? null : a.id) : undefined}
                    style={{
                      fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em',
                      color: TYPE_COLORS[a.type] || '#1a1a1a',
                      textTransform: 'uppercase',
                      cursor: a.type === 'Walk' ? 'pointer' : 'default',
                      textDecoration: a.type === 'Walk' ? 'underline dotted' : 'none',
                      display: 'inline-block',
                    }}
                  >
                    {TYPE_LABELS[a.type] || a.type}
                  </div>

                  {/* Dropdown */}
                  {editingId === a.id && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, zIndex: 50,
                      backgroundColor: '#f2f2f2', borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      overflow: 'hidden', minWidth: '140px',
                      marginTop: '4px',
                    }}>
                      {['Walk', 'CrossTrainer'].map((opt, i) => (
                        <div
                          key={opt}
                          onClick={() => handleTypeChange(a, opt)}
                          style={{
                            padding: '10px 14px', cursor: 'pointer',
                            fontSize: '11px', fontWeight: 700,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: a.type === opt ? '#FC4C02' : '#1a1a1a',
                            backgroundColor: a.type === opt ? 'rgba(0,0,0,0.04)' : 'transparent',
                            borderBottom: i === 0 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {TYPE_LABELS[opt]}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: stats */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                {a.distance_km > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                      {a.distance_km}
                    </div>
                    <div style={{ fontSize: '8px', color: 'rgba(26,26,26,0.4)', letterSpacing: '0.1em' }}>KM</div>
                  </div>
                )}
                {a.time_formatted && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#1a1a1a', letterSpacing: '0.02em' }}>
                      {a.time_formatted}
                    </div>
                    <div style={{ fontSize: '8px', color: 'rgba(26,26,26,0.4)', letterSpacing: '0.1em' }}>TIME</div>
                  </div>
                )}
                {a.workout_calories && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#1a1a1a', letterSpacing: '0.02em' }}>
                      {a.workout_calories}
                    </div>
                    <div style={{ fontSize: '8px', color: 'rgba(26,26,26,0.4)', letterSpacing: '0.1em' }}>KCAL</div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default StravaViewer;