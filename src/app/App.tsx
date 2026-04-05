import React, { useState } from 'react';
import { Page } from '../types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { LogWeights } from './pages/LogWeights';
import { LogCardio } from './pages/LogCardio';
import { LogCalories } from './pages/LogCalories';
import { Analytics } from './pages/Analytics';
import { Profile } from './pages/Profile';
import { Summary } from './pages/Summary';
import { WeeklySummaryBar } from './components/WeeklySummaryBar';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);

  const getHeaderTitle = (): string => {
    switch (currentPage) {
      case 'dashboard': return '';
      case 'weights':
      case 'cardio':
      case 'calories':
        return 'Log';
      case 'analytics': return 'Data+';
      case 'profile': return 'Profile';
      case 'summary': return 'Summary';
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard showWeeklySummary={showWeeklySummary} />;
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
      case 'summary':
        return <Summary />;
    }
  };

  const showBackButton = currentPage === 'profile' || currentPage === 'summary';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000', color: '#e2e2e2', fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif" }}>
      <Header
        title={getHeaderTitle()}
        currentPage={currentPage}
        onBack={showBackButton ? () => setCurrentPage('dashboard') : undefined}
        onNavigate={setCurrentPage}
        onToggleWeeklySummary={() => setShowWeeklySummary(v => !v)}
        showWeeklySummary={showWeeklySummary}
      />
      <main
        className="pb-32 px-4 max-w-lg mx-auto"
        style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top))' }}
      >
        {showWeeklySummary && currentPage !== 'dashboard' && <WeeklySummaryBar />}
        {renderPage()}
      </main>
      <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
};

export default App;
