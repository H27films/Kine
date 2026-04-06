import React from 'react';
import { User, Flame } from 'lucide-react';
import { Page, NavigationProps } from '../../types';

interface NavItem {
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  page: Page;
}

const RunnerIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>
  </svg>
);

export const BottomNav: React.FC<NavigationProps> = ({ currentPage, onNavigate }) => {
  const items: NavItem[] = [
    {
      icon: <img src="/icons/home-icon.svg" style={{ width: 22, height: 22, filter: 'brightness(0) invert(1)' }} alt="home" />,
      activeIcon: <img src="/icons/home-icon.svg" style={{ width: 22, height: 22, filter: 'brightness(0)' }} alt="home" />,
      page: 'dashboard',
    },
    {
      icon: <img src="/icons/dumbbell.svg" style={{ width: 22, height: 22, filter: 'brightness(0) invert(1)' }} alt="weights" />,
      activeIcon: <img src="/icons/dumbbell.svg" style={{ width: 22, height: 22, filter: 'brightness(0)' }} alt="weights" />,
      page: 'weights',
    },
    {
      icon: <RunnerIcon size={22} />,
      activeIcon: <RunnerIcon size={22} />,
      page: 'cardio',
    },
    {
      icon: <Flame size={22} />,
      activeIcon: <Flame size={22} />,
      page: 'calories',
    },
    {
      icon: <User size={22} />,
      activeIcon: <User size={22} strokeWidth={2.5} />,
      page: 'profile',
    },
  ];

  const isActive = (itemPage: Page): boolean => {
    if (itemPage === 'weights' && (currentPage === 'weights' || currentPage === 'calories')) return true;
    return currentPage === itemPage;
  };

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[88%] max-w-sm rounded-full z-50 flex justify-around items-center px-4 py-2"
      style={{
        backgroundColor: 'rgba(26,26,26,0.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: 'none',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.3)',
      }}
    >
      {items.map((item) => {
        const active = isActive(item.page);
        return (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className="p-3 transition-all duration-150 active:scale-90"
            style={
              active
                ? { backgroundColor: '#ffffff', color: '#000000', borderRadius: '9999px', transform: 'scale(1.1)' }
                : { color: 'rgba(226,226,226,0.7)' }
            }
          >
            {active ? item.activeIcon : item.icon}
          </button>
        );
      })}
    </nav>
  );
};
