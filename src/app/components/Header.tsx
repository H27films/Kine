import React, { useState, useRef, useEffect } from 'react';
import { Menu, ArrowLeft, BarChart3 } from 'lucide-react';
import { Page } from '../../types';
import { RunningManIcon as NewRunningManIcon, CaloriesIcon as NewCaloriesIcon, ProfileIcon as NewProfileIcon } from './NavIcons';
import { supabase } from '../../lib/supabase';
import { QuickLogVoice } from './QuickLogVoice';

interface HeaderProps {
  title: string;
  currentPage?: Page;
  onBack?: () => void;
  onNavigate?: (page: Page) => void;
  onToggleWeeklySummary?: () => void;
  showWeeklySummary?: boolean;
  onToggleQuickLog?: () => void;
  showQuickLog?: boolean;
  showQuickLogVoice?: boolean;
  trackerMultiplier?: number;
  onToggleQuickLogVoice?: () => void;
}

const headerTextStyle: React.CSSProperties = {
  fontFamily: "'Archivo', sans-serif",
  fontSize: '20px',
  fontWeight: 530,
  fontStretch: '200%',
  letterSpacing: '0.8em',
  lineHeight: '1',
  color: '#1a1a1a',
  textTransform: 'uppercase',
};

const secondaryHeaderTextStyle: React.CSSProperties = {
  ...headerTextStyle,
  fontSize: '12px',
};

const DumbbellIcon = ({ size = 16 }: { size?: number }) => (
  <img src="/icons/dumbbell.svg" style={{ width: size, height: size }} alt="weights" />
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

export const Header: React.FC<HeaderProps> = ({ title, currentPage, onBack, onNavigate, onToggleWeeklySummary, onToggleQuickLog, showQuickLog, showQuickLogVoice, trackerMultiplier, onToggleQuickLogVoice }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [score, setScore] = useState<number>(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDashboard = !title;

  // Fetch today's score on dashboard page
  useEffect(() => {
    if (!isDashboard) return;
    const load = async () => {
      const today = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        timeZone: 'Asia/Kuala_Lumpur',
      }).format(new Date());
      const { data } = await supabase
        .from('workouts')
        .select('total_score')
        .eq('date', today)
        .not('total_score', 'is', null)
        .limit(1);
      setScore(data && data.length > 0 ? Number(data[0].total_score) : 0);
    };
    load();
  }, [isDashboard]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const menuItems: { label: string; icon: IconComponent; page: Page }[] = [
    { label: 'Weights',  icon: DumbbellIcon,                                                                   page: 'weights'      },
    { label: 'Cardio',   icon: ({ size }: { size?: number }) => <NewRunningManIcon size={size} color="#1a1a1a" />, page: 'cardio'    },
    { label: 'Calories', icon: ({ size }: { size?: number }) => <NewCaloriesIcon size={size} color="#1a1a1a" />,  page: 'calories'  },
    { label: 'Analytics+',    icon: ({ size }: { size?: number }) => <BarChart3 size={size} color="#1a1a1a" />,        page: 'analytics' },
    { label: 'Weights+', icon: DumbbellIcon,                                                                   page: 'weights-plus' },
    { label: 'Run+',     icon: ({ size }: { size?: number }) => <NewRunningManIcon size={size} color="#1a1a1a" />, page: 'running-plus' },
  ];

  const getLogIcon = () => {
    if (currentPage === 'weights') return <img src="/icons/dumbbell.svg" style={{ width: 20, height: 20 }} alt="weights" />;
    if (currentPage === 'cardio') return <NewRunningManIcon size={24} color="#1a1a1a" />;
    if (currentPage === 'calories') return <NewCaloriesIcon size={25} color="#1a1a1a" />;
    if (currentPage === 'profile') return <NewProfileIcon size={22} color="#1a1a1a" />;
    return null;
  };

  const isLogPage = currentPage === 'weights' || currentPage === 'cardio' || currentPage === 'calories' || currentPage === 'profile';
  const logIcon = getLogIcon();

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-5"
        style={{
          backgroundColor: 'rgba(242,242,242,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          paddingTop: 'env(safe-area-inset-top)',
          height: 'calc(4rem + env(safe-area-inset-top))',
          paddingBottom: '0',
          boxShadow: '0 1px 1px rgba(0,0,0,0.01)',
          borderBottom: '1px solid rgba(0,0,0,0.01)',
        }}
      >
        <div className="relative flex items-center w-12" ref={menuRef}>
          {onBack ? (
            <button onClick={onBack} className="hover:opacity-80 transition-opacity">
              <ArrowLeft size={22} color="#1a1a1a" />
            </button>
          ) : (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="hover:opacity-80 transition-opacity"
            >
              <Menu size={18} color="#1a1a1a" />
            </button>
          )}

          {menuOpen && (
            <div
              className="absolute top-12 left-0 w-48 rounded-xl overflow-hidden shadow-2xl"
              style={{
                backgroundColor: '#f2f2f2',
                border: '1px solid rgba(0,0,0,0.08)',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              <button
                onClick={() => {
                  onToggleQuickLogVoice?.();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors"
                style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
              >
                <span style={{ color: 'rgba(26,26,26,0.45)', display: 'flex', alignItems: 'center' }}>
                  <img src="/icons/quicklog.svg" style={{ width: 16, height: 16, opacity: 1 }} alt="voice" />
                </span>
                <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                  {showQuickLogVoice ? 'Voice ✓' : 'Voice'}
                </span>
              </button>
              {menuItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onNavigate?.(item.page);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors"
                  style={{
                    borderBottom: index < menuItems.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <span style={{ color: 'rgba(26,26,26,0.45)', display: 'flex', alignItems: 'center' }}>
                    <item.icon size={16} />
                  </span>
                  <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {isDashboard ? (
          <>
            <div className="flex items-center justify-center flex-1">
              <button
                onClick={onToggleWeeklySummary}
                style={{ background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
              >
                <span style={headerTextStyle}>
                  KINÉ
                </span>
              </button>
            </div>
            <div className="flex items-center justify-end" style={{ width: 48 }}>
              <button
                onClick={onToggleQuickLog}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, WebkitTapHighlightColor: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#f2f2f2', lineHeight: 1, fontFamily: "'Archivo', sans-serif" }}>
                    {score > 0 ? score : '-'}
                  </span>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center flex-1">
              {isLogPage && logIcon ? (
                logIcon
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#1a1a1a' }}>{title}</span>
              )}
            </div>
            <div className="flex items-center justify-end w-12">
              <button
                onClick={onToggleWeeklySummary}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, WebkitTapHighlightColor: 'transparent' }}
              >
                <span style={secondaryHeaderTextStyle}>
                  KINÉ
                </span>
              </button>
            </div>
          </>
        )}
      </header>
      {showQuickLogVoice && trackerMultiplier && (
        <QuickLogVoice
          multiplier={trackerMultiplier}
          onClose={() => onToggleQuickLogVoice?.()}
          onSuccess={() => { onToggleQuickLogVoice?.(); }}
        />
      )}
    </>
  );
};