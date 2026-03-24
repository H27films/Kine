import React from 'react';
import { Home, Dumbbell, BarChart3, User } from 'lucide-react';
import { Page, NavigationProps } from '../../types';

interface NavItem {
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  page: Page;
}

export const BottomNav: React.FC<NavigationProps> = ({ currentPage, onNavigate }) => {
  const isLogPage = currentPage === 'weights' || currentPage === 'cardio' || currentPage === 'calories';

  const items: NavItem[] = [
    {
      icon: <Home size={22} />,
      activeIcon: <Home size={22} strokeWidth={2.5} />,
      page: 'dashboard',
    },
    {
      icon: <Dumbbell size={22} />,
      activeIcon: <Dumbbell size={22} strokeWidth={2.5} />,
      page: 'weights',
    },
    {
      icon: <BarChart3 size={22} />,
      activeIcon: <BarChart3 size={22} strokeWidth={2.5} />,
      page: 'analytics',
    },
    {
      icon: <User size={22} />,
      activeIcon: <User size={22} strokeWidth={2.5} />,
      page: 'profile',
    },
  ];

  const isActive = (itemPage: Page): boolean => {
    if (itemPage === 'weights' && isLogPage) return true;
    return currentPage === itemPage;
  };

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[88%] max-w-sm rounded-full z-50 flex justify-around items-center px-4 py-2"
      style={{
        backgroundColor: 'rgba(26,26,26,0.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
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
