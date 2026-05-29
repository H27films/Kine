import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import StravaViewer from './StravaViewer';

const Strava: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('strava_access_token')) {
      setJustConnected(true);
      const timer = setTimeout(() => setJustConnected(false), 9000);
      return () => clearTimeout(timer);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setToastMsg(null), 300);
    }, 4000);
  };

  const handleStravaConnect = () => {
    if (localStorage.getItem('strava_access_token')) {
      showToast('Already connected');
      return;
    }
    const clientId = '250203';
    const redirectUri = 'https://kine-v2.vercel.app/api/strava-callback';
    const scope = 'read,activity:read_all';
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  };

  const handleStravaSync = async () => {
    const token = localStorage.getItem('strava_access_token');
    if (!token) {
      setSyncMessage('Not connected');
      return;
    }
    setSyncing(true);
    setSyncMessage('');
    try {
      // Use local date (the user is in UTC+8 Malaysia).
      // Strava API expects Unix epoch seconds (UTC).
      // new Date().getTime() always returns UTC epoch ms regardless of timezone,
      // so we can use local midnight boundaries directly.
      const now = new Date();

      // Yesterday 00:00:00 local time
      const yesterdayStart = new Date(now);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setHours(0, 0, 0, 0);
      const after = Math.floor(yesterdayStart.getTime() / 1000);

      // Today 23:59:59 local time
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      const before = Math.floor(todayEnd.getTime() / 1000);

      const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=90`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const activities = await response.json();
      if (!Array.isArray(activities)) {
        setSyncMessage('Token Expired');
        setSyncing(false);
        return;
      }
      const allowed = ['Run', 'Walk', 'Ride', 'VirtualRide', 'Hike', 'Rowing', 'Elliptical', 'WeightTraining'];
      const filtered = activities.filter((a: any) => allowed.includes(a.type));
      let inserted = 0;
      for (const a of filtered) {
        const { data: existing } = await supabase
          .from('strava')
          .select('id')
          .eq('activity_id', a.id)
          .maybeSingle();
        if (!existing) {
          const detailRes = await fetch(
            `https://www.strava.com/api/v3/activities/${a.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const detail = await detailRes.json();
          const rawDistance = +(a.distance / 1000).toFixed(2);
          const rawCalories = detail.calories || null;
          // For Rowing, Strava doesn't return distance — derive it from calories (50 kcal = 1 km)
          const distanceKm = a.type === 'Rowing' && rawDistance === 0 && rawCalories
            ? +(rawCalories / 50).toFixed(2)
            : rawDistance;

          const { error } = await supabase.from('strava').insert({
            activity_id: a.id,
            date: a.start_date.split('T')[0],
            type: a.type,
            distance_km: distanceKm,
            name: a.name,
            duration_seconds: a.moving_time,
            time_formatted: new Date(a.moving_time * 1000).toISOString().substr(11, 8),
            workout_calories: rawCalories,
          });
          if (error) console.error('Insert error:', error);
          else inserted++;
        }
      }
      if (inserted === 0) {
        // Check if auto-sync already ran recently
        const autoResult = localStorage.getItem('strava_auto_sync_result');
        if (autoResult) {
          try {
            const { count, timestamp } = JSON.parse(autoResult);
            const fiveMinutes = 5 * 60 * 1000;
            if (count > 0 && Date.now() - timestamp < fiveMinutes) {
              setSyncMessage(`✓ ${count} new activities synced`);
            } else {
              setSyncMessage('✓ Up to date');
            }
          } catch {
            setSyncMessage('✓ Up to date');
          }
        } else {
          setSyncMessage('✓ Up to date');
        }
      } else {
        setSyncMessage(`✓ ${inserted} new activities synced`);
      }
    } catch (e: any) {
      setSyncMessage('Sync failed: ' + e.message);
      console.error('Sync error:', e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      {/* View Data */}
      <button
        onClick={() => setViewerOpen(true)}
        className="w-full rounded-xl p-4 mb-3 flex items-center justify-between active:scale-[0.98] transition-all"
        style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
      >
        <div className="flex items-center gap-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span style={{ fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.1em', color: '#FC4C02', textTransform: 'uppercase' }}>
            Strava Data
          </span>
        </div>
        <div style={{ color: '#999' }}>›</div>
      </button>

      {/* Connect + Sync on same row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          onClick={handleStravaConnect}
          className="rounded-xl p-4 flex items-center justify-start gap-3 active:scale-[0.98] transition-all"
          style={{ backgroundColor: 'rgba(0,0,0,0.05)', flex: 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', color: '#FC4C02', textTransform: 'uppercase' }}>
            {justConnected ? 'Connected ✓' : 'Connect'}
          </span>
        </button>

        <button
          onClick={handleStravaSync}
          disabled={syncing}
          className="rounded-xl p-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          style={{ backgroundColor: 'rgba(0,0,0,0.05)', flex: 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', color: '#FC4C02', textTransform: 'uppercase' }}>
            {syncing ? 'Syncing...' : syncMessage || 'Sync'}
          </span>
        </button>
      </div>


      {viewerOpen && <StravaViewer onClose={() => setViewerOpen(false)} />}

      {/* Toast notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: toastVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
            zIndex: 9999,
            padding: '12px 24px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
            border: '1px solid rgba(255,255,255,0.4)',
            transition: 'transform 0.35s ease, opacity 0.35s ease',
            opacity: toastVisible ? 1 : 0,
            pointerEvents: toastVisible ? 'auto' : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#1a1a1a',
            letterSpacing: '0.04em',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            {toastMsg}
          </span>
        </div>
      )}
    </>
  );
};

export default Strava;