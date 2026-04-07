import React, { useState, lazy, Suspense } from 'react';
import { Page } from '../types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { WeeklySummaryBar } from './components/WeeklySummaryBar';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const LogWeights = lazy(() => import('./pages/LogWeights').then(m => ({ default: m.LogWeights })));
const LogCardio = lazy(() => import('./pages/LogCardio').then(m => ({ default: m.LogCardio })));
const LogCalories = lazy(() => import('./pages/LogCalories').then(m => ({ default: m.LogCalories })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Summary = lazy(() => import('./pages/Summary').then(m => ({ default: m.Summary })));

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);

  // Reset summary whenever user navigates to a different page
  React.useEffect(() => {
    setShowWeeklySummary(false);
  }, [currentPage]);

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
        return <LogWeights onNavigate={setCurrentPage} showWeeklySummary={showWeeklySummary} />;
      case 'cardio':
        return <LogCardio onNavigate={setCurrentPage} showWeeklySummary={showWeeklySummary} />;
      case 'calories':
        return <LogCalories onNavigate={setCurrentPage} showWeeklySummary={showWeeklySummary} />;
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
        {showWeeklySummary && currentPage !== 'dashboard' && (
          <div style={{ marginBottom: 20 }}>
            <WeeklySummaryBar />
          </div>
        )}
        <Suspense fallback={<></>}>
          {renderPage()}
        </Suspense>
      </main>
      <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
};

export default App;
