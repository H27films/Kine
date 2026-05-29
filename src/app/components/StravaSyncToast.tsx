import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface StravaSyncToastProps {}

const StravaSyncToast: React.FC<StravaSyncToastProps> = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('strava_access_token');
    if (!token) return;

    let cancelled = false;

    const runAutoSync = async () => {
      if (cancelled) return;
      try {
        // Use local date (the user is in UTC+8 Malaysia).
        // .getTime() returns UTC epoch ms regardless of timezone, so local midnight
        // boundaries convert to the correct UTC epoch seconds for the Strava API.
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
          setMessage('Strava token expired — reconnect');
          setVisible(true);
          setTimeout(() => {
            setVisible(false);
            setTimeout(() => setMessage(null), 300);
          }, 4000);
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
            if (!error) inserted++;
          }
        }

        // Store auto-sync result so manual Sync button can show matching count
        localStorage.setItem('strava_auto_sync_result', JSON.stringify({
          count: inserted,
          timestamp: Date.now(),
        }));

        if (inserted > 0) {
          setMessage(`Sync — ${inserted} new entr${inserted === 1 ? 'y' : 'ies'}`);
        } else {
          setMessage('Sync — ✓ up to date');
        }
        setVisible(true);
        setTimeout(() => {
          setVisible(false);
          setTimeout(() => setMessage(null), 300);
        }, 4000);
      } catch {
        // Silent fail for background sync
      }
    };

    // Delay slightly so the app renders first
    const timer = setTimeout(() => runAutoSync(), 800);

    // Also listen for connect-triggered sync (e.g. after Strava OAuth callback)
    const handleJustConnected = () => {
      clearTimeout(timer);
      setTimeout(() => runAutoSync(), 1500);
    };
    window.addEventListener('strava:just-connected', handleJustConnected);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('strava:just-connected', handleJustConnected);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
        zIndex: 9999,
        padding: '12px 24px',
        borderRadius: '999px',
        backgroundColor: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        border: '1px solid rgba(255,255,255,0.4)',
        transition: 'transform 0.35s ease, opacity 0.35s ease',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
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
        {message}
      </span>
    </div>
  );
};

export default StravaSyncToast;