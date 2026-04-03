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

      const rows = (data as any[]).map(r => {
        // Normalise time: old format was mm:ss:00, new is 00:mm:ss
        // Always output as 00:mm:ss (hh:mm:ss) so Excel reads it correctly
        let time = r.time ?? '';
        if (time) {
          const parts = time.split(':');
          if (parts.length === 3 && parts[0] !== '00') {
            // Old format mm:ss:00 → convert to 00:mm:ss
            time = `00:${parts[0]}:${parts[1]}`;
          }
        }
        return {
          DATE: r.date ? new Date(r.date + 'T00:00:00') : '',
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
          TIME: time,
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows, { cellDates: true });

      // Apply dd/mm/yyyy format to DATE column (column A, index 0)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: 0 });
        if (ws[addr]) ws[addr].z = 'DD/MM/YYYY';
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'New Entries');
      XLSX.writeFile(wb, 'ImportKineData.xlsx');

      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
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
        <p style={{
          fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em',
          color: '#ffffff', textTransform: 'uppercase', marginBottom: '16px',
        }}>
          Export Data
        </p>

        {exportCount === null ? (
          <p style={{ color: '#555', fontSize: '0.9rem' }}>Loading…</p>
        ) : hasRows ? (
          <>
            <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '8px' }}>
              {exportCount} new {exportCount === 1 ? 'entry' : 'entries'} ready to export
            </p>
            {exportDates.length > 0 && (
              <p style={{ color: '#555', fontSize: '0.78rem', marginBottom: '16px' }}>
                {formatDate(exportDates[0])}
                {exportDates.length > 1 && ` → ${formatDate(exportDates[exportDates.length - 1])}`}
              </p>
            )}
          </>
        ) : (
          <p style={{ color: '#555', fontSize: '0.85rem', marginBottom: '16px' }}>No new entries to export.</p>
        )}

        {exportError ? (
          <p style={{ color: '#ff4444', fontSize: '0.85rem', marginBottom: '12px' }}>{exportError}</p>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={exporting || !hasRows}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{
              backgroundColor: hasRows ? '#ffffff' : '#222',
              color: hasRows ? '#000' : '#555',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            {exportDone ? 'Exported!' : 'Export Excel'}
          </button>
        </div>
      </div>
    </div>
  );
};
