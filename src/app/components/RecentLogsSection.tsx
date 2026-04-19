import React, { useState, useEffect, useCallback } from 'react';
import { Dumbbell, Clock, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const WEIGHT_TYPES = ['CHEST', 'BACK', 'LEGS'];

interface RecentLog {
  id: number;
  name: string;
  weight: number;
  setsData: { w: number; r: number }[]; // non-zero only, for collapsed summary
  allSets: { w: number; r: number }[];   // all 6 slots for editing
  date: string;
  pb: string | null;
  multiplier: number;
}

interface Props {
  refreshKey: number;
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '15px', fontWeight: 900, letterSpacing: '0.2em',
  textTransform: 'uppercase', color: '#ffffff', marginBottom: '1.25rem',
};

const RecentLogsSection: React.FC<Props> = ({ refreshKey }) => {
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editSets, setEditSets] = useState<Record<number, { w: string; r: number }[]>>({});
  const [savingLogId, setSavingLogId] = useState<number | null>(null);

  const loadRecent = useCallback(async () => {
    const { data } = await supabase
      .from('workouts')
      .select('id, date, total_weight, pb, w1, r1, w2, r2, w3, r3, w4, r4, w5, r5, w6, r6, exercises:exercise_id(exercise_name, multiplier)')
      .in('type', WEIGHT_TYPES)
      .order('date', { ascending: false })
      .limit(50);
    if (data) {
      // Group logs by date
      const logsByDate: Record<string, any[]> = {};
      for (const r of data as any[]) {
        if (!logsByDate[r.date]) logsByDate[r.date] = [];
        logsByDate[r.date].push(r);
      }
      // Sort dates descending
      const sortedDates = Object.keys(logsByDate).sort((a, b) => b.localeCompare(a));
      const selectedLogs: any[] = [];
      for (const date of sortedDates) {
        const dateLogs = logsByDate[date];
        if (selectedLogs.length === 0) {
          // First date: add all logs
          selectedLogs.push(...dateLogs);
        } else {
          // Subsequent dates: add up to make total 5
          const remaining = 5 - selectedLogs.length;
          if (remaining > 0) {
            selectedLogs.push(...dateLogs.slice(0, remaining));
          }
        }
        // If first date had >5, keep all; else stop at 5 total
        if (selectedLogs.length >= 5) break;
      }
       setRecentLogs(selectedLogs.map(r => {
         const setsData: { w: number; r: number }[] = [];
         const allSets: { w: number; r: number }[] = [];
         for (let i = 1; i <= 6; i++) {
           const w = Number(r[`w${i}`] || 0);
           const reps = Number(r[`r${i}`] || 0);
           allSets.push({ w, r: reps });
           if (w > 0) setsData.push({ w, r: reps });
         }
         return {
           id: r.id,
           name: r.exercises?.exercise_name || 'Unknown',
           weight: Number(r.total_weight || 0),
           setsData,
           allSets,
           date: r.date,
           pb: r.pb || null,
           multiplier: r.exercises?.multiplier ?? 1,
         };
       }));
    }
  }, []);

  // Fetch on mount and whenever parent signals a new save via refreshKey
  useEffect(() => {
    loadRecent();
  }, [loadRecent, refreshKey]);

  const deleteLog = async (id: number) => {
    await supabase.from('workouts').delete().eq('id', id);
    setRecentLogs(prev => prev.filter(l => l.id !== id));
    setDeleteConfirmId(null);
    setExpandedLogId(null);
  };

  const initEditSets = (log: RecentLog) => {
    setEditSets(prev => ({
      ...prev,
      [log.id]: log.allSets.map(s => ({ w: s.w > 0 ? String(s.w) : '', r: s.r > 0 ? s.r : 10 }))
    }));
  };

  const adjustRecentWeight = (logId: number, idx: number, delta: number) => {
    setEditSets(prev => {
      const sets = [...(prev[logId] || [])];
      const cur = parseFloat(sets[idx].w) || 0;
      sets[idx] = { ...sets[idx], w: String(Math.max(0, cur + delta)) };
      return { ...prev, [logId]: sets };
    });
  };

  const adjustRecentReps = (logId: number, idx: number, delta: number) => {
    setEditSets(prev => {
      const sets = [...(prev[logId] || [])];
      sets[idx] = { ...sets[idx], r: Math.max(1, sets[idx].r + delta) };
      return { ...prev, [logId]: sets };
    });
  };

  const saveRecentLog = async (logId: number) => {
    const sets = editSets[logId];
    if (!sets) return;
    setSavingLogId(logId);
    const updateData: Record<string, number | null> = {};
    const log = recentLogs.find(l => l.id === logId);
    const multiplier = log?.multiplier ?? 1;
    let totalWeight = 0;
    sets.forEach((s, i) => {
      const w = parseFloat(s.w) || 0;
      updateData[`w${i + 1}`] = w > 0 ? w : null;
      updateData[`r${i + 1}`] = w > 0 ? s.r : null;
      totalWeight += w * s.r * multiplier;
    });
    updateData.total_weight = totalWeight;
    await supabase.from('workouts').update(updateData).eq('id', logId);
    await loadRecent();
    setSavingLogId(null);
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-6">
        <p style={sectionLabelStyle}>Recent Logs</p>
        <Clock size={15} style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.25rem' }} />
      </div>
      <div className="space-y-3">
        {recentLogs.map((log) => {
          const isExpanded = expandedLogId === log.id;
          const isConfirming = deleteConfirmId === log.id;
          const lastSet = log.setsData[log.setsData.length - 1];
          const sets = editSets[log.id] || [];
          return (
            <div key={log.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1b1b1b' }}>
              {/* Collapsed / header row */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => {
                  const expanding = !isExpanded;
                  setExpandedLogId(expanding ? log.id : null);
                  setDeleteConfirmId(null);
                  if (expanding) initEditSets(log);
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#353535' }}>
                  <Dumbbell size={16} color="white" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-bold text-sm text-white truncate uppercase tracking-wide">
                    {log.name}
                  </p>
                  {lastSet && (
                    <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {log.setsData.length} Sets · {lastSet.r} Reps · {lastSet.w} kg
                    </p>
                  )}
                </div>
                {log.pb === 'PB' && (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#000000', letterSpacing: '0.05em' }}>PB</span>
                  </div>
                )}
                {log.weight > 0 && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0, marginLeft: 'auto', alignSelf: 'flex-start', marginTop: '2px' }}>
                    <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.15rem', letterSpacing: '-0.02em', lineHeight: 1 }}>{Math.round(log.weight).toLocaleString()}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KG</span>
                  </div>
                )}
              </div>

              {/* Expanded section */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 16px 16px' }}>
                  {/* Column headers */}
                  <div className="grid mb-2" style={{ gridTemplateColumns: '1.8rem 1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div />
                    {['kg', 'reps', 'total'].map(h => (
                      <p key={h} className="text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</p>
                    ))}
                  </div>

                   {/* Set rows — only show originally-logged (non-zero) sets */}
                   {sets.map((s, idx) => {
                     if ((log.allSets[idx]?.w || 0) === 0) return null;
                     const w = parseFloat(s.w) || 0;
                     const rowTotal = w * s.r * log.multiplier;
                     const hasData = s.w !== '' && w > 0;
                     const numColor = hasData ? '#ffffff' : 'rgba(255,255,255,0.25)';
                    return (
                      <div key={idx} className="grid items-center mb-2" style={{ gridTemplateColumns: '1.8rem 1fr 1fr 1fr', gap: '0.5rem' }}>
                        <p className="font-black text-center" style={{ fontSize: '1rem', color: numColor, lineHeight: 1 }}>{idx + 1}</p>

                        <div className="flex items-center justify-between rounded-lg py-2 px-2" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <button onClick={() => adjustRecentWeight(log.id, idx, -1)} style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>−</button>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={s.w}
                            placeholder="—"
                            onChange={e => setEditSets(prev => {
                              const updated = [...(prev[log.id] || [])];
                              updated[idx] = { ...updated[idx], w: e.target.value };
                              return { ...prev, [log.id]: updated };
                            })}
                            style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', textAlign: 'center', fontSize: '0.875rem', fontWeight: 700, color: hasData ? '#ffffff' : 'rgba(255,255,255,0.3)', MozAppearance: 'textfield' }}
                          />
                          <button onClick={() => adjustRecentWeight(log.id, idx, 1)} style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>+</button>
                        </div>

                        <div className="flex items-center justify-between rounded-lg py-2 px-2" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <button onClick={() => adjustRecentReps(log.id, idx, -1)} style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>−</button>
                          <span className="font-bold" style={{ fontSize: '0.875rem', color: hasData ? '#ffffff' : 'rgba(255,255,255,0.3)' }}>{s.r}</span>
                          <button onClick={() => adjustRecentReps(log.id, idx, 1)} style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>+</button>
                        </div>

                        <p className="text-center font-bold" style={{ fontSize: '0.875rem', color: '#ffffff' }}>{rowTotal > 0 ? rowTotal : ''}</p>
                      </div>
                    );
                  })}

                  {/* Save + Delete */}
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); saveRecentLog(log.id); }}
                      style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: savingLogId === log.id ? 'rgba(255,255,255,0.3)' : '#ffffff', padding: '6px 14px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.06)' }}
                    >
                      {savingLogId === log.id ? 'SAVING…' : 'SAVE'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(log.id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: 'rgba(255,80,80,0.7)', padding: '6px 0' }}
                    >
                      <X size={13} strokeWidth={2.5} />
                      DELETE ENTRY
                    </button>
                  </div>

                  {/* Delete confirm */}
                  {isConfirming && (
                    <div className="flex items-center gap-3 mt-3">
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', flex: 1 }}>Delete this entry?</span>
                      <button onClick={() => deleteLog(log.id)} style={{ fontSize: '11px', fontWeight: 700, color: '#ff4444', padding: '6px 14px', border: '1px solid rgba(255,68,68,0.4)', borderRadius: '6px', backgroundColor: 'rgba(255,68,68,0.1)' }}>
                        Yes, Delete
                      </button>
                      <button onClick={() => setDeleteConfirmId(null)} style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', padding: '6px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default RecentLogsSection;
