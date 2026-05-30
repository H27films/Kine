import React, { useState, useEffect, useCallback } from 'react';
import { Clock, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const MATCH_KEYWORDS: Record<string, string> = {
  running: 'run',
  rowing: 'row',
  walking: 'walk',
  cycling: 'cycl',
  crosstrainer: 'cross',
};

type IconKey = 'running' | 'rowing' | 'walking' | 'cycling' | 'crosstrainer';
const ICON_KEYS: IconKey[] = ['running', 'rowing', 'walking', 'cycling', 'crosstrainer'];

const CardioIcon: React.FC<{ name: string; color: string }> = ({ name, color: c }) => {
  const key = ICON_KEYS.find(k => name.toLowerCase().includes(MATCH_KEYWORDS[k])) ?? 'running';
  switch (key) {
    case 'running':
      return (
        <svg width={20} height={20} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="25" y="18" width="35" height="3" rx="1.5" fill={c}/>
          <rect x="15" y="28" width="25" height="3" rx="1.5" fill={c}/>
          <rect x="5"  y="38" width="30" height="3" rx="1.5" fill={c}/>
          <rect x="20" y="48" width="25" height="3" rx="1.5" fill={c}/>
          <rect x="15" y="58" width="25" height="3" rx="1.5" fill={c}/>
          <circle cx="72" cy="22" r="6" fill={c}/>
          <path d="M48 38L65 28L75 35L85 45" stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M65 28L55 45L40 38"        stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M55 45L65 65L70 85"        stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M55 45L45 55L22 62"        stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'rowing':
      return (
        <svg width={20} height={20} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="25" r="5" fill={c}/>
          <path d="M50 30L45 50L55 55L65 45" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M45 50L40 60H55"          stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M65 45L75 45V35"          stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M30 65H80"                stroke={c} strokeWidth="5" strokeLinecap="round"/>
        </svg>
      );
    case 'walking':
      return (
        <svg width={20} height={20} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M40 70C40 80 30 85 25 80C20 75 25 60 30 50C35 40 45 40 45 50C45 60 40 60 40 70Z" fill={c}/>
          <circle cx="25" cy="40" r="3" fill={c}/>
          <circle cx="32" cy="35" r="3" fill={c}/>
          <circle cx="40" cy="35" r="3" fill={c}/>
          <circle cx="48" cy="40" r="3" fill={c}/>
          <path d="M60 70C60 80 70 85 75 80C80 75 75 60 70 50C65 40 55 40 55 50C55 60 60 60 60 70Z" fill={c}/>
          <circle cx="75" cy="40" r="3" fill={c}/>
          <circle cx="68" cy="35" r="3" fill={c}/>
          <circle cx="60" cy="35" r="3" fill={c}/>
          <circle cx="52" cy="40" r="3" fill={c}/>
        </svg>
      );
    case 'cycling':
      return (
        <svg width={20} height={20} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="25" cy="70" r="15" stroke={c} strokeWidth="5"/>
          <circle cx="75" cy="70" r="15" stroke={c} strokeWidth="5"/>
          <path d="M25 70L45 45H65L75 70" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M45 45L55 30H65"       stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="55" cy="25" r="4" fill={c}/>
        </svg>
      );
    case 'crosstrainer':
      return (
        <svg width={20} height={20} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="75" width="50" height="8" fill={c}/>
          <rect x="35" y="70" width="35" height="5" fill={c}/>
          <rect x="56" y="65" width="14" height="5" fill={c}/>
          <path d="M62 65V45L68 40" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="47" cy="23" r="6" fill={c}/>
          <path d="M47 28L40 45"    stroke={c} strokeWidth="9" strokeLinecap="round"/>
          <path d="M47 30L55 38L60 38" stroke={c} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M47 30L35 35L28 42" stroke={c} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M40 45L45 55L52 65" stroke={c} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M40 45L35 60L28 70" stroke={c} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
  }
};

interface CardioLog {
  id: number;
  name: string;
  km: number;
  date: string;
  time: string | null;
}

interface Props {
  refreshKey: number;
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

const RecentLogsCardio: React.FC<Props> = ({ refreshKey }) => {
  const [recentLogs, setRecentLogs] = useState<CardioLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editKm, setEditKm] = useState<Record<number, string>>({});
  const [savingLogId, setSavingLogId] = useState<number | null>(null);

  const loadRecent = useCallback(async () => {
    const { data } = await supabase
      .from('workouts')
      .select(`
        id, date, km, time,
        exercises:exercise_id(exercise_name)
      `)
      .eq('type', 'CARDIO')
      .not('exercise_id', 'is', null)
      .order('date', { ascending: false })
      .limit(50);

    if (data) {
      const logsByDate: Record<string, any[]> = {};
      for (const r of data as any[]) {
        if (!logsByDate[r.date]) logsByDate[r.date] = [];
        logsByDate[r.date].push(r);
      }

      const sortedDates = Object.keys(logsByDate).sort((a, b) => b.localeCompare(a));
      const selectedLogs: any[] = [];
      for (const date of sortedDates) {
        const dateLogs = logsByDate[date];
        if (selectedLogs.length === 0) {
          selectedLogs.push(...dateLogs);
        } else {
          const remaining = 5 - selectedLogs.length;
          if (remaining > 0) {
            selectedLogs.push(...dateLogs.slice(0, remaining));
          }
        }
        if (selectedLogs.length >= 5) break;
      }

      setRecentLogs(selectedLogs.map(r => ({
        id: r.id,
        name: r.exercises?.exercise_name || 'Unknown',
        km: Number(r.km || 0),
        date: r.date,
        time: r.time || null,
      })));
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent, refreshKey]);

  const deleteLog = async (id: number) => {
    await supabase.from('workouts').delete().eq('id', id);
    setRecentLogs(prev => prev.filter(l => l.id !== id));
    setDeleteConfirmId(null);
    setExpandedLogId(null);
  };

  const saveRecentLog = async (logId: number) => {
    const kmStr = editKm[logId];
    if (kmStr === undefined) return;
    const km = parseFloat(kmStr) || 0;
    setSavingLogId(logId);
    await supabase.from('workouts').update({ km }).eq('id', logId);
    await loadRecent();
    setSavingLogId(null);
  };

  return (
    <section style={{ marginBottom: 40 }}>
      <div className="flex justify-between items-center mb-3">
        <p style={sectionLabelStyle}>Recent Cardio</p>
        <Clock size={15} style={{ color: 'rgba(26,26,26,0.8)', marginBottom: '1.25rem' }} />
      </div>
      <div className="space-y-3">
        {recentLogs.map((log, index) => {
          const previousLog = index > 0 ? recentLogs[index - 1] : null;
          const showDateSeparator = previousLog && previousLog.date !== log.date;
          const isExpanded = expandedLogId === log.id;
          const isConfirming = deleteConfirmId === log.id;
          return (
            <React.Fragment key={log.id}>
              {showDateSeparator && (
                <div className="w-full h-[1px] bg-[#1a1a1a] opacity-80 my-2" />
              )}
              <div
                className="rounded-lg overflow-hidden"
                style={{ backgroundColor: 'rgba(0,0,0,0.05)', boxShadow: '0 3px 10px rgba(0,0,0,0.08)' }}
              >
                {/* Header row — thin, vertically centred */}
                <div
                  className="flex items-center gap-3 px-4 cursor-pointer"
                  style={{ height: 48 }}
                  onClick={() => {
                    const expanding = !isExpanded;
                    setExpandedLogId(expanding ? log.id : null);
                    setDeleteConfirmId(null);
                    if (expanding) setEditKm(prev => ({ ...prev, [log.id]: String(log.km || '') }));
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                    <CardioIcon name={log.name} color="#1a1a1a" />
                  </div>
                  <p style={{
                    flex: 1,
                    fontFamily: "'Archivo', sans-serif",
                    fontWeight: 600,
                    fontSize: '13px',
                    color: '#1a1a1a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {log.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0 }}>
                    <span style={{
                      color: '#1a1a1a',
                      fontWeight: 700,
                      fontSize: '13px',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      fontFamily: "'Archivo', sans-serif"
                    }}>
                      {log.km > 0 ? log.km.toFixed(1) : '—'}
                    </span>
                    {log.km > 0 && (
                      <span style={{
                        color: 'rgba(26,26,26,0.6)',
                        fontWeight: 500,
                        fontSize: '0.65rem',
                        lineHeight: 1,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontFamily: "'Archivo', sans-serif"
                      }}>
                        KM
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded section */}
                {isExpanded && (
                  <div style={{ padding: '16px' }}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(26,26,26,0.45)', fontFamily: "'Archivo', sans-serif" }}>
                          Distance (KM)
                        </p>
                        <div className="flex items-center gap-2 rounded-lg py-2 px-3" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={editKm[log.id] ?? ''}
                            placeholder="—"
                            onChange={e => setEditKm(prev => ({ ...prev, [log.id]: e.target.value }))}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              width: '100%',
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: editKm[log.id] ? '#1a1a1a' : 'rgba(0,0,0,0.25)',
                              fontFamily: "'Archivo', sans-serif",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); saveRecentLog(log.id); }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '1px',
                          color: savingLogId === log.id ? 'rgba(255,255,255,0.3)' : '#ffffff',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: '#1a1a1a',
                        }}
                      >
                        {savingLogId === log.id ? 'SAVING…' : 'SAVE'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(log.id); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.55)',
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
                          backdropFilter: 'blur(8px)',
                          cursor: 'pointer',
                          color: '#1a1a1a',
                          fontSize: '11px',
                          fontWeight: 500,
                          letterSpacing: '0.04em',
                        }}
                      >
                        <X size={13} strokeWidth={2.5} />
                        DELETE ENTRY
                      </button>
                    </div>

                    {isConfirming && (
                      <div className="flex items-center gap-3 mt-3">
                        <span style={{ fontSize: '11px', color: 'rgba(26,26,26,0.55)', flex: 1 }}>Delete this entry?</span>
                        <button onClick={() => deleteLog(log.id)} style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', padding: '6px 14px', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '6px', backgroundColor: 'rgba(220,38,38,0.1)' }}>
                          Yes, Delete
                        </button>
                        <button onClick={() => setDeleteConfirmId(null)} style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(26,26,26,0.4)', padding: '6px 14px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', background: 'rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};

export default RecentLogsCardio;