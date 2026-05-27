import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import StravaViewer from './StravaViewer';

const Strava: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [justConnected, setJustConnected] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('strava_access_token')) {
      setJustConnected(true);
      const timer = setTimeout(() => setJustConnected(false), 9000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleStravaConnect = () => {
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
      const response = await fetch(
        'https://www.strava.com/api/v3/athlete/activities?per_page=90',
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
          const { error } = await supabase.from('strava').insert({
            activity_id: a.id,
            date: a.start_date.split('T')[0],
            type: a.type,
            distance_km: +(a.distance / 1000).toFixed(2),
            name: a.name,
            duration_seconds: a.moving_time,
            time_formatted: new Date(a.moving_time * 1000).toISOString().substr(11, 8),
            workout_calories: detail.calories || null,
          });
          if (error) console.error('Insert error:', error);
          else inserted++;
        }
      }
      setSyncMessage(`✓ ${inserted} new activities synced`);
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
    </>
  );
};

export default Strava;