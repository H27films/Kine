import React, { useState, useRef, useEffect } from 'react';
import { Menu, ArrowLeft, Dumbbell, BarChart3, FileText, Flame } from 'lucide-react';
import { Page } from '../../types';

interface HeaderProps {
  title: string;
  currentPage?: Page;
  onBack?: () => void;
  onNavigate?: (page: Page) => void;
  onToggleWeeklySummary?: () => void;
  showWeeklySummary?: boolean;
}

const RunningManIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ title, currentPage, onBack, onNavigate, onToggleWeeklySummary, showWeeklySummary }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const menuItems = [
    { label: 'Log', icon: Dumbbell, page: 'weights' as Page },
    { label: 'Summary', icon: FileText, page: 'summary' as Page },
    { label: 'Data+', icon: BarChart3, page: 'analytics' as Page },
  ];

  const isDashboard = !title;

  const getLogIcon = () => {
    if (currentPage === 'weights') return <Dumbbell size={20} color="white" />;
    if (currentPage === 'cardio') return <RunningManIcon />;
    if (currentPage === 'calories') return <Flame size={20} color="white" />;
    return null;
  };

  const isLogPage = currentPage === 'weights' || currentPage === 'cardio' || currentPage === 'calories';
  const logIcon = getLogIcon();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-5 h-16"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
    >
      <div className="relative flex items-center w-12" ref={menuRef}>
        {onBack ? (
          <button onClick={onBack} className="hover:opacity-80 transition-opacity">
            <ArrowLeft size={22} color="white" />
          </button>
        ) : (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="hover:opacity-80 transition-opacity"
          >
            <Menu size={22} color="white" />
          </button>
        )}

        {menuOpen && (
          <div
            className="absolute top-12 left-0 w-48 rounded-xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                onClick={() => {
                  onNavigate?.(item.page);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors"
                style={{
                  borderBottom: index < menuItems.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                <item.icon size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                <span className="text-sm font-semibold text-white tracking-wide">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isDashboard ? (
        <button
          onClick={onToggleWeeklySummary}
          className="absolute left-1/2 -translate-x-1/2 hover:opacity-70 transition-opacity"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span
            className="text-xl font-black tracking-tighter text-white uppercase"
            style={{ opacity: showWeeklySummary ? 0.6 : 1 }}
          >
            Kiné
          </span>
        </button>
      ) : (
        <>
          <div className="absolute left-1/2 -translate-x-1/2">
            {isLogPage && logIcon ? (
              logIcon
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">{title}</span>
            )}
          </div>
          <div className="flex items-center justify-end w-12">
            <span className="text-xl font-black tracking-tighter text-white uppercase">Kiné</span>
          </div>
        </>
      )}
    </header>
  );
};
