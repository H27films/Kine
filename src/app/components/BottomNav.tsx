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
      icon: <HomeIcon size={22} color="rgba(226,226,226,0.7)" />,
      activeIcon: <HomeIcon size={22} color="#000000" />,
      page: 'dashboard',
    },
    {
      icon: <img src="/icons/dumbbell.svg" style={{ width: 21, height: 21, filter: 'brightness(0) invert(1)', opacity: 0.7 }} alt="weights" />,
      activeIcon: <img src="/icons/dumbbell.svg" style={{ width: 21, height: 21, filter: 'brightness(0)' }} alt="weights" />,
      page: 'weights',
    },
    {
      icon: <RunningManIcon size={26} color="rgba(226,226,226,0.7)" />,
      activeIcon: <RunningManIcon size={26} color="#000000" />,
      page: 'cardio',
    },
    {
      icon: <CaloriesIcon size={22} color="rgba(226,226,226,0.7)" />,
      activeIcon: <CaloriesIcon size={22} color="#000000" />,
      page: 'calories',
    },
    {
      icon: <ProfileIcon size={22} color="rgba(226,226,226,0.7)" />,
      activeIcon: <ProfileIcon size={22} color="#000000" />,
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
