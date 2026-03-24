import React from 'react';
import { Menu, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onBack }) => {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-5 h-16"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
    >
      <div className="flex items-center w-12">
        {onBack ? (
          <button onClick={onBack} className="hover:opacity-80 transition-opacity">
            <ArrowLeft size={22} color="white" />
          </button>
        ) : (
          <button className="hover:opacity-80 transition-opacity">
            <Menu size={22} color="white" />
          </button>
        )}
      </div>
      {title && (
        <div className="absolute left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
          {title}
        </div>
      )}
      <div className="flex items-center justify-end w-12">
        <span className="text-xl font-black tracking-tighter text-white uppercase">Kiné</span>
      </div>
    </header>
  );
};
