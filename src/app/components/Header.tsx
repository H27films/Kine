import React, { useState, useRef, useEffect } from 'react';
import { Menu, ArrowLeft, BarChart3 } from 'lucide-react';
import { Page } from '../../types';
import { RunningManIcon as NewRunningManIcon, CaloriesIcon as NewCaloriesIcon } from './NavIcons';

interface HeaderProps {
  title: string;
  currentPage?: Page;
  onBack?: () => void;
  onNavigate?: (page: Page) => void;
  onToggleWeeklySummary?: () => void;
  showWeeklySummary?: boolean;
}

const headerTextStyle: React.CSSProperties = {
  fontFamily: "'Archivo', sans-serif",
  fontSize: '22px',
  fontWeight: 530,
  fontStretch: '200%',
  letterSpacing: '0.12em',
  color: '#ffffff',
  textTransform: 'uppercase',
};

const secondaryHeaderTextStyle: React.CSSProperties = {
  ...headerTextStyle,
  fontSize: '18px',
};

const DumbbellIcon = ({ size = 16 }: { size?: number }) => (
  <img src="/icons/dumbbell.svg" style={{ width: size, height: size, filter: 'brightness(0) invert(1)' }} alt="weights" />
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

export const Header: React.FC<HeaderProps> = ({ title, currentPage, onBack, onNavigate, onToggleWeeklySummary }) => {
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

  const menuItems: { label: string; icon: IconComponent; page: Page }[] = [
    { label: 'Weights',  icon: DumbbellIcon,                                                    page: 'weights'   },
    { label: 'Cardio',   icon: ({ size }: { size?: number }) => <NewRunningManIcon size={size} />, page: 'cardio'    },
    { label: 'Calories', icon: ({ size }: { size?: number }) => <NewCaloriesIcon size={size} />,  page: 'calories'  },
    { label: 'Data+',    icon: BarChart3,                                                       page: 'analytics' },
  ];

  const isDashboard = !title;

  const getLogIcon = () => {
    if (currentPage === 'weights') return <img src="/icons/dumbbell.svg" style={{ width: 20, height: 20, filter: 'brightness(0) invert(1)' }} alt="weights" />;
    if (currentPage === 'cardio') return <NewRunningManIcon size={24} color="#ffffff" />;
    if (currentPage === 'calories') return <NewCaloriesIcon size={25} color="#ffffff" />;
    return null;
  };

  const isLogPage = currentPage === 'weights' || currentPage === 'cardio' || currentPage === 'calories';
  const logIcon = getLogIcon();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex justify-between items-end px-5"
      style={{
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        paddingTop: 'env(safe-area-inset-top)',
        height: 'calc(4rem + env(safe-area-inset-top))',
        paddingBottom: '0',
      }}
    >
      <div className="relative flex items-center w-12 pb-3" ref={menuRef}>
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
                <span style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                  <item.icon size={16} />
                </span>
                <span className="text-sm font-semibold text-white tracking-wide">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isDashboard ? (
        <button
          onClick={onToggleWeeklySummary}
          className="absolute left-1/2 -translate-x-1/2 bottom-3"
          style={{ background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          <span style={headerTextStyle}>
            KINÉ
          </span>
        </button>
      ) : (
        <>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-3">
            {isLogPage && logIcon ? (
              logIcon
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">{title}</span>
            )}
          </div>
          <div className="flex items-center justify-end w-12 pb-3">
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
  );
};
