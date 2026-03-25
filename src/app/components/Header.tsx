import React, { useState, useRef, useEffect } from 'react';
import { Menu, ArrowLeft, Dumbbell, BarChart3, FileText } from 'lucide-react';
import { Page } from '../../types';

interface HeaderProps {
  title: string;
  currentPage?: Page;
  onBack?: () => void;
  onNavigate?: (page: Page) => void;
}

const logTabs: { label: string; short: string; page: Page }[] = [
  { label: 'WEIGHTS', short: 'Weights', page: 'weights' },
  { label: 'CARDIO',  short: 'Cardio',  page: 'cardio'  },
  { label: 'CAL',     short: 'Cal',     page: 'calories' },
];

export const Header: React.FC<HeaderProps> = ({ title, currentPage, onBack, onNavigate }) => {
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
    { label: 'Log',     icon: Dumbbell,  page: 'weights'   as Page },
    { label: 'Summary', icon: FileText,  page: 'summary'   as Page },
    { label: 'Data+',   icon: BarChart3, page: 'analytics' as Page },
  ];

  const isDashboard = !title && currentPage === 'dashboard';
  const isLogPage = currentPage === 'weights' || currentPage === 'cardio' || currentPage === 'calories';

  // Build the 3-tab array: active tab always in the middle slot
  const activeTab = logTabs.find(t => t.page === currentPage);
  const inactiveTabs = logTabs.filter(t => t.page !== currentPage);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-5 h-16"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
    >
      {/* Left — menu or back */}
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

        {/* Dropdown Menu */}
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

      {/* Center */}
      {isDashboard ? (
        <span className="absolute left-1/2 -translate-x-1/2 text-xl font-black tracking-tighter text-white uppercase">Kiné</span>
      ) : isLogPage && activeTab ? (
        /* Log page: 3-tab header row */
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-5">
          {/* Left inactive tab */}
          <button
            onClick={() => onNavigate?.(inactiveTabs[0].page)}
            style={{
              fontSize: '0.6rem',
              fontWeight: 400,
              color: 'rgba(226,226,226,0.6)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              filter: 'blur(0.4px)',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0,
            }}
          >
            {inactiveTabs[0].short}
          </button>

          {/* Active tab — center, large */}
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {activeTab.label}
          </span>

          {/* Right inactive tab */}
          <button
            onClick={() => onNavigate?.(inactiveTabs[1].page)}
            style={{
              fontSize: '0.6rem',
              fontWeight: 400,
              color: 'rgba(226,226,226,0.6)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              filter: 'blur(0.4px)',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0,
            }}
          >
            {inactiveTabs[1].short}
          </button>
        </div>
      ) : (
        <>
          <div className="absolute left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
            {title}
          </div>
          <div className="flex items-center justify-end w-12">
            <span className="text-xl font-black tracking-tighter text-white uppercase">Kiné</span>
          </div>
        </>
      )}
    </header>
  );
};
