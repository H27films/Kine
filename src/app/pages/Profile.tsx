import React, { useState, useEffect } from 'react';
import { User, Download, RefreshCw } from 'lucide-react';
import { Page } from '../../types';
import { supabase } from '../../lib/supabase';

interface ProfileProps {
  onNavigate: (page: Page) => void;
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
};

export const Profile: React.FC<ProfileProps> = ({ onNavigate: _onNavigate }) => {
  const [exportCount, setExportCount] = useState<number | null>(null);
  const [exportDates, setExportDates] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState('');

  const loadData = async () => {
    const { data } = await supabase
      .from('workouts')
      .select('date')
      .eq('new_entry', 'New')
      .order('date');

    if (data) {
      setExportCount(data.length);
      const distinct = [...new Set((data as any[]).map(r => r.date as string))].sort();
      setExportDates(distinct);
    } else {
      setExportCount(0);
      setExportDates([]);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    setExportDone(false);
    try {
      const { data, error: err } = await supabase
        .from('workouts')
        .select('*, exercises(exercise_name)')
        .eq('new_entry', 'New')
        .order('date');

      if (err) throw err;
      if (!data || data.length === 0) {
        setExportError('No new entries to export.');
        setExporting(false);
        return;
      }

      const XLSX = await import('xlsx');

      const rows = (data as any[]).map(r => ({
        DATE: r.date ?? '',
        EXERCISE: r.exercises?.exercise_name ?? '',
        KM: r.km ?? '',
        CALORIES: r.calories ?? '',
        FOOD: r.food_rating ?? '',
        W1: r.w1 ?? '', R1: r.r1 ?? '',
        W2: r.w2 ?? '', R2: r.r2 ?? '',
        W3: r.w3 ?? '', R3: r.r3 ?? '',
        W4: r.w4 ?? '', R4: r.r4 ?? '',
        W5: r.w5 ?? '', R5: r.r5 ?? '',
        W6: r.w6 ?? '', R6: r.r6 ?? '',
        FAIL: r.fail ?? '',
        WEIGHT: r.bodyweight ?? '',
        'BODY FAT %': r.body_fat_percent ?? '',
        'MUSCLE MASS': r.muscle_mass ?? '',
        TIME: r.time ?? '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'New Entries');

      XLSX.writeFile(wb, 'ImportKineData.xlsx');

      const ids = (data as any[]).map(r => r.id);
      await supabase
        .from('workouts')
        .update({ new_entry: 'Exported' })
        .in('id', ids);

      setExportCount(0);
      setExportDates([]);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 4000);
    } catch (e: any) {
      setExportError(e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const hasRows = (exportCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Athlete section */}
      <div className="flex flex-col items-center py-8">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <User size={40} color="#666" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">ATHLETE</h2>
        <p className="text-sm" style={{ color: '#666' }}>Member since 2024</p>
      </div>

      {/* Export Data */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <p style={{
            fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em',
            color: '#ffffff', textTransform: 'uppercase',
          }}>
            Export Data
          </p>
          <button
            onClick={loadData}
            title="Check for new entries"
            style={{ color: 'rgba(255,255,255,0.25)', padding: '6px' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Count + Export button */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span style={{
              fontSize: '2.5rem', fontWeight: 900, lineHeight: 1,
              letterSpacing: '-0.03em',
              color: hasRows ? '#ffffff' : 'rgba(255,255,255,0.15)',
            }}>
              {exportCount ?? '—'}
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              new rows
            </span>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || !hasRows}
            className="flex items-center gap-2 font-black uppercase tracking-widest text-xs active:scale-95 duration-150"
            style={{
              padding: '10px 20px',
              borderRadius: '999px',
              backgroundColor: exportDone ? '#22c55e' : (hasRows ? '#ffffff' : '#1f1f1f'),
              color: exportDone ? '#fff' : (hasRows ? '#1a1a1a' : 'rgba(255,255,255,0.2)'),
              cursor: hasRows ? 'pointer' : 'default',
              transition: 'all 0.2s',
              boxShadow: hasRows ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
            }}
          >
            {exporting
              ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : exportDone
                ? <span>✓ Done</span>
                : <><Download size={13} /><span>Export</span></>
            }
          </button>
        </div>

        {/* Dates list */}
        {exportDates.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {exportDates.map(d => (
              <span key={d} style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.01em',
              }}>
                {formatDate(d)}
              </span>
            ))}
          </div>
        )}

        {exportError && (
          <p className="mt-3" style={{ color: '#ff5050', fontSize: '0.75rem' }}>{exportError}</p>
        )}
        {exportDone && (
          <p className="mt-3" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
            Rows marked as Exported — won't appear in future exports.
          </p>
        )}
      </div>
    </div>
  );
};
