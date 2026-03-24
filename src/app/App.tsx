import React, { useState } from 'react';
import { Page } from '../types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { LogWeights } from './components/LogWeights';
import { LogCardio } from './components/LogCardio';
import { LogCalories } from './components/LogCalories';
import { Analytics } from './components/Analytics';
import { Profile } from './components/Profile';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const getHeaderTitle = (): string => {
    switch (currentPage) {
      case 'dashboard': return '';
      case 'weights':
      case 'cardio':
      case 'calories':
        return 'Log';
      case 'analytics': return 'Data+';
      case 'profile': return 'Profile';
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'weights':
        return <LogWeights onNavigate={setCurrentPage} />;
      case 'cardio':
        return <LogCardio onNavigate={setCurrentPage} />;
      case 'calories':
        return <LogCalories onNavigate={setCurrentPage} />;
      case 'analytics':
        return <Analytics />;
      case 'profile':
        return <Profile onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000', color: '#e2e2e2', fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif" }}>
      <Header title={getHeaderTitle()} onBack={currentPage === 'profile' ? () => setCurrentPage('dashboard') : undefined} />
      <main className="pt-20 pb-32 px-4 max-w-lg mx-auto">
        {renderPage()}
      </main>
      <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
};

export default App;
