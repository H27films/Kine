import React, { useState, lazy, Suspense } from 'react';
import { Page } from '../types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { WeeklySummaryBar } from './components/WeeklySummaryBar';
import SplashScreen from './components/SplashScreen';
import { QuickLogVoice } from './components/QuickLogVoice';
import StravaSyncToast from './components/StravaSyncToast';
import { supabase } from '../lib/supabase';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const LogWeights = lazy(() => import('./pages/LogWeights').then(m => ({ default: m.LogWeights })));
const LogCardio = lazy(() => import('./pages/LogCardio').then(m => ({ default: m.LogCardio })));
const LogCalories = lazy(() => import('./pages/LogCalories').then(m => ({ default: m.LogCalories })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const WeightsPlus = lazy(() => import('./pages/WeightsPlus').then(m => ({ default: m.WeightsPlus })));
const RunningPlus = lazy(() => import('./pages/RunningPlus').then(m => ({ default: m.RunningPlus })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const SummaryWeights = lazy(() => import('./pages/SummaryWeights').then(m => ({ default: m.default })));

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<{page: Page, data?: any}>({page: 'dashboard'});
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showQuickLogVoice, setShowQuickLogVoice] = useState(false);
  const [trackerMultiplier, setTrackerMultiplier] = useState<number>(1);
  const [showSplash, setShowSplash] = useState(true);

  const onNavigate = (page: Page, data?: any) => setCurrentPage({page, data});

  // Fetch tracker multiplier for QuickLogVoice
  React.useEffect(() => {
    const fetchMultiplier = async () => {
      const TRACKER_EXERCISE_ID = 82;
      const { data } = await supabase
        .from('exercises')
        .select('multiplier')
        .eq('exercise_id', TRACKER_EXERCISE_ID)
        .maybeSingle();
      if (data) setTrackerMultiplier(Number(data.multiplier || 1));
    };
    fetchMultiplier();
  }, []);

  // Reset summary whenever user navigates to a different page
  React.useEffect(() => {
    setShowWeeklySummary(false);
    setShowQuickLog(false);
  }, [currentPage.page]);

  // Scroll to top when navigating to dashboard
  React.useEffect(() => {
    if (currentPage.page === 'dashboard') {
      window.scrollTo(0, 0);
    }
  }, [currentPage.page]);

  // Handle Strava OAuth callback
React.useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('strava_token');
  const refresh = params.get('strava_refresh');
  const expires = params.get('strava_expires');
  const error = params.get('strava_error');

  if (token && refresh && expires) {
    localStorage.setItem('strava_access_token', token);
    localStorage.setItem('strava_refresh_token', refresh);
    localStorage.setItem('strava_expires_at', expires);
    window.history.replaceState({}, '', '/');
    setCurrentPage({ page: 'profile' });
  }
  if (error) {
    window.history.replaceState({}, '', '/');
    console.error('Strava auth error:', error);
  }
}, []);

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
      case 'summary-weights': return 'Summary';
    }
  };

  const onToggleQuickLogVoice = () => {
    setShowQuickLogVoice(v => !v);
  };

  const renderPage = () => {
    switch (currentPage.page) {
      case 'dashboard':
        return <Dashboard showWeeklySummary={showWeeklySummary} showQuickLog={showQuickLog} onCloseQuickLog={() => setShowQuickLog(false)} onNavigate={onNavigate} />;
       case 'weights':
         return <LogWeights onNavigate={onNavigate} showWeeklySummary={showWeeklySummary} data={currentPage.data} />;
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
      case 'summary-weights':
        return <SummaryWeights onNavigate={onNavigate} addedExercises={currentPage.data?.addedExercises || []} todayLoggedTotal={currentPage.data?.todayLoggedTotal || 0} exercisesByGroup={currentPage.data?.exercisesByGroup || {}} />;
    }
  };

  const showBackButton = false;
  const hideChrome = currentPage.page === 'analytics' || currentPage.page === 'profile' || currentPage.page === 'weights-plus' || currentPage.page === 'running-plus' || currentPage.page === 'summary-weights';

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <div className="min-h-screen" style={{ backgroundColor: '#f2f2f2', color: '#1a1a1a', fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif" }}>
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
        onToggleQuickLog={() => {
          setShowQuickLog(v => {
            if (!v) setShowWeeklySummary(false);
            return !v;
          });
        }}
        showQuickLog={showQuickLog}
        showWeeklySummary={showWeeklySummary}
        showQuickLogVoice={showQuickLogVoice}
        trackerMultiplier={trackerMultiplier}
        onToggleQuickLogVoice={onToggleQuickLogVoice}
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
      {showQuickLogVoice && (
        <QuickLogVoice
          multiplier={trackerMultiplier}
          onClose={() => setShowQuickLogVoice(false)}
          onSuccess={() => {
            setShowQuickLogVoice(false);
            onToggleQuickLogVoice(); // Ensure Dashboard re-renders and refetches
          }}
        />
      )}
      <StravaSyncToast />
    </div>
    </>
  );
};

export default App;
