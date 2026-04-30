import React, { useState, lazy, Suspense } from 'react';
import { Page } from '../types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { WeeklySummaryBar } from './components/WeeklySummaryBar';
import SplashScreen from './components/SplashScreen';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const LogWeights = lazy(() => import('./pages/LogWeights').then(m => ({ default: m.LogWeights })));
const LogCardio = lazy(() => import('./pages/LogCardio').then(m => ({ default: m.LogCardio })));
const LogCalories = lazy(() => import('./pages/LogCalories').then(m => ({ default: m.LogCalories })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const WeightsPlus = lazy(() => import('./pages/WeightsPlus').then(m => ({ default: m.WeightsPlus })));
const RunningPlus = lazy(() => import('./pages/RunningPlus').then(m => ({ default: m.RunningPlus })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<{page: Page, data?: any}>({page: 'dashboard'});
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const onNavigate = (page: Page, data?: any) => setCurrentPage({page, data});

  // Reset summary whenever user navigates to a different page
  React.useEffect(() => {
    setShowWeeklySummary(false);
  }, [currentPage.page]);

  // Scroll to top when navigating to dashboard
  React.useEffect(() => {
    if (currentPage.page === 'dashboard') {
      window.scrollTo(0, 0);
    }
  }, [currentPage.page]);

  const getHeaderTitle = (): string => {
    switch (currentPage.page) {
      case 'dashboard': return '';
      case 'weights':
      case 'cardio':
      case 'calories':
        return 'Log';
      case 'analytics': return 'Data+';
      case 'weights-plus': return 'Weights+';
      case 'running-plus': return 'Running+';
      case 'profile': return 'Profile';
    }
  };

  const renderPage = () => {
    switch (currentPage.page) {
      case 'dashboard':
        return <Dashboard showWeeklySummary={showWeeklySummary} onNavigate={onNavigate} />;
      case 'weights':
        return <LogWeights onNavigate={onNavigate} showWeeklySummary={showWeeklySummary} />;
      case 'cardio':
        return <LogCardio onNavigate={onNavigate} showWeeklySummary={showWeeklySummary} initialSelectedActivity={currentPage.data?.selectedActivity} />;
      case 'calories':
        return <LogCalories onNavigate={onNavigate} showWeeklySummary={showWeeklySummary} />;
      case 'analytics':
        return <Analytics onNavigate={onNavigate} />;
      case 'weights-plus':
        return <WeightsPlus onNavigate={onNavigate} />;
      case 'running-plus':
        return <RunningPlus onNavigate={onNavigate} />;
      case 'profile':
        return <Profile onNavigate={onNavigate} />;
    }
  };

  const showBackButton = false;
  const hideChrome = currentPage.page === 'analytics' || currentPage.page === 'profile' || currentPage.page === 'weights-plus' || currentPage.page === 'running-plus';

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <div className="min-h-screen" style={{ backgroundColor: '#000000', color: '#e2e2e2', fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif", opacity: showSplash ? 0 : 1, transition: 'opacity 0.4s ease' }}>
      {hideChrome ? (
        <Suspense fallback={<></>}>
          {renderPage()}
        </Suspense>
      ) : (
        <>
      <Header
        title={getHeaderTitle()}
        currentPage={currentPage.page}
        onBack={showBackButton ? () => onNavigate('dashboard') : undefined}
        onNavigate={onNavigate}
        onToggleWeeklySummary={() => setShowWeeklySummary(v => !v)}
        showWeeklySummary={showWeeklySummary}
      />
      <main
        className="pb-32 px-4 max-w-lg mx-auto"
        style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top))' }}
      >
        {showWeeklySummary && currentPage.page !== 'dashboard' && (
          <div style={{ marginBottom: 20 }}>
            <WeeklySummaryBar />
          </div>
        )}
        <Suspense fallback={<></>}>
          {renderPage()}
        </Suspense>
      </main>
      <BottomNav currentPage={currentPage.page} onNavigate={onNavigate} />
    </>
    )}
    </div>
    </>
  );
};

export default App;
