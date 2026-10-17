import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

// Conversion ratio: 1 KM = 12 minutes
const MINUTES_PER_KM = 12;
// Warm-up duration that doesn't register any distance
const WARM_UP_MS = 30000;

// Fixed-distance presets: tapping one starts a countdown from km × 12 min.
const PRESETS = [2, 3];

interface Props {
  onClose: () => void;
  onLog: (km: number) => Promise<void>;
}

type Phase = 'idle' | 'warmingUp' | 'running' | 'paused' | 'logging' | 'done' | 'error';

const pad = (n: number) => String(n).padStart(2, '0');

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

// Compact black pill used for the three equal idle buttons (2 KM / 3 KM / Start).
const presetBtn: React.CSSProperties = {
  ...primaryBtn,
  flex: 1,
  width: '100%',
  minWidth: 0,
  padding: '15px 6px',
  fontSize: '11px',
  letterSpacing: '0.12em',
  whiteSpace: 'nowrap',
};

const CrossTrainerTimer: React.FC<Props> = ({ onClose, onLog }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  // Chosen fixed distance (km) once a preset is tapped; null while idle
  const [targetKm, setTargetKm] = useState<number | null>(null);
  // The distance actually logged (full preset on completion, partial on early stop)
  const [resultKm, setResultKm] = useState(0);
  // Elapsed time already banked from previously finished run segments
  const baseRef = useRef(0);
  // Timestamp when the currently running segment began
  const segStartRef = useRef(0);
  // Guards against firing the auto-finish twice
  const finishedRef = useRef(false);

  // Preset mode (2/3 KM) counts DOWN to a target; open-ended Start counts UP.
  const isPreset = targetKm != null;
  // Total countdown duration for the chosen preset (ms); 0 in open-ended mode
  const targetMs = targetKm != null ? targetKm * MINUTES_PER_KM * 60 * 1000 : 0;

  const liveMs = () =>
    baseRef.current + (phase === 'running' || phase === 'warmingUp' ? Date.now() - segStartRef.current : 0);

  // Tick while running or warming up
  useEffect(() => {
    if (phase !== 'running' && phase !== 'warmingUp') return;
    const id = setInterval(() => {
      const ms = liveMs();
      setElapsedMs(ms);
      // Auto-finish warm-up and hand over to the proper timer
      if (phase === 'warmingUp' && ms >= WARM_UP_MS) {
        finishedRef.current = false;
        segStartRef.current = Date.now();
        baseRef.current = 0;
        setElapsedMs(0);
        setPhase('running');
        return;
      }
      // Auto-finish the moment the countdown hits zero (preset mode only)
      if (isPreset && phase === 'running' && ms >= targetMs && !finishedRef.current) {
        finishedRef.current = true;
        handleComplete();
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, targetMs, isPreset]);

  // Display time: remaining for presets, elapsed for open-ended, countdown during warm-up
  const displayMs = phase === 'warmingUp'
    ? Math.max(0, WARM_UP_MS - liveMs())
    : isPreset ? Math.max(0, targetMs - liveMs()) : liveMs();
  const displayTotalSeconds = Math.floor(displayMs / 1000);
  const hours = Math.floor(displayTotalSeconds / 3600);
  const mins = Math.floor((displayTotalSeconds % 3600) / 60);
  const secs = displayTotalSeconds % 60;
  const timeStr =
    hours > 0 ? `${hours}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;

  // Distance shown: 0 during warm-up, remaining for presets, accumulated for open-ended (1 KM = 12 MIN)
  const km = phase === 'warmingUp' ? 0 : displayTotalSeconds / 60 / MINUTES_PER_KM;
  // Elapsed seconds — used to gate the Log Complete button until the run has actually started
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  const handleStartWith = (presetKm: number) => {
    setTargetKm(presetKm);
    baseRef.current = 0;
    segStartRef.current = Date.now();
    finishedRef.current = false;
    setElapsedMs(0);
    setPhase('warmingUp');
  };

  // Open-ended start — no target, elapsed time dictates the distance
  const handleStart = () => {
    setTargetKm(null);
    baseRef.current = 0;
    segStartRef.current = Date.now();
    finishedRef.current = false;
    setElapsedMs(0);
    setPhase('warmingUp');
  };

  // Pause — bank the current segment, keep the timer open
  const handlePause = () => {
    baseRef.current = baseRef.current + (Date.now() - segStartRef.current);
    setElapsedMs(baseRef.current);
    setPhase('paused');
  };

  // Resume — start a new segment from the banked time
  const handleResume = () => {
    segStartRef.current = Date.now();
    setPhase('running');
  };

  // Log complete — freeze, write the distance to Supabase, then confirm.
  // Full preset if the countdown ran to zero; partial distance if stopped early.
  const handleComplete = async () => {
    const ms = liveMs();
    // Bank the elapsed time so a retry (or the readout) stays stable
    baseRef.current = ms;
    setElapsedMs(ms);

    // Preset that ran to zero → log the full distance.
    // Preset stopped early, or any open-ended run → log the distance covered (1 km = 12 min).
    const reachedTarget = isPreset && ms >= targetMs;
    const kmToLog = reachedTarget
      ? (targetKm ?? 0)
      : (ms / 1000) / 60 / MINUTES_PER_KM;
    setResultKm(kmToLog);

    setPhase('logging');
    try {
      await onLog(kmToLog);
      setPhase('done');
    } catch (e) {
      console.error('Cross trainer timer log failed:', e);
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
          <p style={{
            fontSize: '14px', fontWeight: 900,
            color: '#000000',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            margin: 0,
          }}>
            Cross Trainer Timer
          </p>
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
                  {resultKm.toFixed(2)} KM
                </div>
                <div style={{
                  marginTop: 10,
                  fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em',
                  color: '#000000', textTransform: 'uppercase',
                }}>
                  {phase === 'logging' ? 'Logging…' : 'Cross Trainer logged'}
                </div>
                {phase === 'done' && (
                  <div style={{
                    marginTop: 6,
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em',
                    color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', textAlign: 'center',
                  }}>
                    Saved to Supabase
                    <br />
                    {isPreset ? `${timeStr} left` : `${timeStr} elapsed`} · 1 km = {MINUTES_PER_KM} min
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
              {km.toFixed(2)} KM
            </div>
            <div style={{
              marginTop: 6,
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em',
              color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase',
            }}>
              {phase === 'paused' ? 'Paused · ' : ''}{phase === 'warmingUp' ? 'WARM UP' : isPreset ? 'remaining' : 'elapsed'} · 1 km = {MINUTES_PER_KM} min
            </div>
          </div>
        )}
{/* ---------- Controls ---------- */}
        {phase === 'idle' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleStart} style={presetBtn}>
              Start
            </button>
            {PRESETS.map(presetKm => (
              <button
                key={presetKm}
                onClick={() => handleStartWith(presetKm)}
                style={presetBtn}
              >
                {presetKm} KM
              </button>
            ))}
          </div>
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
              disabled={elapsedSeconds < 1}
              style={{
                ...primaryBtn,
                opacity: elapsedSeconds < 1 ? 0.35 : 1,
                cursor: elapsedSeconds < 1 ? 'default' : 'pointer',
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

export default CrossTrainerTimer;