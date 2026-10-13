import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Footprints } from 'lucide-react';

interface Props {
  onClose: () => void;
  onLog: (km: number, elapsedSeconds: number) => Promise<void>;
}

type Phase = 'idle' | 'running' | 'paused' | 'logging' | 'done' | 'error';

// --- GPS tuning ---
// Ignore any fix less accurate than this (metres). Poor fixes corrupt the total.
const MAX_ACCURACY_M = 30;
// Ignore movements smaller than this (metres) to filter GPS jitter while standing still.
const MIN_MOVE_M = 3;
// Don't allow logging a walk shorter than this (metres) — protects against a 0.00 km entry.
const MIN_LOG_M = 5;

const pad = (n: number) => String(n).padStart(2, '0');

// Great-circle distance between two coordinates, in metres (Haversine formula).
function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const primaryBtn: React.CSSProperties = {
  flex: 1,
  width: '100%',
  padding: '15px',
  backgroundColor: '#000000',
  color: '#ffffff',
  borderRadius: 999,
  border: 'none',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  textAlign: 'center',
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  width: '100%',
  padding: '15px',
  backgroundColor: 'transparent',
  color: '#000000',
  borderRadius: 999,
  border: '1.5px solid rgba(0,0,0,0.2)',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  textAlign: 'center',
  cursor: 'pointer',
};

const WalkGpsTimer: React.FC<Props> = ({ onClose, onLog }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [meters, setMeters] = useState(0); // live distance, mirrored from distRef
  const [hasFix, setHasFix] = useState(false); // first accepted GPS fix received
  const [gpsError, setGpsError] = useState('');

  // Elapsed time already banked from previously finished run segments
  const baseRef = useRef(0);
  // Timestamp when the currently running segment began
  const segStartRef = useRef(0);
  // Accumulated distance in metres
  const distRef = useRef(0);
  // Last accepted coordinate
  const lastRef = useRef<{ lat: number; lon: number } | null>(null);
  // Active geolocation watch handle
  const watchIdRef = useRef<number | null>(null);

  const liveMs = () =>
    baseRef.current + (phase === 'running' ? Date.now() - segStartRef.current : 0);

  const stopWatch = () => {
    if (watchIdRef.current != null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
  };

  const handlePos = (pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = pos.coords;
    // Ignore poor fixes — they corrupt the running total.
    if (accuracy > MAX_ACCURACY_M) return;

    // First good fix establishes the baseline; don't count it as movement.
    if (!lastRef.current) {
      lastRef.current = { lat: latitude, lon: longitude };
      setHasFix(true);
      return;
    }

    const d = haversineMeters(lastRef.current.lat, lastRef.current.lon, latitude, longitude);
    // Ignore GPS jitter while standing still.
    if (d < MIN_MOVE_M) return;

    lastRef.current = { lat: latitude, lon: longitude };
    distRef.current += d;
    setMeters(distRef.current);
  };

  const handleErr = (err: GeolocationPositionError) => {
    // Timeouts are normal at start-up — keep waiting for a fix.
    if (err.code === err.TIMEOUT) return;
    if (err.code === err.PERMISSION_DENIED) {
      setGpsError('Location permission denied. Enable it in your browser settings to track a walk.');
    } else {
      setGpsError('Could not get your location. Make sure location services are turned on.');
    }
  };

  const startWatch = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Your browser does not support location tracking.');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePos,
      handleErr,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  };

  // Tick the clock while running
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setElapsedMs(liveMs()), 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Always clean up the GPS watch if the overlay unmounts
  useEffect(() => stopWatch, []);

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const timeStr =
    hours > 0 ? `${hours}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;

  const km = meters / 1000;
  const kmStr = km.toFixed(2);

  // Pace in min/km
  const paceStr =
    km > 0
      ? `${Math.floor((totalSeconds / 60) / km)}:${pad(Math.round((((totalSeconds / 60) / km) % 1) * 60))}`
      : '--:--';

  const canLog = meters >= MIN_LOG_M;

  const handleStart = () => {
    distRef.current = 0;
    lastRef.current = null;
    setMeters(0);
    setHasFix(false);
    setGpsError('');
    baseRef.current = 0;
    segStartRef.current = Date.now();
    setElapsedMs(0);
    setPhase('running');
    startWatch();
  };

  // Pause — bank the segment and stop watching GPS, keep the overlay open
  const handlePause = () => {
    stopWatch();
    baseRef.current = baseRef.current + (Date.now() - segStartRef.current);
    setElapsedMs(baseRef.current);
    setPhase('paused');
  };

  // Resume — start a new timing segment and restart the GPS watch
  const handleResume = () => {
    segStartRef.current = Date.now();
    setPhase('running');
    startWatch();
  };

  // Log complete — freeze, stop GPS, write to Supabase, then confirm
  const handleComplete = async () => {
    stopWatch();
    const ms = liveMs();
    baseRef.current = ms;
    setElapsedMs(ms);
    setPhase('logging');
    try {
      await onLog(distRef.current / 1000, Math.floor(ms / 1000));
      setPhase('done');
    } catch (e) {
      console.error('Walk GPS log failed:', e);
      setPhase('error');
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute', bottom: '0px', left: '10px', right: '10px',
          backgroundColor: '#F2F2ED',
          borderRadius: '20px 20px 0 0',
          padding: '24px 24px 32px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Footprints size={16} strokeWidth={2} color="#000000" />
            <p style={{
              fontSize: '14px', fontWeight: 900,
              color: '#000000',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              margin: 0,
            }}>
              Walk Tracker
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#000000', lineHeight: 0 }}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {(phase === 'logging' || phase === 'done' || phase === 'error') ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            {phase === 'error' ? (
              <>
                <X size={44} strokeWidth={2.5} color="#b02828" />
                <div style={{
                  marginTop: 12,
                  fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.08em',
                  color: '#b02828', textTransform: 'uppercase',
                }}>
                  Log failed
                </div>
                <div style={{
                  marginTop: 6,
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em',
                  color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', textAlign: 'center',
                }}>
                  Nothing was saved to Supabase
                  <br />
                  Check your connection and retry
                </div>
              </>
            ) : (
              <>
                <Check size={44} strokeWidth={2.5} color={phase === 'logging' ? 'rgba(0,0,0,0.25)' : '#000000'} />
                <div style={{
                  marginTop: 12,
                  fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em',
                  color: '#000000', lineHeight: 1,
                }}>
                  {kmStr} KM
                </div>
                <div style={{
                  marginTop: 10,
                  fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em',
                  color: '#000000', textTransform: 'uppercase',
                }}>
                  {phase === 'logging' ? 'Logging…' : 'Walk logged'}
                </div>
                {phase === 'done' && (
                  <div style={{
                    marginTop: 6,
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em',
                    color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', textAlign: 'center',
                  }}>
                    Saved to Supabase
                    <br />
                    {timeStr} elapsed · tracked by GPS
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* ---------- Live readout ---------- */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            <div style={{
              fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.02em',
              color: '#000000', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {timeStr}
            </div>
            <div style={{
              marginTop: 14,
              fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.08em',
              color: '#000000', textTransform: 'uppercase',
            }}>
              {kmStr} KM
            </div>
            <div style={{
              marginTop: 6,
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em',
              color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase',
            }}>
              {phase === 'idle'
                ? 'GPS distance'
                : phase === 'paused'
                  ? 'Paused'
                  : hasFix
                    ? `${paceStr} /km`
                    : 'Acquiring GPS…'}
            </div>
            {phase === 'idle' && (
              <div style={{
                marginTop: 10,
                fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em',
                color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.6,
              }}>
                Keep this screen open while walking.
                <br />
                Location permission will be requested.
              </div>
            )}
          </div>
        )}

        {gpsError && phase !== 'error' && (
          <div style={{
            marginBottom: 14,
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
            color: '#b02828', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.6,
          }}>
            {gpsError}
          </div>
        )}

        {/* ---------- Controls ---------- */}
        {phase === 'idle' && (
          <button onClick={handleStart} style={primaryBtn}>
            Start
          </button>
        )}

        {(phase === 'running' || phase === 'paused') && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={phase === 'running' ? handlePause : handleResume}
              style={secondaryBtn}
            >
              {phase === 'running' ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={handleComplete}
              disabled={!canLog}
              style={{
                ...primaryBtn,
                opacity: canLog ? 1 : 0.35,
                cursor: canLog ? 'pointer' : 'default',
              }}
            >
              Log Complete
            </button>
          </div>
        )}

        {phase === 'logging' && (
          <button disabled style={{ ...primaryBtn, opacity: 0.5, cursor: 'default' }}>
            Logging…
          </button>
        )}

        {phase === 'done' && (
          <button onClick={onClose} style={primaryBtn}>
            Done
          </button>
        )}

        {phase === 'error' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={secondaryBtn}>
              Close
            </button>
            <button onClick={handleComplete} style={primaryBtn}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalkGpsTimer;

