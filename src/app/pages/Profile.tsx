import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, BarChart3, Menu, Home, Dumbbell as DumbbellIcon, Database } from 'lucide-react';
import { Page } from '../../types';
import { supabase } from '../../lib/supabase';
import ExercisesPlus from '../components/ExercisesPlus';
import WorkoutsData from '../components/WorkoutsData';
import { RunningManIcon, CaloriesIcon } from '../components/NavIcons';
import { WaveTimeline } from '../components/WaveTimeline';
import Strava from '../components/Strava';

interface ProfileProps {
  onNavigate: (page: Page) => void;
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const fmtMMM = (dateStr: string): string => {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  } catch {
    return dateStr;
  }
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();
};

interface NavItem {
  label: string;
  icon: React.ReactNode;
  page: Page;
}

const ProfileUserIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path fillRule="evenodd" clipRule="evenodd" d="M16.5 7.063C16.5 10.258 14.57 13 12 13c-2.572 0-4.5-2.742-4.5-5.938C7.5 3.868 9.16 2 12 2s4.5 1.867 4.5 5.063zM4.102 20.142C4.487 20.6 6.145 22 12 22c5.855 0 7.512-1.4 7.898-1.857a.416.416 0 0 0 .09-.317C19.9 18.944 19.106 15 12 15s-7.9 3.944-7.989 4.826a.416.416 0 0 0 .091.317z" fill="#1a1a1a" />
  </svg>
);

export const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const [exportCount, setExportCount] = useState<number | null>(null);
  const [newCount, setNewCount] = useState<number | null>(null);
  const [editCount, setEditCount] = useState<number | null>(null);
  const [exportDates, setExportDates] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState('');
  const [showExercises, setShowExercises] = useState(false);
  const [showWorkoutsData, setShowWorkoutsData] = useState(false);
  const [lastExportDisplay, setLastExportDisplay] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  /** Min/max workout dates for WaveTimeline when nothing is pending export (all rows are Exported). */
  const [allWorkoutDateSpan, setAllWorkoutDateSpan] = useState<{ first: string; last: string } | null>(null);

  // Load last export date from Supabase (most recent date with new_entry = 'Exported')
  useEffect(() => {
    const loadLastExportDate = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('date')
        .eq('new_entry', 'Exported')
        .order('date', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastDate = data[0].date as string;
        setLastExportDisplay(fmtMMM(lastDate));
      } else {
        // Default date
        setLastExportDisplay('APR 11');
      }
    };
    loadLastExportDate();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    const [{ data: newData }, { data: editData }, { data: allDatesRows }] = await Promise.all([
      supabase
        .from('workouts')
        .select('date')
        .eq('new_entry', 'New')
        .order('date'),
      supabase
        .from('workouts')
        .select('date')
        .eq('new_entry', 'Edit')
        .order('date'),
      supabase
        .from('workouts')
        .select('date')
        .not('date', 'is', null)
        .order('date'),
    ]);

    const totalData = [...(newData || []), ...(editData || [])];
    const totalCount = totalData.length;

    if (totalData.length > 0) {
      setExportCount(totalCount);
      setNewCount(newData?.length || 0);
      setEditCount(editData?.length || 0);
      const distinct = [...new Set(totalData.map(r => r.date as string))].sort();
      setExportDates(distinct);
    } else {
      setExportCount(0);
      setNewCount(0);
      setEditCount(0);
      setExportDates([]);
    }

    if (allDatesRows && allDatesRows.length > 0) {
      const sorted = [...new Set((allDatesRows as { date: string }[]).map(r => r.date))].sort();
      setAllWorkoutDateSpan({ first: sorted[0], last: sorted[sorted.length - 1] });
    } else {
      setAllWorkoutDateSpan(null);
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
        .in('new_entry', ['New', 'Edit'])
        .order('date');

      if (err) throw err;
      if (!data || data.length === 0) {
        setExportError('No new entries to export.');
        setExporting(false);
        return;
      }

      const XLSX = await import('xlsx');

      const rows = (data as any[]).map(r => {
        let time = r.time ?? '';
        if (time) {
          const parts = time.split(':');
          if (parts.length === 3 && parts[0] !== '00') {
            time = `00:${parts[0]}:${parts[1]}`;
          }
        }
        return {
          DATE: r.date ? new Date(r.date + 'T00:00:00') : '',
          EXERCISE: r.exercises?.exercise_name ?? '',
          KM: r.km ?? '',
          CALORIES: r.calories ?? '',
          FOOD: r.food_rating ? String(r.food_rating).toUpperCase() : '',
          W1: r.w1 ?? '', R1: r.r1 ?? '',
          W2: r.w2 ?? '', R2: r.r2 ?? '',
          W3: r.w3 ?? '', R3: r.r3 ?? '',
          W4: r.w4 ?? '', R4: r.r4 ?? '',
          W5: r.w5 ?? '', R5: r.r5 ?? '',
          W6: r.w6 ?? '', R6: r.r6 ?? '',
          FAIL: r.fail ? String(r.fail).toUpperCase() : '',
          WEIGHT: r.bodyweight ?? '',
          'BODY FAT %': r.body_fat_percent ?? '',
          'MUSCLE MASS': r.muscle_mass ?? '',
          TIME: time,
          NEW_ENTRY: r.new_entry ?? '',
        };
      });

      const applyDateFormat = (ws: any) => {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: 0 });
          if (ws[addr]) ws[addr].z = 'DD/MM/YYYY';
        }
      };

      const newRows = rows.filter(r => String(r.NEW_ENTRY).toLowerCase() === 'new');
      const editRows = rows.filter(r => String(r.NEW_ENTRY).toLowerCase() === 'edit');

      const headers = ['DATE','EXERCISE','KM','CALORIES','FOOD','W1','R1','W2','R2','W3','R3','W4','R4','W5','R5','W6','R6','FAIL','WEIGHT','BODY FAT %','MUSCLE MASS','TIME','NEW_ENTRY'];
      const wb = XLSX.utils.book_new();
      const ws1 = newRows.length > 0
        ? XLSX.utils.json_to_sheet(newRows, { cellDates: true })
        : XLSX.utils.aoa_to_sheet([headers]);
      applyDateFormat(ws1);
      XLSX.utils.book_append_sheet(wb, ws1, 'Sheet1');
      const ws2 = editRows.length > 0
        ? XLSX.utils.json_to_sheet(editRows, { cellDates: true })
        : XLSX.utils.aoa_to_sheet([headers]);
      applyDateFormat(ws2);
      XLSX.utils.book_append_sheet(wb, ws2, 'Sheet2');
      XLSX.writeFile(wb, 'ImportKineData.xlsx');

      const ids = (data as any[]).map(r => r.id).filter(Boolean);
      if (ids.length > 0) {
        await supabase
          .from('workouts')
          .update({ new_entry: 'Exported' })
          .in('id', ids);
      }

      // Fetch the most recent Exported date from Supabase
      const { data: exportedData } = await supabase
        .from('workouts')
        .select('date')
        .eq('new_entry', 'Exported')
        .order('date', { ascending: false })
        .limit(1);

      if (exportedData && exportedData.length > 0) {
        const lastDate = exportedData[0].date as string;
        setLastExportDisplay(fmtMMM(lastDate));
        localStorage.setItem('kine_last_export_date', lastDate);
      }

      await loadData();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (e: any) {
      setExportError(e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const hasRows = (exportCount ?? 0) > 0;

  const chartFirstDate =
    exportDates.length > 0 ? exportDates[0] : allWorkoutDateSpan?.first ?? '';
  const chartLastDate =
    exportDates.length > 0 ? exportDates[exportDates.length - 1] : allWorkoutDateSpan?.last ?? '';
  const showWaveTimeline = Boolean(chartFirstDate && chartLastDate);

  const navItems: NavItem[] = [
    { label: 'Home', icon: <Home size={20} />, page: 'dashboard' },
    { label: 'Weights', icon: (
      <svg width={20} height={20} viewBox="0 0 122.88 122.88" fill="currentColor">
        <path d="M1.61,97.18l5.38-5.38c0.14-0.14,0.29-0.27,0.44-0.4l-3.86-3.86v0c-0.06-0.06-0.11-0.12-0.16-0.18c-0.96-1.05-1.44-2.38-1.44-3.7c0-1.4,0.54-2.8,1.61-3.87l0,0l0,0l0,0l5.38-5.38l0,0c0.14-0.14,0.29-0.27,0.44-0.4l-3.86-3.86h0c-1.07-1.07-1.6-2.48-1.6-3.88c0-1.4,0.54-2.8,1.6-3.87l0,0l0,0l0,0l5.38-5.38c1.07-1.07,2.48-1.6,3.88-1.6c1.41,0,2.81,0.53,3.88,1.6l47.21,47.21c1.07,1.07,1.6,2.48,1.6,3.88c0,1.41-0.53,2.81-1.6,3.88l-5.38,5.38v0c-0.06,0.06-0.12,0.11-0.18,0.16c-1.05,0.96-2.38,1.44-3.7,1.44c-1.4,0-2.8-0.54-3.87-1.6l0,0l0,0l0,0l-3.27-3.27c-0.12,0.15-0.25,0.3-0.39,0.44l0,0l0,0l-5.38,5.38h0c-0.06,0.06-0.12,0.11-0.18,0.16c-1.04,0.95-2.37,1.43-3.7,1.43c-1.41,0-2.81-0.53-3.87-1.6l0,0l0,0l0,0l-4.46-4.46c-0.12,0.15-0.25,0.3-0.4,0.44l-5.38,5.38c-1.07,1.07-2.48,1.6-3.88,1.6c-1.4,0-2.81-0.53-3.88-1.6L1.61,104.95C0.54,103.88,0,102.47,0,101.07C0,99.66,0.54,98.26,1.61,97.18L1.61,97.18zM65.85,8.98l-5.38,5.38h0l-0.05,0.05c-0.08,0.11-0.12,0.24-0.12,0.37c0,0.15,0.06,0.31,0.17,0.42h0l47.21,47.21c0.11,0.11,0.26,0.17,0.42,0.17c0.15,0,0.31-0.06,0.42-0.17l5.38-5.38l0,0l0.05-0.05c0.08-0.1,0.12-0.24,0.12-0.37c0-0.16-0.05-0.31-0.16-0.42l0,0l0,0l-7.13-7.13v0L74.41,16.71l-7.72-7.72v0c-0.11-0.11-0.26-0.17-0.42-0.17C66.11,8.81,65.96,8.87,65.85,8.98zM71.47,47.31c1.34-1.34,3.52-1.34,4.87,0c1.34,1.34,1.34,3.52,0,4.87L52.74,75.76c-1.34,1.34-3.52,1.34-4.87,0c-1.34-1.34-1.34-3.52,0-4.87L71.47,47.31zM100.65,5.07l-5.38,5.38l0,0c-0.12,0.12-0.18,0.27-0.18,0.42c0,0.13,0.04,0.25,0.12,0.36l0.06,0.06l0,0h0l16.32,16.32l0,0l0.05,0.05c0.1,0.08,0.23,0.11,0.36,0.11c0.15,0,0.31-0.06,0.42-0.17l5.38-5.38v0c0.12-0.12,0.18-0.27,0.18-0.42c0-0.15-0.06-0.31-0.17-0.42l0,0v0L101.49,5.07l0,0c-0.11-0.11-0.26-0.17-0.42-0.17S100.76,4.96,100.65,5.07zM91.81,6.98l5.38-5.38l0,0c1.07-1.07,2.48-1.6,3.88-1.6s2.81,0.53,3.88,1.6l0,0l16.32,16.32h0l0,0l0,0c1.06,1.06,1.6,2.47,1.59,3.87c0,1.41-0.53,2.82-1.59,3.88h0l-5.38,5.38c-0.14,0.14-0.29,0.27-0.44,0.4l4.46,4.46c1.07,1.07,1.6,2.48,1.6,3.88c0,1.41-0.54,2.81-1.6,3.88l-5.38,5.38l0,0l0,0l0,0c-0.14,0.14-0.29,0.27-0.44,0.39l3.27,3.27l0,0l0,0c1.07,1.07,1.6,2.47,1.6,3.87c0,1.33-0.48,2.66-1.44,3.7c-0.05,0.06-0.1,0.12-0.16,0.18l0,0l-5.38,5.38c-1.07,1.07-2.48,1.6-3.88,1.6c-1.41,0-2.81-0.54-3.88-1.6L57.01,18.66v0c-1.07-1.07-1.61-2.48-1.61-3.88c0-1.33,0.48-2.66,1.44-3.7c0.05-0.06,0.1-0.12,0.16-0.18l0,0l5.38-5.38l0,0l0,0c1.07-1.07,2.47-1.6,3.87-1.6c1.41,0,2.81,0.54,3.88,1.6l0,0l3.86,3.86c0.12-0.15,0.25-0.3,0.4-0.44l5.38-5.38c1.07-1.07,2.48-1.61,3.88-1.61c1.41,0,2.81,0.54,3.88,1.61l3.86,3.86C91.54,7.27,91.67,7.12,91.81,6.98zM83.25,7.03l-5.38,5.38c-0.11,0.11-0.17,0.26-0.17,0.42c0,0.15,0.05,0.3,0.16,0.41l0.01,0.01l32.36,32.36h0c0.11,0.11,0.26,0.17,0.42,0.17c0.16,0,0.31-0.05,0.42-0.16l0,0h0l5.38-5.38c0.11-0.11,0.17-0.26,0.17-0.42c0-0.15-0.06-0.31-0.17-0.42l-8.31-8.31l0,0l0,0l0,0l0,0L84.09,7.03c-0.11-0.11-0.27-0.17-0.42-0.17C83.51,6.86,83.36,6.91,83.25,7.03zM16.71,74.41l0,0l32.36,32.36l0,0l0,0l0,0l0,0l0,0l0,0l0,0l7.11,7.11l0,0l0,0c0.11,0.11,0.27,0.16,0.42,0.16c0.13,0,0.26-0.04,0.37-0.12l0.05-0.05v0l5.38-5.38c0.11-0.11,0.17-0.26,0.17-0.42c0-0.15-0.06-0.31-0.17-0.42L15.2,60.47c-0.11-0.11-0.26-0.17-0.42-0.17c-0.15,0-0.31,0.06-0.42,0.17l-5.38,5.38v0l0,0c-0.11,0.11-0.16,0.27-0.16,0.42c0,0.15,0.06,0.31,0.17,0.42v0zM45.66,110.29l-0.05-0.05L13.24,77.87l0,0l-0.06-0.06c-0.11-0.08-0.23-0.12-0.36-0.12c-0.15,0-0.3,0.06-0.42,0.18l-5.38,5.38v0l0,0c-0.11,0.11-0.16,0.27-0.16,0.42c0,0.13,0.04,0.26,0.12,0.37l0.05,0.05v0l7.72,7.72l16.32,16.32l8.32,8.32l0,0l0,0c0.12,0.12,0.27,0.17,0.42,0.17c0.13,0,0.26-0.04,0.37-0.12l0.05-0.05h0l5.38-5.38l0,0c0.11-0.11,0.16-0.27,0.16-0.42C45.77,110.52,45.73,110.39,45.66,110.29zM10.45,95.27l-5.38,5.38c-0.11,0.11-0.17,0.26-0.17,0.42s0.06,0.31,0.17,0.42l16.32,16.32c0.11,0.11,0.26,0.17,0.42,0.17c0.15,0,0.31-0.06,0.42-0.17l5.38-5.38c0.11-0.11,0.17-0.26,0.17-0.42c0-0.16-0.06-0.31-0.17-0.42L11.28,95.27l-0.01-0.01c-0.11-0.11-0.26-0.16-0.41-0.16C10.71,95.1,10.56,95.16,10.45,95.27z"/>
      </svg>
    ), page: 'weights' },
    { label: 'Cardio', icon: <RunningManIcon size={24} color="#1a1a1a" />, page: 'cardio' },
    { label: 'Calories', icon: <CaloriesIcon size={20} color="#1a1a1a" />, page: 'calories' },
    { label: 'Data+', icon: <BarChart3 size={20} color="#1a1a1a" />, page: 'analytics' },
  ];

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: '#f2f2f2',
        color: '#1a1a1a',
        fontFamily: "'JetBrains Mono', monospace",
        paddingTop: 'env(safe-area-inset-top)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '20px', paddingRight: '20px', paddingBottom: '16px', paddingTop: '16px', position: 'relative' }}>
        {/* Left: hamburger */}
        <div style={{ width: 48, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 10 }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1a1a1a' }}
          >
            <Menu size={22} />
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <>
              {/* Backdrop overlay */}
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99,
                }}
                onClick={() => setMenuOpen(false)}
              />
              {/* Dropdown */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 'calc(100% + 4px)',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '24px',
                  padding: '10px 16px',
                  backgroundColor: '#f2f2f2',
                  borderRadius: '999px',
                  animation: 'fadeIn 0.15s ease-out',
                  zIndex: 100,
                  alignItems: 'center',
                }}
              >
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      onNavigate(item.page);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.15s',
                      borderRadius: '50%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Center: PROFILE */}
        <div style={{ flex: 1, textAlign: 'center', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.15s', pointerEvents: menuOpen ? 'none' : 'auto' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em', color: '#1a1a1a', textTransform: 'uppercase' }}>
            Profile
          </span>
        </div>

        {/* Right: KINÉ */}
        <div style={{ width: 48, textAlign: 'right', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.15s', pointerEvents: menuOpen ? 'none' : 'auto' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 530,
            fontFamily: "'Archivo', sans-serif",
            fontStretch: '200%',
            letterSpacing: '0.8em',
            lineHeight: '1',
            color: '#1a1a1a',
            textTransform: 'uppercase',
          }}>
            KINÉ
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px', overflowY: 'auto' }}>
        {/* Name section */}
        <div style={{ paddingTop: '12px', paddingBottom: '8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flexShrink: 0, paddingTop: '4px' }}>
              <ProfileUserIcon size={32} />
            </div>
            <div>
              <h2 style={{
                fontFamily: "'Inconsolata', monospace",
                fontSize: '24px',
                fontWeight: 400,
                fontStretch: '175%',
                letterSpacing: '0.05em',
                color: '#1a1a1a',
                textTransform: 'uppercase',
                lineHeight: 1.1,
              }}>
                HAMZA
              </h2>
              <p style={{ fontFamily: "'Inconsolata', monospace", color: '#999', fontSize: '14px', marginTop: '0px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member since 2026</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'transform 0.15s',
              marginTop: '4px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Waveform Timeline: pending-export range, or full log span after everything is Exported */}
        {showWaveTimeline && (
          <WaveTimeline firstDate={chartFirstDate} lastDate={chartLastDate} />
        )}

        {/* Export Data section - in box */}
        <div style={{
          marginBottom: '8px',
          marginTop: '20px',
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: '12px',
          padding: '14px 16px',
        }}>
          {/* Row 1: EXPORT DATA (left) + Date stack (right) */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            marginBottom: '0px',
          }}>
            <span style={{
              fontFamily: "'Inconsolata', monospace",
              fontSize: '24px',
              fontWeight: 500,
              fontStretch: '175%',
              letterSpacing: '0.01em',
              color: '#1a1a1a',
              textTransform: 'uppercase',
              lineHeight: 1.1,
              paddingTop: '4px',
            }}>
              EXPORT DATA
            </span>
            <div style={{ textAlign: 'right', marginTop: '3.1px' }}>
              <span style={{
                fontSize: '0.95rem', fontWeight: 700,
                color: '#1a1a1a', letterSpacing: '0.1em',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}>
                {lastExportDisplay}
              </span>
              <span style={{
                display: 'block',
                fontSize: '0.65rem', fontWeight: 700,
                color: '#999', letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginTop: '2px',
              }}>
                LAST EXPORT
              </span>
            </div>
          </div>

          {/* Row 2: LAST EXPORT label removed - now part of date stack above */}

          {/* Row 3: NEW ROWS count */}
          <div style={{ marginTop: '4px' }}>
            <div className="flex items-baseline gap-1.5">
              <span style={{
                fontSize: '3rem', fontWeight: 900, lineHeight: 1,
                letterSpacing: '-0.04em',
                color: hasRows ? '#1a1a1a' : 'rgba(0,0,0,0.15)',
              }}>
                {newCount ?? '—'}
              </span>
              <span style={{
                fontSize: '0.55rem', fontWeight: 700,
                color: '#1a1a1a',
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                new rows
              </span>
              {(editCount ?? 0) > 0 && (
                <>
                  <span style={{
                    fontSize: '0.5rem', fontWeight: 600,
                    color: '#888',
                    marginLeft: '0.25rem',
                  }}>
                    /
                  </span>
                  <span style={{
                    fontSize: '2rem', fontWeight: 700, lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: '#1a1a1a',
                    marginLeft: '0.125rem',
                  }}>
                    {editCount}
                  </span>
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 600,
                    color: '#1a1a1a',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    marginLeft: '0.125rem',
                  }}>
                    edited rows
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Row 4: START / END labels (MAX/AVG style from Analytics) */}
          {exportDates.length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: '4px', marginBottom: '2px',
            }}>
              <div style={{
                fontFamily: "'Inconsolata', monospace",
                fontSize: '16px',
                fontWeight: 400,
                letterSpacing: '0.06em',
                color: 'rgba(0,0,0,0.35)',
                textTransform: 'uppercase',
              }}>
                START
              </div>
              <div style={{
                fontFamily: "'Inconsolata', monospace",
                fontSize: '16px',
                fontWeight: 400,
                letterSpacing: '0.06em',
                color: 'rgba(0,0,0,0.35)',
                textAlign: 'right',
                textTransform: 'uppercase',
              }}>
                END
              </div>
            </div>
          )}

          {/* Row 5: Start date / End date in black */}
          {exportDates.length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 450,
                color: '#1a1a1a',
                letterSpacing: '0.01em',
              }}>
                {formatDate(exportDates[0])}
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 450,
                color: '#1a1a1a',
                letterSpacing: '0.01em',
              }}>
                {formatDate(exportDates[exportDates.length - 1])}
              </span>
            </div>
          )}

          {/* Export button - full width below dates */}
          <button
            onClick={handleExport}
            disabled={exporting || !hasRows}
            className="w-full flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs active:scale-95 duration-150"
            style={{
              padding: '14px 20px',
              borderRadius: '999px',
              backgroundColor: exportDone ? '#22c55e' : (hasRows ? '#1a1a1a' : 'rgba(0,0,0,0.08)'),
              color: exportDone ? '#fff' : (hasRows ? '#f2f2f2' : '#999'),
              cursor: hasRows ? 'pointer' : 'default',
              transition: 'all 0.2s',
              boxShadow: hasRows ? '0 8px 24px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            {exporting
              ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : exportDone
                ? <span>✓ Done</span>
                : <><Download size={13} /><span>Export</span></>
            }
          </button>

          {exportError && (
            <p className="mt-3" style={{ color: '#ef4444', fontSize: '0.75rem' }}>{exportError}</p>
          )}
        </div>

        {/* Spacer - pushes bottom items to bottom */}
        <div style={{ flex: 1 }} />

        {/* Exercises+ */}
        <button
          onClick={() => setShowExercises(true)}
          className="w-full rounded-xl p-4 mb-3 flex items-center justify-between active:scale-[0.98] transition-all"
          style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center gap-4">
            <DumbbellIcon size={22} color="#1a1a1a" />
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              color: '#1a1a1a',
              textTransform: 'uppercase',
            }}>
              Exercises+
            </span>
          </div>
          <div style={{ color: '#999' }}>›</div>
        </button>

        {/* Data+ Analytics */}
        <button
          onClick={() => onNavigate('analytics')}
          className="w-full rounded-xl p-4 mb-3 flex items-center justify-between active:scale-[0.98] transition-all"
          style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center gap-4">
            <BarChart3 size={22} color="#1a1a1a" />
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              color: '#1a1a1a',
              textTransform: 'uppercase',
            }}>
              ANALYTICS
            </span>
          </div>
          <div style={{ color: '#999' }}>›</div>
        </button>

        {/* Workouts Data */}
        <button
          onClick={() => setShowWorkoutsData(true)}
          className="w-full rounded-xl p-4 mb-3 flex items-center justify-between active:scale-[0.98] transition-all"
          style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center gap-4">
            <Database size={20} color="#1a1a1a" />
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              color: '#1a1a1a',
              textTransform: 'uppercase',
            }}>
              Workouts Data
            </span>
          </div>
          <div style={{ color: '#1a1a1a' }}>›</div>
        </button>

        {/* Strava Connect & Sync */}
        <Strava />
      </div>

      {/* Exercises+ Sheet */}
      {showExercises && (
        <ExercisesPlus onClose={() => setShowExercises(false)} onSaved={() => setShowExercises(false)} />
      )}

      {showWorkoutsData && (
        <WorkoutsData onClose={() => setShowWorkoutsData(false)} />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;900&family=Inconsolata:wght@200..900&display=swap');
      `}</style>
    </div>
  );
};
