import React from 'react';
import { Page, NavigationProps } from '../../types';
import { HomeIcon, CaloriesIcon, ProfileIcon, RunningManIcon } from './NavIcons';

interface NavItem {
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  page: Page;
}

export const BottomNav: React.FC<NavigationProps> = ({ currentPage, onNavigate }) => {
  const items: NavItem[] = [
    {
      icon: <HomeIcon size={22} color="rgba(26,26,26,0.75)" />,
      activeIcon: <HomeIcon size={22} color="#ffffff" />,
      page: 'dashboard',
    },
    {
      icon: <img src="/icons/dumbbell.svg" style={{ width: 21, height: 21, opacity: 0.75, filter: 'brightness(0)' }} alt="weights" />,
      activeIcon: <img src="/icons/dumbbell.svg" style={{ width: 21, height: 21, filter: 'brightness(0) invert(1)' }} alt="weights" />,
      page: 'weights',
    },
    {
      icon: <RunningManIcon size={26} color="rgba(26,26,26,0.75)" />,
      activeIcon: <RunningManIcon size={26} color="#ffffff" />,
      page: 'cardio',
    },
    {
      icon: <CaloriesIcon size={22} color="rgba(26,26,26,0.75)" />,
      activeIcon: <CaloriesIcon size={22} color="#ffffff" />,
      page: 'calories',
    },
    {
      icon: <ProfileIcon size={22} color="rgba(26,26,26,0.75)" />,
      activeIcon: <ProfileIcon size={22} color="#ffffff" />,
      page: 'profile',
    },
  ];

  const isActive = (itemPage: Page): boolean => {
    return currentPage === itemPage;
  };

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[88%] max-w-sm rounded-full z-50 flex justify-around items-center px-4 py-2"
      style={{
        backgroundColor: 'rgba(242,242,242,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}
    >
      {items.map((item) => {
        const active = isActive(item.page);
        return (
          <button
            key={item.page}
            data-page={item.page}
            onClick={() => onNavigate(item.page)}
            className="p-3 transition-all duration-150 active:scale-90"
            style={
              active
                ? { backgroundColor: '#1a1a1a', color: '#ffffff', borderRadius: '9999px', transform: 'scale(1.1)' }
                : { color: 'rgba(26,26,26,0.75)' }
            }
          >
            {active ? item.activeIcon : item.icon}
          </button>
        );
      })}
    </nav>
  );
};