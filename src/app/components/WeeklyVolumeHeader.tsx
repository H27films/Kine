import React from 'react';
import { ArrowLeftFromLine } from 'lucide-react';

interface WeeklyVolumeHeaderProps {
  weekTotal: number;
  lastWeekTotal: number;
  todayTotal: number;
  selectedGroup: string;
  addedExercisesCount: number;
  onShowEntryCard: () => void;
}

export const WeeklyVolumeHeader: React.FC<WeeklyVolumeHeaderProps> = ({
  weekTotal,
  lastWeekTotal,
  todayTotal,
  selectedGroup,
  addedExercisesCount,
  onShowEntryCard,
}) => {
  const fmtVol = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;

  return (
    <>
      {/* Weekly volume display — collapses when group selected */}
      <div style={{
        maxHeight: selectedGroup ? '0px' : '160px',
        opacity: selectedGroup ? 0 : 1,
        overflow: 'hidden',
        transition: 'max-height 0.35s ease, opacity 0.25s ease, margin 0.35s ease',
        marginBottom: selectedGroup ? '0px' : '1.5rem',
      }}>
        <div className="flex items-start w-full">
          <div className="text-[3.25rem] font-black leading-none tracking-tighter flex-shrink-0" style={{ color: '#1a1a1a' }}>
            {fmtVol(weekTotal)}
            {lastWeekTotal > 0 && (
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(26,26,26,0.85)', marginTop: '7px', letterSpacing: '0.08em', lineHeight: 1 }}>
                LAST WEEK {Math.round(lastWeekTotal).toLocaleString()} KG
              </div>
            )}
          </div>
          <div className="flex flex-col ml-4 pt-1 flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2.5px', color: '#1a1a1a' }}>
                VOLUME (KG)
              </div>
              {todayTotal > 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginLeft: '12px', flexShrink: 0 }}>
                  <span style={{ color: '#1a1a1a', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em', lineHeight: 1 }}>{Math.round(todayTotal).toLocaleString()}</span>
                  <span style={{ color: 'rgba(26,26,26,0.35)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KG</span>
                </div>
              )}
            </div>
            {lastWeekTotal > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                <div style={{
                  flex: 1, height: '8px',
                  backgroundColor: 'rgba(26,26,26,0.08)',
                  borderRadius: '999px', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0,
                    width: `${Math.min(100, (todayTotal / 25000) * 100)}%`,
                    background: 'linear-gradient(to right, #1a1a1a, rgba(26,26,26,0.45))',
                    borderRadius: '999px', transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            )}
            {!selectedGroup && addedExercisesCount === 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  onClick={onShowEntryCard}
                  style={{
                    background: 'none',
                    border: '0.5px solid rgba(0,0,0,0.55)',
                    borderRadius: '50%',
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#1a1a1a', transition: 'all 0.2s',
                  }}
                >
                  <ArrowLeftFromLine size={18} strokeWidth={1.5} style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's total — visible when group selected */}
      {selectedGroup && todayTotal > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ color: '#1a1a1a', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {Math.round(todayTotal).toLocaleString()}
            </span>
            <span style={{ color: 'rgba(26,26,26,0.35)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              KG TODAY
            </span>
          </div>
        </div>
      )}
    </>
  );
};