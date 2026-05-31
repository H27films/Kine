import React, { useRef } from 'react';
import { ChevronRight, ChevronUp, Plus, Minus, Check } from 'lucide-react';
import { AddedExercise, SetRow } from '../pages/LogWeights';

const EST_SLATE = '#868E96';

interface ExerciseItemProps {
  ex: AddedExercise;
  swipeOffset: number;
  hasData: boolean;
  exTotal: number;
  estFromLast: number;
  showEstHeader: boolean;
  toggleExpanded: (id: number) => void;
  loadLastSession: (id: number) => void;
  adjustWeight: (id: number, idx: number, delta: number) => void;
  updateSet: (id: number, idx: number, field: 'weight' | 'reps', value: string | number) => void;
  addSet: (id: number) => void;
  removeExercise: (id: number) => void;
  toggleFail: (id: number) => void;
  loadMaxSession: (id: number) => void;
  toggleCopyFromLast: (id: number) => void;
  setSwipeOffsets: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  onRemove: (id: number) => void;
  touchStartX: React.MutableRefObject<Record<number, number>>;
}

export const ExerciseItem: React.FC<ExerciseItemProps> = ({
  ex,
  swipeOffset,
  hasData,
  exTotal,
  estFromLast,
  showEstHeader,
  toggleExpanded,
  loadLastSession,
  adjustWeight,
  updateSet,
  addSet,
  removeExercise,
  toggleFail,
  loadMaxSession,
  toggleCopyFromLast,
  setSwipeOffsets,
  onRemove,
  touchStartX,
}) => {
  const mult = ex.exercise.multiplier ?? 1;
  const lastSummary = ex.lastSets && ex.lastSets.length > 0
    ? `Last: ${ex.lastSets.length} sets — ${ex.lastSets[0].weight}kg × ${ex.lastSets[0].reps}`
    : 'No previous data';

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 0 }}>
      {/* Swipe-to-remove background */}
      {!ex.expanded && (
        <div
          style={{
            position: 'absolute', right: '-80px', top: 0, bottom: 0,
            width: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.12)', zIndex: 0,
          }}>
          <span style={{ color: 'rgba(0,0,0,0.8)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em' }}>REMOVE</span>
        </div>
      )}

      {/* Compact row */}
      <div
        className="flex items-center gap-4 py-4"
        style={{
          position: 'relative', zIndex: 1,
          borderBottom: ex.expanded ? 'none' : '1px solid rgba(0,0,0,0.06)',
          transform: ex.expanded ? 'none' : `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.25s ease' : 'none',
          backgroundColor: '#f2f2f2', willChange: 'transform',
        }}
        onTouchStart={ex.expanded ? undefined : (e) => {
          touchStartX.current[ex.exercise.id] = e.touches[0].clientX;
        }}
        onTouchMove={ex.expanded ? undefined : (e) => {
          const dx = e.touches[0].clientX - (touchStartX.current[ex.exercise.id] || 0);
          if (dx < 0) setSwipeOffsets(prev => ({ ...prev, [ex.exercise.id]: Math.max(dx, -80) }));
        }}
        onTouchEnd={ex.expanded ? undefined : () => {
          const offset = swipeOffset;
          if (offset < -50) {
            onRemove(ex.exercise.id);
            setSwipeOffsets(prev => { const n = { ...prev }; delete n[ex.exercise.id]; return n; });
          } else {
            setSwipeOffsets(prev => ({ ...prev, [ex.exercise.id]: 0 }));
          }
        }}
      >
        {/* Check circle */}
        <div
          onClick={(e) => { e.stopPropagation(); loadLastSession(ex.exercise.id); }}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: hasData || ex.logged ? 'none' : '2px solid rgba(26,26,26,0.2)',
            backgroundColor: hasData || ex.logged ? '#1a1a1a' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.25s', cursor: 'pointer',
          }}
        >
          {(hasData || ex.logged) && <Check size={14} color="#ffffff" strokeWidth={3} />}
        </div>

        {/* Exercise name, summary, PB badge, chevron */}
        <div className="flex-grow flex items-center justify-between" onClick={() => toggleExpanded(ex.exercise.id)} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div>
              <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>
                {ex.exercise.exercise_name.charAt(0).toUpperCase() + ex.exercise.exercise_name.slice(1).toLowerCase()}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(26,26,26,0.4)' }}>
                {ex.expanded && ex.exercise.info_notes ? ex.exercise.info_notes : lastSummary}
              </p>
            </div>
            {!ex.expanded && exTotal > 0 && (ex.pbThreshold ?? 0) > 0 && exTotal > (ex.pbThreshold ?? 0) && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.05em' }}>PB</span>
              </div>
            )}
          </div>
          <div style={{ color: 'rgba(26,26,26,0.8)' }}>
            {ex.expanded ? <ChevronUp size={20} /> : <ChevronRight size={20} />}
          </div>
        </div>
      </div>

      {/* Expanded card */}
      {ex.expanded && (
        <div className="pb-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          {/* Total / KG / PB header + copy button */}
          <div className="flex items-center justify-between mb-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="flex items-baseline gap-2 flex-wrap">
                {exTotal > 0 && (
                  <>
                    <span className="font-black" style={{ fontSize: '1.5rem', color: '#1a1a1a', lineHeight: 1 }}>{exTotal.toLocaleString()}</span>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1a1a1a' }}>KG</span>
                  </>
                )}
                {showEstHeader && (
                  <>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: EST_SLATE }}>EST.</span>
                    <span className="font-black" style={{ fontSize: '1.5rem', color: EST_SLATE, lineHeight: 1 }}>{estFromLast.toLocaleString()}</span>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: EST_SLATE }}>KG</span>
                  </>
                )}
              </div>
              {exTotal > 0 && (ex.pbThreshold ?? 0) > 0 && exTotal > (ex.pbThreshold ?? 0) && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.05em' }}>PB</span>
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); toggleCopyFromLast(ex.exercise.id); }}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                backgroundColor: ex.copied ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)',
                border: ex.copied ? '1px solid rgba(0,0,0,0.3)' : '1px solid rgba(0,0,0,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: ex.copied ? '#1a1a1a' : 'rgba(26,26,26,0.55)',
                cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
              }}
            >
              {ex.copied ? <Minus size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
            </button>
          </div>

          {/* Column headers */}
          <div className="grid mb-2" style={{ gridTemplateColumns: '1.8rem 1fr 1fr 1fr', gap: '0.5rem' }}>
            <div />
            {['kg', 'reps', 'total'].map(h => (
              <p key={h} className="text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(26,26,26,0.3)' }}>{h}</p>
            ))}
          </div>

          {/* Sets grid */}
          {ex.sets.map((set, idx) => {
            const w = parseFloat(set.weight) || 0;
            const rowTotal = w * set.reps * mult;
            const rowHasData = set.weight !== '';
            const numColor = rowHasData ? '#1a1a1a' : 'rgba(26,26,26,0.25)';
            return (
              <div key={idx} className="grid items-center mb-2" style={{ gridTemplateColumns: '1.8rem 1fr 1fr 1fr', gap: '0.5rem' }}>
                <p className="font-black" style={{ fontSize: '1rem', color: numColor, lineHeight: 1, textAlign: 'center' }}>{idx + 1}</p>
                <div className="flex items-center justify-between rounded-lg py-2 px-2" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => adjustWeight(ex.exercise.id, idx, -1)} style={{ color: 'rgba(0,0,0,0.5)', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>−</button>
                  <input
                    type="number" inputMode="decimal" value={set.weight} placeholder="—"
                    onChange={e => updateSet(ex.exercise.id, idx, 'weight', e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', textAlign: 'center', fontSize: '0.875rem', fontWeight: 700, color: rowHasData ? '#1a1a1a' : 'rgba(26,26,26,0.3)', MozAppearance: 'textfield' }}
                  />
                  <button onClick={() => adjustWeight(ex.exercise.id, idx, 1)} style={{ color: 'rgba(0,0,0,0.5)', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>+</button>
                </div>
                <div className="flex items-center justify-between rounded-lg py-2 px-2" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => updateSet(ex.exercise.id, idx, 'reps', Math.max(1, set.reps - 1))} style={{ color: 'rgba(0,0,0,0.5)', lineHeight: 1 }}>−</button>
                  <span className="font-bold" style={{ fontSize: '0.875rem', color: rowHasData ? '#1a1a1a' : 'rgba(26,26,26,0.3)' }}>{set.reps}</span>
                  <button onClick={() => updateSet(ex.exercise.id, idx, 'reps', set.reps + 1)} style={{ color: 'rgba(0,0,0,0.5)', lineHeight: 1 }}>+</button>
                </div>
                <p className="text-center font-bold" style={{ fontSize: '0.875rem', color: '#1a1a1a' }}>{rowTotal > 0 ? rowTotal : '—'}</p>
              </div>
            );
          })}

          {/* Action pills */}
          <div className="flex items-center gap-5 mt-4 flex-wrap">
            {ex.sets.length < 6 && (
              <button onClick={(e) => { e.stopPropagation(); addSet(ex.exercise.id); }} className="font-bold uppercase tracking-widest" style={{ fontSize: '11px', padding: '3px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.55)', background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <Plus size={11} /><span>SET</span>
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); removeExercise(ex.exercise.id); }} className="font-bold uppercase tracking-widest" style={{ fontSize: '11px', padding: '3px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.55)', background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <Minus size={11} /><span>REMOVE</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleFail(ex.exercise.id); }}
              className="font-bold uppercase tracking-widest"
              style={{ fontSize: '11px', padding: '3px 12px', borderRadius: '999px', border: ex.fail ? '1px solid rgba(220,38,38,0.7)' : '1px solid rgba(255,255,255,0.55)', background: ex.fail ? 'rgba(220,38,38,0.15)' : 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)', boxShadow: ex.fail ? 'inset 0 0 0 1px rgba(220,38,38,0.2)' : 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: ex.fail ? '#dc2626' : 'rgba(0,0,0,0.5)', transition: 'all 0.2s', letterSpacing: '0.1em' }}
            >
              Fail
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); loadMaxSession(ex.exercise.id); }}
              className="font-bold uppercase tracking-widest"
              style={{ fontSize: '11px', padding: '3px 12px', borderRadius: '999px', border: ex.loadedMax ? '1px solid #1a1a1a' : '1px solid rgba(255,255,255,0.55)', background: ex.loadedMax ? '#1a1a1a' : 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)', boxShadow: ex.loadedMax ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: ex.loadedMax ? '#ffffff' : 'rgba(0,0,0,0.5)', transition: 'all 0.2s', letterSpacing: '0.1em' }}
            >
              Max
            </button>
          </div>
        </div>
      )}
    </div>
  );
};